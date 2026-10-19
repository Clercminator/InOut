import { AppState } from "react-native";
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from "expo-audio";

export type PreviewPlaybackState = "loading" | "playing" | "ready";
let stopCurrent: (() => void) | undefined;
/** One disposable preview, never shares players or clocks with a practice. */
export function createAudioPreview(onError: (detail?: string) => void, onDone: () => void, onState: (state: PreviewPlaybackState) => void = () => {}) {
  stopCurrent?.();
  let stopped = false;
  const players: AudioPlayer[] = [];
  const playing = new Set<AudioPlayer>();
  const started = new Set<AudioPlayer>();
  const cleanup: (() => void)[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (stopCurrent === replace) stopCurrent = undefined;
    timers.forEach(clearTimeout);
    cleanup.forEach(fn => { try { fn(); } catch { /* Continue after a native media reset. */ } });
    players.forEach(player => {
      try { player.pause(); } catch { /* A reset may already have released native resources. */ }
      try { player.remove(); } catch { /* Continue releasing the other players. */ }
    });
  };
  const replace = () => { stop(); onDone(); };
  stopCurrent = replace;
  const fail = (reason = "unknown", error?: unknown) => { if (!stopped) {
    const detail = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    stop(); onError(__DEV__ ? `${reason}${detail ? ": " + detail.slice(0, 240) : ""}` : undefined);
  } };
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(() => {
    if (stopped) return;
    if (AppState.currentState !== "active") { stop(); onDone(); return; }
    try { fn(); } catch (error) { fail("native-call", error); }
  }, ms));
  const start = async (clips: { source: number; volume: number; at: number }[], duration: number) => {
    try {
      if (!clips.length) { fail("empty-clips"); return; }
      onState("loading");
      // Explicit media playback follows media volume, not Android's separate ringtone switch.
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
      if (stopped) return;
      await setIsAudioActiveAsync(true);
      if (stopped || AppState.currentState !== "active") return;
      // Load the whole short sequence before starting its clock. play() on an unloaded
      // Android player can be lost, and scheduling voice from a button tap causes drift.
      const loaded = clips.map(clip => {
        const player = createAudioPlayer(clip.source, { updateInterval: 100, keepAudioSessionActive: true });
        players.push(player); player.volume = clip.volume;
        return new Promise<void>(resolve => {
          let hasPlayed = false;
          const sub = player.addListener("playbackStatusUpdate", status => {
            if (stopped) return;
            if (status.error || status.mediaServicesDidReset) { fail("native-status", status.error ?? "media-reset"); return; }
            if (status.isLoaded) resolve();
            if (status.playing) { hasPlayed = true; started.add(player); playing.add(player); }
            else playing.delete(player);
            onState(playing.size ? "playing" : status.isBuffering ? "loading" : "ready");
            if (status.didJustFinish) hasPlayed = false;
            if (hasPlayed && !status.playing && !status.isBuffering) fail("interrupted");
          });
          cleanup.push(() => { sub.remove(); resolve(); });
          if (player.isLoaded) resolve();
        });
      });
      const loadingTimeout = setTimeout(() => fail("loading-timeout"), 5000);
      timers.push(loadingTimeout);
      await Promise.all(loaded);
      clearTimeout(loadingTimeout);
      if (stopped || AppState.currentState !== "active") return;
      clips.forEach((clip, index) => {
        const play = () => {
          players[index].play();
          // Loaded is not evidence that the device started playback.
          later(() => { if (!started.has(players[index])) fail("start-timeout"); }, 2000);
        };
        if (clip.at === 0) play();
        else later(play, clip.at);
      });
      later(() => { stop(); onDone(); }, duration);
    } catch (error) { fail("native-call", error); }
  };
  return { start, stop };
}
