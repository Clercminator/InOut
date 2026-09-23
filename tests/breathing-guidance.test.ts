import test from "node:test";
import assert from "node:assert/strict";
import { protocols } from "../packages/protocols/src/index";
import { breathingGuidance, smoothBreath } from "../apps/mobile/src/breathing-guidance";
import { start, snapshot, pause, resume } from "../packages/breathing-engine/src/index";

test("all nine protocols keep the visual breath continuous across every phase and cycle", () => {
  for (const protocol of protocols) {
    const phases = protocol.phases.filter(p => p.durationMs > 0);
    for (let i = 0; i < phases.length; i++) {
      const begin = breathingGuidance(phases, i, 0);
      const end = breathingGuidance(phases, i, phases[i].durationMs);
      const next = breathingGuidance(phases, (i + 1) % phases.length, 0);
      assert.equal(end.volume, next.volume, `${protocol.id}: ${i} boundary`);
      assert.equal(begin.envelope, 0);
      assert.ok(end.envelope < 1e-9);
      for (let ms = 0; ms < phases[i].durationMs; ms += 100) {
        const g = breathingGuidance(phases, i, ms);
        assert.ok(g.volume >= 0 && g.volume <= 1);
        if (g.holding) {
          assert.equal(g.volume, begin.volume);
          assert.equal(g.texture, null);
          assert.equal(g.envelope, 0);
        }
      }
    }
  }
});

test("inhale, full hold, exhale and empty hold have distinct tactile patterns", () => {
  const phases = protocols.find(p => p.id === "box")!.phases;
  const patterns = phases.map((_, i) => Array.from({ length: 20 }, (_, t) => breathingGuidance(phases, i, t * 100).pulseKey));
  assert.equal(new Set(patterns.map(p => JSON.stringify(p))).size, 4);
  assert.equal(breathingGuidance(phases, 1).label, "Hold after inhale");
  assert.equal(breathingGuidance(phases, 3).label, "Hold after exhale");
  assert.ok(smoothBreath(0.1) < 0.1);
  assert.ok(smoothBreath(0.9) > 0.9);
});

test("zero-duration custom holds are skipped and pause/resume preserves the breath shape", () => {
  const phases = protocols.find(p => p.id === "box")!.phases.map(p => ({ ...p, durationMs: p.type === "hold" ? 0 : p.durationMs }));
  let state = start({ blocks: [{ protocolId: "custom", protocolVersion: 1, phases, cycles: 2 }] }, 0);
  const guide = (time: number) => { const v = snapshot(state, time); return breathingGuidance(phases, v.phaseIndex, v.phaseElapsedMs); };
  assert.equal(guide(4000).outward, true);
  const before = guide(6000);
  state = pause(state, 6000, "manual");
  assert.deepEqual(guide(100000), before);
  state = resume(state, 100000);
  assert.deepEqual(guide(100000), before);
  assert.ok(guide(101000).volume < before.volume);
});
