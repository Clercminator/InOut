import { createAudioPlayer } from "expo-audio";

/** Two reusable decoders overlap the MP3 boundary; neither drives the breathing clock. */
export type AudioLoop = (() => void) & { pause: () => void; resume: () => void };
export function loopedAudio(source: number, gain: () => number, onError: () => void, crossfadeMs = 180, startImmediately = true): AudioLoop {
  const players = [0, 1].map(() => createAudioPlayer(source, { updateInterval: 50, keepAudioSessionActive: false }));
  players.forEach(p => { p.volume = 0; p.loop = true; });
  let disposed = false, failed = false, paused = !startImmediately, active = 0, preparing = false, fading = false, played = false, seekGeneration = 0;
  let loadingStartedAt: number | undefined;
  const fail = () => {
    if (disposed || failed) return;
    failed = true;
    paused = true;
    players.forEach(p => { try { p.volume = 0; p.pause(); } catch {} });
    onError();
  };
  const subscriptions = players.map(p => p.addListener("playbackStatusUpdate", status => {
    if (status.error || status.mediaServicesDidReset) fail();
  }));
  const tick = () => {
    if (disposed || failed || paused) return;
    try {
      const current = players[active], next = players[1 - active];
      if (!played) {
        if (!players.every(p => p.isLoaded && p.duration > 0)) {
          if (loadingStartedAt === undefined) loadingStartedAt = Date.now();
          if (Date.now() - loadingStartedAt > 15000) fail();
          return;
        }
        loadingStartedAt = undefined;
        played = true; current.volume = gain(); current.play();
      }
      const overlap = Math.min(crossfadeMs / 1000, current.duration / 4);
      // Include a decoder-padding margin, and prepare the other decoder before fading.
      const remaining = current.duration - current.currentTime;
      if (!preparing && !fading && remaining <= overlap + 0.15) {
        preparing = true;
        const generation = ++seekGeneration;
        void next.seekTo(0).then(() => {
          if (disposed || failed || paused || generation !== seekGeneration) return;
          next.volume = 0; next.play(); fading = true; preparing = false;
        }).catch(() => {
          if (generation === seekGeneration && !paused) fail();
        });
      }
      if (fading) {
        const progress = Math.min(1, next.currentTime / Math.max(0.04, overlap));
        current.volume = gain() * (1 - progress); next.volume = gain() * progress;
        if (progress === 1) { current.volume = 0; current.pause(); active = 1 - active; fading = false; }
      } else current.volume = gain();
    } catch { fail(); }
  };
  const timer = setInterval(tick, 25);
  if (startImmediately) tick();
  const stop = (() => {
    disposed = true; seekGeneration++; clearInterval(timer); subscriptions.forEach(s => s.remove());
    players.forEach(p => { try { p.volume = 0; p.pause(); } catch {} try { p.remove(); } catch {} });
  }) as AudioLoop;
  stop.pause = () => {
    if (disposed || failed || paused) return;
    if (fading) {
      const next = players[1 - active];
      if (next.currentTime / Math.max(0.04, Math.min(crossfadeMs / 1000, players[active].duration / 4)) >= 0.5)
        active = 1 - active;
    }
    paused = true;
    seekGeneration++;
    preparing = false;
    fading = false;
    if (!played) loadingStartedAt = undefined;
    players.forEach(p => { try { p.volume = 0; p.pause(); } catch { fail(); } });
  };
  stop.resume = () => {
    if (disposed || failed || !paused) return;
    paused = false;
    if (!played) { tick(); return; }
    try {
      players[1 - active].volume = 0;
      players[active].volume = gain();
      players[active].play();
    } catch { fail(); }
  };
  return stop;
}
