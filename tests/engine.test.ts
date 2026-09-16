import test from "node:test";
import assert from "node:assert/strict";
import * as e from "../packages/breathing-engine/src/index";
import { planFor, sigh, protocols } from "../packages/protocols/src/index";
import { makeMixProtocol } from "../apps/mobile/src/custom-protocol";

test("mixes preserve selection order, complete cycles, repeats and block boundaries", () => {
  const coherent = protocols.find((p) => p.id === "coherent")!;
  const mix = makeMixProtocol([coherent, sigh]);
  const plan = planFor(mix, 2);
  assert.deepEqual(plan.blocks.map((b) => b.protocolId), ["coherent", sigh.id, "coherent", sigh.id]);
  assert.deepEqual(plan.blocks.map((b) => b.cycles), [18, 3, 18, 3]);
  assert.equal(e.totalDuration(plan), 456000);
  assert.equal(e.snapshot(e.start(plan, 0), 180000).blockIndex, 1);
  const intense = protocols.find((p) => p.safetyCategory === "highIntensity")!;
  assert.equal(makeMixProtocol([sigh, intense]).safetyCategory, "highIntensity");
});

test("phase boundaries and stalled renders use timestamps", () => {
  const state = e.start(planFor(sigh), 1000);
  for (const [offset, phase, cycle] of [
    [0, 0, 1],
    [3999, 0, 1],
    [4000, 1, 1],
    [6000, 2, 1],
    [16000, 0, 2],
    [47000, 2, 3],
  ] as const) {
    const v = e.snapshot(state, 1000 + offset);
    assert.equal(v.phaseIndex, phase);
    assert.equal(v.currentCycle, cycle);
    assert.equal(v.sessionElapsedMs, offset);
  }
  const done = e.snapshot(state, 90000);
  assert.equal(done.completed, true);
  assert.equal(done.sessionElapsedMs, 48000);
  assert.equal(done.sessionRemainingMs, 0);
  assert.equal(done.completedCycles, 3);
});
test("pause excludes background time; lifecycle actions are idempotent", () => {
  const paused = e.pause(e.start(planFor(sigh), 0), 5500, "background");
  assert.equal(e.snapshot(paused, 999999).phaseRemainingMs, 500);
  assert.deepEqual(e.pause(paused, 999999), paused);
  const resumed = e.resume(paused, 100000);
  assert.equal(e.snapshot(resumed, 100500).phase.type, "exhale");
  assert.deepEqual(e.resume(resumed, 100100), resumed);
  const ended = e.end(resumed, 101000);
  assert.equal(e.snapshot(ended, 900000).sessionElapsedMs, 6500);
  assert.equal(ended.status, "ended");
  assert.equal(
    e.snapshot(e.restart(ended, 200000), 200000).sessionElapsedMs,
    0,
  );
});
test("process recovery excludes unknown time after durable checkpoint", () => {
  const saved = e.checkpoint(e.start(planFor(sigh), 10000), 17250);
  const recovered = e.recover(JSON.parse(JSON.stringify(saved)), 5000000);
  assert.equal(recovered.status, "paused");
  assert.equal(recovered.pauseReason, "recovery");
  assert.equal(e.snapshot(recovered, 5000000).sessionElapsedMs, 7250);
  assert.equal(
    e.snapshot(e.resume(recovered, 5000000), 5001000).sessionElapsedMs,
    8250,
  );
});
test("arbitrary phases, zero holds and multiple mix blocks", () => {
  const a = planFor(sigh, 1).blocks[0];
  const b = {
    ...a,
    cycles: 2,
    phases: [
      { ...a.phases[0], durationMs: 0 },
      { ...a.phases[2], durationMs: 1234 },
    ],
  };
  const state = e.start({ blocks: [a, b] }, 0);
  assert.equal(e.totalDuration(state.plan), 18468);
  const v = e.snapshot(state, 17234);
  assert.equal(v.blockIndex, 1);
  assert.equal(v.phaseIndex, 1);
  assert.equal(v.currentCycle, 2);
  assert.equal(v.completedCycles, 2);
});
test("all ten definitions validate and duration metadata reconciles", () => {
  assert.equal(protocols.length, 10);
  assert.equal(new Set(protocols.map((p) => p.id)).size, 10);
  for (const p of protocols) {
    e.validatePlan(planFor(p));
    assert.equal(e.totalDuration(planFor(p)), p.defaultDuration);
  }
  assert.equal(
    protocols.find((p) => p.safetyCategory === "highIntensity")?.availability,
    "definitionOnly",
  );
});
test("invalid plans and corrupted engine state are rejected", () => {
  const block = planFor(sigh).blocks[0];
  for (const durationMs of [-1, NaN, Infinity, 3600001, 0])
    assert.throws(() =>
      e.start(
        {
          blocks: [{ ...block, phases: [{ ...block.phases[0], durationMs }] }],
        },
        0,
      ),
    );
  assert.throws(() => e.start({ blocks: [] }, 0));
  assert.throws(() => e.start({ blocks: [{ ...block, cycles: 0 }] }, 0));
  assert.throws(() =>
    e.recover({ ...e.start(planFor(sigh), 0), elapsedAtAnchor: -1 }, 10),
  );
});
test("monotonic clock ignores manual wall-clock changes", () => {
  let wall = 1000,
    mono = 50;
  const clock = e.createClock(
    () => wall,
    () => mono,
  );
  wall = 99999999;
  mono = 150;
  assert.equal(clock.now(), 1100);
  wall = 0;
  mono = 200;
  assert.equal(clock.now(), 1150);
});
test("sampling matches an independently expanded schedule", () => {
  const blocks = protocols.slice(0, 9).map((p) => planFor(p, 2).blocks[0]);
  const state = e.start({ blocks }, 0);
  const schedule: {
    end: number;
    block: number;
    phase: number;
    cycle: number;
  }[] = [];
  let sum = 0;
  blocks.forEach((b, bi) => {
    for (let cycle = 1; cycle <= b.cycles; cycle++)
      b.phases.forEach((p, pi) => {
        sum += p.durationMs;
        schedule.push({ end: sum, block: bi, phase: pi, cycle });
      });
  });
  for (let now = 0; now < sum; now += 317) {
    const expected = schedule.find((s) => s.end > now)!;
    const actual = e.snapshot(state, now);
    assert.equal(actual.blockIndex, expected.block);
    assert.equal(actual.phaseIndex, expected.phase);
    assert.equal(actual.currentCycle, expected.cycle);
  }
});
