import { createAudioPlayer } from "expo-audio";

/** Two reusable decoders overlap the MP3 boundary; neither drives the breathing clock. */
export function loopedAudio(source: number, gain: () => number, onError: () => void, crossfadeMs = 180) {
  const players = [0, 1].map(() => createAudioPlayer(source, { updateInterval: 50, keepAudioSessionActive: false }));
  players.forEach(p => { p.volume = 0; p.loop = true; });
  let disposed = false, failed = false, active = 0, preparing = false, fading = false, played = false;
  const startedAt = Date.now();
  const fail = () => {
    if (disposed || failed) return;
    failed = true;
    players.forEach(p => { try { p.volume = 0; p.pause(); } catch {} });
    onError();
  };
  const subscriptions = players.map(p => p.addListener("playbackStatusUpdate", status => {
    if (status.error || status.mediaServicesDidReset) fail();
  }));
  const tick = () => {
    if (disposed || failed) return;
    try {
      const current = players[active], next = players[1 - active];
      if (!played) {
        if (!players.every(p => p.isLoaded && p.duration > 0)) {
          if (Date.now() - startedAt > 15000) fail();
          return;
        }
        played = true; current.volume = gain(); current.play();
      }
      const overlap = Math.min(crossfadeMs / 1000, current.duration / 4);
      // Include a decoder-padding margin, and prepare the other decoder before fading.
      const remaining = current.duration - current.currentTime;
      if (!preparing && !fading && remaining <= overlap + 0.15) {
        preparing = true;
        void next.seekTo(0).then(() => {
          if (disposed || failed) return;
          next.volume = 0; next.play(); fading = true; preparing = false;
        }).catch(fail);
      }
      if (fading) {
        const progress = Math.min(1, next.currentTime / Math.max(0.04, overlap));
        current.volume = gain() * (1 - progress); next.volume = gain() * progress;
        if (progress === 1) { current.volume = 0; current.pause(); active = 1 - active; fading = false; }
      } else current.volume = gain();
    } catch { fail(); }
  };
  const timer = setInterval(tick, 25);
  tick();
  return () => {
    disposed = true; clearInterval(timer); subscriptions.forEach(s => s.remove());
    players.forEach(p => { try { p.pause(); } catch {} try { p.remove(); } catch {} });
  };
}
