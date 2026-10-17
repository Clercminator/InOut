import test from "node:test";
import assert from "node:assert/strict";
import { freeAdsDisclosure, shouldShowFreeAdsDisclosure } from "../apps/mobile/src/ad-disclosure";

test("Free ad disclosure is shown once only to non-Pro users outside preview", () => {
  assert.equal(shouldShowFreeAdsDisclosure(false, false, false), true);
  assert.equal(shouldShowFreeAdsDisclosure(true, false, false), false);
  assert.equal(shouldShowFreeAdsDisclosure(false, true, false), false);
  assert.equal(shouldShowFreeAdsDisclosure(false, false, true), false);
  assert.match(freeAdsDisclosure.message, /Pro removes ads\.$/);
  assert.match(freeAdsDisclosure.message, /occasional ads/);
});
