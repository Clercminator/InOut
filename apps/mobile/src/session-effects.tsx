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
import { useSession } from "./provider";

const sources = {
  voice: [
    require("../assets/audio/inhale.wav"),
    require("../assets/audio/top-up.wav"),
    require("../assets/audio/exhale.wav"),
    require("../assets/audio/complete.wav"),
  ],
  tones: [
    require("../assets/audio/tone-in.wav"),
    require("../assets/audio/tone-top.wav"),
    require("../assets/audio/tone-out.wav"),
    require("../assets/audio/tone-complete.wav"),
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
  const cycle = useRef(-1);
  const completedId = useRef("");
  const [audioReady, setAudioReady] = useState(false);
  const view = controller.view();

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
    setAudioReady(false);
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
        if (mounted) setAudioReady(true);
      })
      .catch(() => {
        if (mounted) controller.pause("interruption");
      });
    return () => {
      mounted = false;
    };
  }, [controller, running, audio, session?.stage]);

  useEffect(() => {
    const gen = ++generation.current;
    cue.current = "";
    cycle.current = -1;
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
    const newCycle = cycle.current >= 0 && cycle.current !== view.currentCycle;
    cycle.current = view.currentCycle;
    if (haptics) {
      if (newCycle)
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      else
        void Haptics.impactAsync(
          view.phase.hapticCue === "soft"
            ? Haptics.ImpactFeedbackStyle.Soft
            : view.phase.hapticCue === "medium"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => {});
    }
    AccessibilityInfo.announceForAccessibility(view.phase.label);
    // Skip expired cues after stalls. Only the current phase is announced, never a backlog.
    if (view.phaseRemainingMs > 750 && audio !== "silent" && audioReady) {
      const player =
        players.current[
          view.phase.type === "inhale"
            ? 0
            : view.phase.type === "inhaleTopUp"
              ? 1
              : 2
        ];
      players.current.forEach((p) => p.pause());
      if (player)
        void player
          .seekTo(0)
          .then(() => {
            if (
              generation.current === gen &&
              controller.current?.engine.status === "running" &&
              AppState.currentState === "active"
            )
              player.play();
          })
          .catch(() => controller.pause("interruption"));
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
