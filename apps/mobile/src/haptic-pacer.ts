export interface HapticFrame {
  key: string;
  elapsedMs: number;
  remainingMs: number;
  intervalMs: number;
  style: "medium" | "light" | "soft" | null;
  offsetsMs?: readonly number[];
}

/** Re-align each deadline with the engine; never queue missed beats after a stall. */
export function startHapticPacer(read: () => HapticFrame | null, emit: (style: NonNullable<HapticFrame["style"]>) => void, delivered = { lastKey: "" }) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const step = () => {
    if (stopped) return;
    const frame = read();
    if (!frame || frame.remainingMs <= 0) return;
    const beat = frame.offsetsMs ? frame.offsetsMs.findLastIndex(offset => offset <= frame.elapsedMs) : Math.floor(frame.elapsedMs / frame.intervalMs);
    const offset = frame.offsetsMs ? frame.elapsedMs - (frame.offsetsMs[beat] ?? 0) : frame.elapsedMs % frame.intervalMs;
    const key = `${frame.key}:${beat}`;
    if (frame.style && beat >= 0 && offset < 100 && delivered.lastKey !== key) {
      delivered.lastKey = key;
      emit(frame.style);
    }
    // Visit phase boundaries too, including non-integer/custom phase durations.
    const next = frame.offsetsMs ? (frame.offsetsMs.find(offset => offset > frame.elapsedMs) ?? Infinity) - frame.elapsedMs : frame.intervalMs - offset;
    timer = setTimeout(step, Math.max(1, Math.ceil(Math.min(next, frame.remainingMs))));
  };
  step();
  return () => { stopped = true; clearTimeout(timer); };
}
