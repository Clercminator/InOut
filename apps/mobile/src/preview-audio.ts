import { AppState } from "react-native";
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from "expo-audio";

/** One disposable preview, never shares players or clocks with a practice. */
export function createAudioPreview(onError: () => void, onDone: () => void) {
  let stopped = false;
  const players: AudioPlayer[] = [];
  const cleanup: (() => void)[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const stop = () => {
    if (stopped) return;
    stopped = true;
    timers.forEach(clearTimeout);
    cleanup.forEach(fn => fn());
    players.forEach(player => {
      try { player.pause(); } catch { /* A reset may already have released native resources. */ }
      try { player.remove(); } catch { /* Continue releasing the other players. */ }
    });
  };
  const fail = () => { if (!stopped) { stop(); onError(); } };
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(() => {
    if (stopped) return;
    if (AppState.currentState !== "active") { stop(); onDone(); return; }
    try { fn(); } catch { fail(); }
  }, ms));
  const start = async (clips: { source: number; volume: number; at: number }[], duration: number) => {
    try {
      await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
      if (stopped) return;
      await setIsAudioActiveAsync(true);
      if (stopped || AppState.currentState !== "active") return;
      // Load the whole short sequence before starting its clock. play() on an unloaded
      // Android player can be lost, and scheduling voice from a button tap causes drift.
      const loaded = clips.map(clip => {
        const player = createAudioPlayer(clip.source, { updateInterval: 100, keepAudioSessionActive: false });
        players.push(player); player.volume = clip.volume;
        return new Promise<void>(resolve => {
          let hasPlayed = false;
          const sub = player.addListener("playbackStatusUpdate", status => {
            if (stopped) return;
            if (status.error || status.mediaServicesDidReset) { fail(); return; }
            if (status.isLoaded) resolve();
            if (status.playing) hasPlayed = true;
            if (status.didJustFinish) hasPlayed = false;
            if (hasPlayed && !status.playing && !status.isBuffering) fail();
          });
          cleanup.push(() => { sub.remove(); resolve(); });
          if (player.isLoaded) resolve();
        });
      });
      const loadingTimeout = setTimeout(fail, 5000);
      timers.push(loadingTimeout);
      await Promise.all(loaded);
      clearTimeout(loadingTimeout);
      if (stopped || AppState.currentState !== "active") return;
      clips.forEach((clip, index) => {
        if (clip.at === 0) players[index].play();
        else later(() => players[index].play(), clip.at);
      });
      later(() => { stop(); onDone(); }, duration);
    } catch { fail(); }
  };
  return { start, stop };
}
