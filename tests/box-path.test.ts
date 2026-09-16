import test from "node:test";
import assert from "node:assert/strict";
import { boxPoint, boxSamples } from "../apps/mobile/src/box-path";

test("box guide follows a closed, rounded path without corner jumps", () => {
  const start = boxPoint(0), end = boxPoint(4);
  assert.ok(Math.hypot(start.x - end.x, start.y - end.y) < 1e-10);
  for (let i = 1; i < boxSamples.length; i++) {
    const a = boxSamples[i - 1], b = boxSamples[i];
    assert.ok(b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1);
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    assert.ok(distance > 0.02 && distance < 0.025, `Nonuniform path step ${i}: ${distance}`);
  }
  assert.equal(boxPoint(0.5).y, 0);
  assert.equal(boxPoint(1.5).x, 1);
  assert.equal(boxPoint(2.5).y, 1);
  assert.equal(boxPoint(3.5).x, 0);
});
