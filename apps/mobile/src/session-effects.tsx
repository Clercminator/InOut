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
  const { audio, haptics, hapticMode = "transitions", keepAwake, language = "en" } = controller.preferences;
  const { breathSound, guidanceVolume, chime, celebration, celebrationVolume } = experienceFor(controller.preferences);
  const players = useRef<Array<AudioPlayer | undefined>>([]);
  const focus = useRef<AudioPlayer | null>(null);
  const generation = useRef(0);
  const cue = useRef("");
  const announced = useRef("");
  const deliveredHaptic = useRef({ lastKey: "" });
  const breath = useRef<AudioPlayer | null>(null);
  const texturePlayers = useRef<Partial<Record<"in" | "out" | "hum", AudioPlayer>>>({});
  const completedId = useRef("");
  const audioKey = `${audio}:${language}:${running}:${session?.stage}`;
  const [readyAudioKey, setReadyAudioKey] = useState<string | null>(null);
  const audioReady = audio === "silent" || readyAudioKey === audioKey;
  const view = controller.view();
  const phases = session && view ? session.engine.plan.blocks[view.blockIndex].phases : [];
  const guidance = view ? breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs) : null;

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
        : audio === "voice" ? voices[language][index] : undefined;
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
  }, [audio, chime, language]);

  useEffect(() => {
    players.current.forEach((player, index) => { if (player) player.volume = index === 3 ? celebrationVolume : guidanceVolume; });
  }, [audio, chime, guidanceVolume, celebrationVolume, language]);

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
    if (audio === "voice" && audioReady && view.phaseElapsedMs < 300) {
      const indexes = { inhale: 0, inhaleTopUp: 1, exhale: 2, hold: 4, hum: 5, retention: 6, recovery: 7, freeBreathing: 8 };
      let index = indexes[view.phase.type];
      if (guidance?.holding && !guidance.full) index = 6;
      if (session?.protocol && isCyclic(session.protocol) && view.phase.type === "retention") index = 4;
      if (audio === "voice" && (view.phase.nostril === "left" || view.phase.nostril === "right")) {
        if (view.phase.type === "inhale") index = view.phase.nostril === "left" ? 9 : 10;
        if (view.phase.type === "exhale") index = view.phase.nostril === "left" ? 11 : 12;
      }
      const player = players.current[index];
      const requiredMs = voiceDurations[language][index] + 100;
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
            if (generation.current === gen) controller.pause("interruption");
          });
    }
  }, [
    running,
    view?.cueKey,
    session?.id,
    audio,
    audioReady,
    haptics,
    controller,
  ]);

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
    }, emitBreathHaptic, deliveredHaptic.current);
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

  // Keep decoded textures ready across phases instead of constructing a player per breath.
  useEffect(() => {
    if (audio === "silent") return;
    const sources = { ...breathTextures[breathSound], hum: humTexture };
    const pool = Object.fromEntries(Object.entries(sources).map(([key, source]) => {
      const player = createAudioPlayer(source, { updateInterval: 100, keepAudioSessionActive: false });
      player.loop = true;
      player.volume = 0;
      return [key, player];
    })) as Record<"in" | "out" | "hum", AudioPlayer>;
    texturePlayers.current = pool;
    return () => {
      Object.values(pool).forEach(player => { player.volume = 0; player.pause(); player.remove(); });
      texturePlayers.current = {};
      breath.current = null;
    };
  }, [audio, breathSound]);

  useEffect(() => {
    if (!running || audio === "silent" || !audioReady || !view || !guidance?.texture || AppState.currentState !== "active") return;
    const player = texturePlayers.current[guidance.texture];
    if (!player) return;
    breath.current = player;
    let disposed = false;
    const update = () => {
      if (disposed) return false;
      const current = controller.view();
      if (!current || controller.current?.id !== session?.id ||
        controller.current?.engine.status !== "running" || current.cueKey !== view.cueKey || AppState.currentState !== "active") {
        player.volume = 0;
        player.pause();
        return false;
      }
      const gain = breathingGuidance(phases, current.phaseIndex, current.phaseElapsedMs).envelope
        * (audio === "voice" ? 0.25 : 1) * experienceFor(controller.preferences).guidanceVolume;
      if (Math.abs(player.volume - gain) > 0.002 || gain === 0) player.volume = gain;
      return true;
    };
    void player.seekTo((view.phaseElapsedMs % 4000) / 1000).then(() => {
      if (update()) player.play();
    }).catch(() => { if (!disposed) controller.pause("interruption"); });
    // Volume follows the engine clock even between React renders.
    const fade = setInterval(update, 32);
    return () => {
      disposed = true;
      clearInterval(fade);
      player.volume = 0;
      player.pause();
      if (breath.current === player) breath.current = null;
    };
  }, [running, session?.id, view?.cueKey, audio, audioReady, controller, breathSound]);

  useEffect(() => {
    if (breath.current) breath.current.volume = running && AppState.currentState === "active"
      ? (guidance?.envelope ?? 0) * (audio === "voice" ? 0.25 : 1) * guidanceVolume : 0;
  }, [running, view?.phaseElapsedMs, audio, guidanceVolume]);

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
