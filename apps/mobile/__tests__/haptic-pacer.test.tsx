import { start, snapshot } from "@inout/breathing-engine";
import { protocols, planFor } from "@inout/protocols";
import { startHapticPacer, type HapticFrame } from "../src/haptic-pacer";
import { breathingGuidance } from "../src/breathing-guidance";
import { hapticOffsets } from "../src/breath-haptics";

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(0); });
afterEach(() => jest.useRealTimers());

test.each(protocols)("$id transition cues are bounded to breath starts and holds remain quiet", protocol => {
  const engine = start(planFor(protocol, 1), 0);
  const emitted: { type: string; elapsed: number; style: string }[] = [];
  const stop = startHapticPacer(() => {
    const v = snapshot(engine, Date.now());
    if (v.completed) return null;
    const g = breathingGuidance(engine.plan.blocks[v.blockIndex].phases, v.phaseIndex, v.phaseElapsedMs);
    return { key: v.cueKey, elapsedMs: v.phaseElapsedMs, remainingMs: v.phaseRemainingMs,
      intervalMs: g.pulseEveryMs, style: g.pulseStyle, offsetsMs: hapticOffsets(v.phase, "transitions") };
  }, style => {
    const v = snapshot(engine, Date.now());
    emitted.push({ type: v.phase.type, elapsed: v.phaseElapsedMs, style });
  });
  jest.advanceTimersByTime(protocol.defaultDuration + 1000);
  expect(emitted.length).toBeGreaterThan(0);
  for (const cue of emitted) {
    expect(["inhale", "inhaleTopUp", "exhale", "hum"]).toContain(cue.type);
    expect(cue.elapsed === 0 || (cue.type === "inhale" && cue.elapsed === 140)).toBe(true);
    expect(["light", "soft"]).toContain(cue.style);
  }
  stop();
  expect(jest.getTimerCount()).toBe(0);
});

test("box breathing keeps exact spacing and constant strength across multiple cycles without renders", () => {
  const protocol = protocols.find(p => p.id === "box")!;
  const engine = start(planFor(protocol, 2), 0);
  const emitted: { time: number; style: string }[] = [];
  const stop = startHapticPacer(() => {
    const v = snapshot(engine, Date.now());
    if (v.completed) return null;
    const g = breathingGuidance(protocol.phases, v.phaseIndex, v.phaseElapsedMs);
    return { key: v.cueKey, elapsedMs: v.phaseElapsedMs, remainingMs: v.phaseRemainingMs, intervalMs: g.pulseEveryMs, style: g.pulseStyle };
  }, style => emitted.push({ time: Date.now(), style }));
  jest.advanceTimersByTime(40000);
  const cycle = [0, 1000, 2000, 3000, 8000, 9000, 10000, 11000];
  expect(emitted.map(e => e.time)).toEqual([...cycle, ...cycle.map(t => t + 16000)]);
  expect(emitted.slice(0, 8).map(e => e.style)).toEqual(["light", "light", "light", "light", "soft", "soft", "soft", "soft"]);
  stop(); expect(jest.getTimerCount()).toBe(0);
});

test("late callbacks skip missed taps and realign instead of replaying a burst", () => {
  let elapsed = 0;
  const emit = jest.fn();
  const stop = startHapticPacer(() => ({ key: "inhale", elapsedMs: elapsed, remainingMs: 8000 - elapsed, intervalMs: 1000, style: "medium" }), emit);
  elapsed = 2500; jest.advanceTimersByTime(1000);
  expect(emit).toHaveBeenCalledTimes(1);
  elapsed = 3000; jest.advanceTimersByTime(500);
  expect(emit).toHaveBeenCalledTimes(2);
  stop(); jest.advanceTimersByTime(10000);
  expect(emit).toHaveBeenCalledTimes(2);
});

test("pause/resume cannot duplicate a just-delivered beat, and inactive frames cancel future taps", () => {
  const delivered = { lastKey: "" };
  let frame: HapticFrame | null = { key: "cycle1:inhale", elapsedMs: 0, remainingMs: 4000, intervalMs: 1000, style: "medium" };
  const emit = jest.fn();
  const stop = startHapticPacer(() => frame, emit, delivered);
  stop(); frame.elapsedMs = 50; frame.remainingMs = 3950;
  const resumed = startHapticPacer(() => frame, emit, delivered);
  expect(emit).toHaveBeenCalledTimes(1);
  frame = null; jest.advanceTimersByTime(10000);
  expect(emit).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
  resumed();
});
