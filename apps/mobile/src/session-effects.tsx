import { audioSettings, voiceCueIndex } from "./audio-preferences";
import { loopedAudio, type AudioLoop } from "./looped-audio";
import { selectedMusicTrack, selectedVoice } from "./approved-audio";
import { t } from "./i18n";
import { isCyclic } from "@inout/protocols";
import { voices } from "./voice-library";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useSession } from "./session-context";
import { breathingGuidance } from "./breathing-guidance";
import { experienceFor } from "./experience";
import { breathTextures, humTexture, chimes } from "./audio-library";
import { startHapticPacer } from "./haptic-pacer";
import { emitBreathHaptic, hapticOffsets } from "./breath-haptics";
import voiceDurations from "./voice-durations.json";

export function NativeSessionEffects() {
  const controller = useSession();
  const session = controller.current;
  const running =
    session?.stage === "active" && session.engine.status === "running";
  const { audio: preferredAudio, haptics, hapticMode = "transitions", keepAwake, language = "en" } = controller.preferences;
  const settings = audioSettings(controller.preferences);
  const voiceBank = selectedVoice(controller.preferences);
  const voiceEnabled = settings.voice && session?.voiceAllowed !== false && !!voiceBank;
  const natureEnabled = settings.nature;
  const track = settings.music ? selectedMusicTrack(settings.musicId) : undefined;
  const audio = voiceEnabled ? "voice" : natureEnabled || track ? "tones" : "silent";
  const { breathSound, guidanceVolume, chime, celebration, celebrationVolume } = experienceFor(controller.preferences);
  const players = useRef<Array<AudioPlayer | undefined>>([]);
  const focus = useRef<AudioPlayer | null>(null);
  const generation = useRef(0);
  const cue = useRef("");
  const announced = useRef("");
  const deliveredHaptic = useRef({ lastKey: "" });
  const textureLoops = useRef<Partial<Record<"in" | "out" | "hum", AudioLoop>>>({});
  const activeTexture = useRef<"in" | "out" | "hum" | null>(null);
  const textureGain = useRef(0);
  const musicLoop = useRef<ReturnType<typeof loopedAudio> | null>(null);
  const completedId = useRef("");
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const audioKey = `${audio}:${voiceBank?.language}:${voiceBank?.id}:${running}:${session?.stage}`;
  const [readyAudioKey, setReadyAudioKey] = useState<string | null>(null);
  const audioReady = audio === "silent" || readyAudioKey === audioKey;
  const view = controller.view();
  const phases = session && view ? session.engine.plan.blocks[view.blockIndex].phases : [];
  const guidance = view ? breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs) : null;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setAppActive(state === "active"));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") controller.tick();
    }, 50);
    return () => clearInterval(timer);
  }, [running, controller]);

  useEffect(() => {
    // Respect the silent switch. Exclusive focus lets native interruptions pause playback.
    let mounted = true;
    setReadyAudioKey(null);
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
    })
      .then(() =>
        mounted
          ? setIsAudioActiveAsync(
              audio !== "silent" && (running || session?.stage === "post"),
            )
          : undefined,
      )
      .then(() => {
        if (mounted) setReadyAudioKey(audioKey);
      })
      .catch(() => {
        if (mounted && audio !== "silent") controller.pause("interruption");
      });
    return () => {
      mounted = false;
    };
  }, [controller, running, audio, session?.stage, audioKey]);

  useEffect(() => {
    const gen = ++generation.current;
    cue.current = "";

    if (audio === "silent") return;
    const bank = Array.from({ length: audio === "voice" ? 13 : 4 }, (_, index) => {
      const source = index === 3 ? chime === "off" ? undefined : chimes[chime]
        : audio === "voice" ? voiceBank?.cues[index] : undefined;
      return source === undefined ? undefined : createAudioPlayer(source, {
        updateInterval: 100, keepAudioSessionActive: false,
      });
    });
    players.current = bank;
    return () => {
      generation.current++;
      bank.forEach((p) => {
        p?.pause();
        p?.remove();
      });
      if (generation.current > gen) players.current = [];
    };
  }, [audio, chime, voiceBank]);

  useEffect(() => {
    players.current.forEach((player, index) => { if (player) player.volume = index === 3 ? celebrationVolume : settings.voiceVolume; });
  }, [audio, chime, settings.voiceVolume, celebrationVolume, voiceBank]);

  useEffect(() => {
    if (!running || audio === "silent" || !audioReady) return;
    // A local silent loop keeps native audio-focus observation alive BETWEEN short cues.
    // Losing focus/headphones or a media reset pauses the engine, never auto-resumes it.
    const guard = createAudioPlayer(require("../assets/audio/focus.wav"), {
      updateInterval: 100,
      keepAudioSessionActive: false,
    });
    focus.current = guard;
    guard.loop = true;
    let hasPlayed = false;
    const subscription = guard.addListener("playbackStatusUpdate", (status) => {
      if (status.playing) hasPlayed = true;
      if (
        status.error ||
        status.mediaServicesDidReset ||
        (hasPlayed && !status.playing && !status.isBuffering)
      ) {
        controller.pause("interruption");
        guard.pause();
      }
    });
    guard.play();
    return () => {
      subscription.remove();
      guard.pause();
      guard.remove();
      focus.current = null;
    };
  }, [running, audio, audioReady, controller]);

  useEffect(() => {
    let disposed = false;
    if (running && keepAwake) {
      void activateKeepAwakeAsync("inout-session")
        .then(() => {
          if (disposed)
            void deactivateKeepAwake("inout-session").catch(() => {});
        })
        .catch(() => {});
    } else void deactivateKeepAwake("inout-session").catch(() => {});
    return () => {
      disposed = true;
      void deactivateKeepAwake("inout-session").catch(() => {});
    };
  }, [running, keepAwake]);

  useEffect(() => {
    if (!running) {
      generation.current++;
      cue.current = "";
      players.current.forEach((p) => p?.pause());
      return;
    }
    if (
      !view ||
      AppState.currentState !== "active" ||
      (audio !== "silent" && !audioReady)
    )
      return;
    const key = `${session?.id}:${view.cueKey}`;
    if (cue.current === key) return;
    cue.current = key;
    const gen = ++generation.current;
    players.current.forEach((p) => p?.pause());
    // Skip expired cues after stalls. Only the current phase is announced, never a backlog.
    if (audio === "voice" && audioReady && (guidance?.holding || view.phase.type === "freeBreathing" ? settings.restingVoice : settings.breathingVoice) && view.phaseElapsedMs < 300) {
      const index = voiceCueIndex(
        view.phase,
        guidance?.holding ?? false,
        guidance?.full ?? false,
        !!session?.protocol && isCyclic(session.protocol),
      );
      if (index !== undefined) {
        const player = players.current[index];
        const requiredMs = (voiceBank?.durations[index] ?? Infinity) + 100;
        if (player && view.phaseRemainingMs >= requiredMs)
          void player
            .seekTo(0)
            .then(() => {
              const currentView = controller.view();
              if (
                generation.current === gen &&
                controller.current?.id === session?.id &&
                controller.current?.engine.status === "running" &&
                currentView?.cueKey === view.cueKey &&
                currentView.phaseRemainingMs >= requiredMs &&
                currentView.phaseElapsedMs < 300 &&
                AppState.currentState === "active"
              )
                player.play();
            })
            .catch(() => {
              if (generation.current === gen) {
                controller.analytics.track("audio_playback_failed", { outcome: "failed", errorCategory: "playback" });
                controller.pause("interruption");
              }
            });
      }
    }
  }, [
    running,
    view?.cueKey,
    session?.id,
    audio,
    audioReady,
    voiceBank, settings.breathingVoice, settings.restingVoice,
    haptics,
    controller,
  ]);

  useEffect(() => {
    if (session?.stage !== "active" || !track) return;
    const loop = loopedAudio(track.source, () => audioSettings(controller.preferences).musicVolume, () => {
      controller.analytics.track("audio_playback_failed", { outcome: "failed", errorCategory: "playback" });
      controller.pause("interruption");
    }, track.crossfadeMs, false);
    musicLoop.current = loop;
    return () => {
      loop();
      if (musicLoop.current === loop) musicLoop.current = null;
    };
  }, [session?.id, session?.stage, track, controller]);

  useEffect(() => {
    if (running && audioReady && appActive) musicLoop.current?.resume();
    else musicLoop.current?.pause();
  }, [running, audioReady, appActive, session?.id, session?.stage, track]);

  // Haptics use engine deadlines independently of React's display refresh.
  useEffect(() => {
    if (!running || !haptics) return;
    return startHapticPacer(() => {
      const record = controller.current;
      const current = controller.view();
      if (AppState.currentState !== "active" || !controller.preferences.haptics || record?.stage !== "active" ||
        record.engine.status !== "running" || record.id !== session?.id || !current || current.completed) return null;
      const g = breathingGuidance(record.engine.plan.blocks[current.blockIndex].phases, current.phaseIndex, current.phaseElapsedMs);
      return { key: `${record.id}:${record.engine.startedAt}:${current.cueKey}`, elapsedMs: current.phaseElapsedMs,
        remainingMs: current.phaseRemainingMs, intervalMs: g.pulseEveryMs, style: g.pulseStyle, offsetsMs: hapticOffsets(current.phase, controller.preferences.hapticMode) };
    }, style => { void emitBreathHaptic(style).catch(() => {}); }, deliveredHaptic.current);
  }, [running, haptics, hapticMode, controller, session?.id, session?.engine.startedAt]);

  // Screen-reader guidance remains independent of audio activation.
  useEffect(() => {
    if (!running || !view || !guidance || AppState.currentState !== "active") {
      announced.current = "";
      return;
    }
    const phaseKey = `${session?.id}:${view.cueKey}`;
    if (announced.current !== phaseKey) {
      announced.current = phaseKey;
      AccessibilityInfo.announceForAccessibility(t(`${guidance.label}${view.phase.nostril ? `, ${view.phase.nostril} nostril` : ""}`));
    }
  }, [running, session?.id, view?.cueKey]);

  // Keep short nature recordings looping with a small overlap instead of restarting a decoder per breath.
  useEffect(() => {
    if (!natureEnabled || session?.stage !== "active") return;
    const sources = { ...breathTextures[breathSound], hum: humTexture };
    const loops = Object.fromEntries(Object.entries(sources).map(([key, source]) => [
      key,
      loopedAudio(source, () => activeTexture.current === key ? textureGain.current : 0, () => {
        controller.analytics.track("audio_playback_failed", { outcome: "failed", errorCategory: "playback" });
        controller.pause("interruption");
      }, 120, false),
    ])) as Record<"in" | "out" | "hum", AudioLoop>;
    textureLoops.current = loops;
    return () => {
      activeTexture.current = null;
      textureGain.current = 0;
      Object.values(loops).forEach(loop => loop());
      textureLoops.current = {};
    };
  }, [natureEnabled, breathSound, session?.id, session?.stage, controller]);

  useEffect(() => {
    if (!running || !natureEnabled || !audioReady || !view || !guidance?.texture || !appActive) return;
    const loop = textureLoops.current[guidance.texture];
    if (!loop) return;
    let disposed = false;
    const update = () => {
      if (disposed) return false;
      const current = controller.view();
      if (!current || controller.current?.id !== session?.id ||
        controller.current?.engine.status !== "running" || current.cueKey !== view.cueKey || AppState.currentState !== "active") {
        activeTexture.current = null;
        textureGain.current = 0;
        loop.pause();
        return false;
      }
      const currentGuidance = breathingGuidance(phases, current.phaseIndex, current.phaseElapsedMs);
      const currentTexture = currentGuidance.texture;
      const gain = currentGuidance.envelope * audioSettings(controller.preferences).natureVolume;
      if (currentTexture !== activeTexture.current) {
        Object.entries(textureLoops.current).forEach(([key, other]) => {
          if (key !== currentTexture) other?.pause();
        });
        activeTexture.current = currentTexture;
        textureGain.current = gain;
        if (currentTexture) textureLoops.current[currentTexture]?.resume();
      } else textureGain.current = gain;
      return true;
    };
    update();
    const fade = setInterval(update, 32);
    return () => {
      disposed = true;
      clearInterval(fade);
      if (activeTexture.current === guidance.texture) {
        activeTexture.current = null;
        textureGain.current = 0;
      }
      loop.pause();
    };
  }, [running, session?.id, view?.cueKey, natureEnabled, audioReady, appActive, controller, breathSound]);

  useEffect(() => {
    if (activeTexture.current && running && appActive) {
      textureGain.current = (guidance?.envelope ?? 0) * settings.natureVolume;
    }
  }, [running, appActive, view?.phaseElapsedMs, natureEnabled, settings.natureVolume]);

  useEffect(() => {
    if (
      !session ||
      session.stage !== "post" ||
      completedId.current === session.id ||
      !audioReady
    )
      return;
    completedId.current = session.id;
    if (haptics && celebration !== "quiet")
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    const player = players.current[3];
    if (audio !== "silent" && chime !== "off" && celebration !== "quiet" && player && AppState.currentState === "active") {
      const gen = ++generation.current;
      void player
        .seekTo(0)
        .then(() => {
          if (gen === generation.current && AppState.currentState === "active")
            player.play();
        })
        .catch(() => {});
    }
  }, [session?.id, session?.stage, haptics, audio, audioReady, chime, celebration]);
  return null;
}
