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

const sources = {
  voice: [
    require("../assets/audio/inhale.wav"),
    require("../assets/audio/top-up.wav"),
    require("../assets/audio/exhale.wav"),
    require("../assets/audio/complete.wav"),
    require("../assets/audio/hold.wav"),
    require("../assets/audio/hum.wav"),
    require("../assets/audio/rest.wav"),
    require("../assets/audio/recover.wav"),
    require("../assets/audio/natural.wav"),
    require("../assets/audio/inhale-left.wav"),
    require("../assets/audio/inhale-right.wav"),
    require("../assets/audio/exhale-left.wav"),
    require("../assets/audio/exhale-right.wav"),
  ],
  tones: [
    require("../assets/audio/tone-in.wav"),
    require("../assets/audio/tone-top.wav"),
    require("../assets/audio/tone-out.wav"),
    require("../assets/audio/tone-complete.wav"),
    require("../assets/audio/tone-top.wav"),
    require("../assets/audio/tone-out.wav"),
    require("../assets/audio/tone-out.wav"),
    require("../assets/audio/tone-in.wav"),
    require("../assets/audio/tone-out.wav"),
  ],
};
export function NativeSessionEffects() {
  const controller = useSession();
  const session = controller.current;
  const running =
    session?.stage === "active" && session.engine.status === "running";
  const { audio, haptics, keepAwake } = controller.preferences;
  const players = useRef<AudioPlayer[]>([]);
  const focus = useRef<AudioPlayer | null>(null);
  const generation = useRef(0);
  const cue = useRef("");
  const tactile = useRef("");
  const announced = useRef("");
  const breath = useRef<AudioPlayer | null>(null);
  const completedId = useRef("");
  const audioKey = `${audio}:${running}:${session?.stage}`;
  const [readyAudioKey, setReadyAudioKey] = useState<string | null>(null);
  const audioReady = audio === "silent" || readyAudioKey === audioKey;
  const view = controller.view();
  const phases = session && view ? session.engine.plan.blocks[view.blockIndex].phases : [];
  const guidance = view ? breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs) : null;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") controller.tick();
    }, 100);
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
    const bank = sources[audio].map((source) =>
      createAudioPlayer(source, {
        updateInterval: 100,
        keepAudioSessionActive: false,
      }),
    );
    players.current = bank;
    return () => {
      generation.current++;
      bank.forEach((p) => {
        p.pause();
        p.remove();
      });
      if (generation.current > gen) players.current = [];
    };
  }, [audio]);

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
      players.current.forEach((p) => p.pause());
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
    players.current.forEach((p) => p.pause());
    // Skip expired cues after stalls. Only the current phase is announced, never a backlog.
    if (view.phaseRemainingMs > 750 && audio !== "silent" && audioReady) {
      const indexes = { inhale: 0, inhaleTopUp: 1, exhale: 2, hold: 4, hum: 5, retention: 6, recovery: 7, freeBreathing: 8 };
      let index = indexes[view.phase.type];
      if (guidance?.holding && !guidance.full) index = 6;
      if (audio === "voice" && (view.phase.nostril === "left" || view.phase.nostril === "right")) {
        if (view.phase.type === "inhale") index = view.phase.nostril === "left" ? 9 : 10;
        if (view.phase.type === "exhale") index = view.phase.nostril === "left" ? 11 : 12;
      }
      const player = players.current[index];
      if (player)
        void player
          .seekTo(0)
          .then(() => {
            const currentView = controller.view();
            if (
              generation.current === gen &&
              controller.current?.id === session?.id &&
              controller.current?.engine.status === "running" &&
              currentView?.cueKey === view.cueKey &&
              currentView.phaseRemainingMs > 750 &&
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

  // Touch and screen-reader guidance work independently of audio activation.
  useEffect(() => {
    if (!running || !view || !guidance || AppState.currentState !== "active") {
      tactile.current = "";
      announced.current = "";
      return;
    }
    const phaseKey = `${session?.id}:${view.cueKey}`;
    if (announced.current !== phaseKey) {
      announced.current = phaseKey;
      AccessibilityInfo.announceForAccessibility(`${guidance.label}${view.phase.nostril ? `, ${view.phase.nostril} nostril` : ""}`);
    }
    const pulseKey = `${phaseKey}:${guidance.pulseKey}`;
    if (haptics && guidance.pulseKey !== null && tactile.current !== pulseKey) {
      tactile.current = pulseKey;
      void Haptics.impactAsync(guidance.holding ? Haptics.ImpactFeedbackStyle.Soft
        : guidance.volume > 0.5 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [running, session?.id, view?.cueKey, view?.phaseElapsedMs, haptics]);

  useEffect(() => {
    if (!running || audio === "silent" || !audioReady || !view || !guidance?.texture || AppState.currentState !== "active") return;
    const textures = {
      in: require("../assets/audio/breath-in.wav"),
      out: require("../assets/audio/breath-out.wav"),
      hum: require("../assets/audio/breath-hum.wav"),
    };
    const player = createAudioPlayer(textures[guidance.texture], { updateInterval: 100, keepAudioSessionActive: false });
    breath.current = player;
    player.loop = true;
    player.volume = 0;
    let disposed = false;
    void player.seekTo((view.phaseElapsedMs % 1000) / 1000).then(() => {
      const currentView = controller.view();
      if (disposed || controller.current?.id !== session?.id || controller.current?.engine.status !== "running"
        || currentView?.cueKey !== view.cueKey || AppState.currentState !== "active") return;
      const currentGuidance = breathingGuidance(phases, currentView.phaseIndex, currentView.phaseElapsedMs);
      player.volume = currentGuidance.envelope * (audio === "voice" ? 0.45 : 1);
      player.play();
    }).catch(() => { if (!disposed) controller.pause("interruption"); });
    return () => {
      disposed = true;
      player.volume = 0;
      player.pause();
      player.remove();
      if (breath.current === player) breath.current = null;
    };
  }, [running, session?.id, view?.cueKey, audio, audioReady, controller]);

  useEffect(() => {
    if (breath.current) breath.current.volume = running && AppState.currentState === "active"
      ? (guidance?.envelope ?? 0) * (audio === "voice" ? 0.45 : 1) : 0;
  }, [running, view?.phaseElapsedMs, audio]);

  useEffect(() => {
    if (
      !session ||
      session.stage !== "post" ||
      completedId.current === session.id ||
      !audioReady
    )
      return;
    completedId.current = session.id;
    if (haptics)
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    const player = players.current[3];
    if (audio !== "silent" && player && AppState.currentState === "active") {
      const gen = ++generation.current;
      void player
        .seekTo(0)
        .then(() => {
          if (gen === generation.current && AppState.currentState === "active")
            player.play();
        })
        .catch(() => {});
    }
  }, [session?.id, session?.stage, haptics, audio, audioReady]);
  return null;
}
