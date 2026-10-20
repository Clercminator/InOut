import test from "node:test";
import assert from "node:assert/strict";
import { audioSettings, musicTrackIds, validateGuidance, voiceCueIndex, voiceOptions } from "../apps/mobile/src/audio-preferences";
import type { Preferences } from "@inout/shared-types";
test("legacy sound preferences migrate without changing existing playback choices", () => {
  for (const audio of ["voice", "tones", "silent"] as const) {
    const p: Preferences = { audio, haptics: true, keepAwake: true };
    assert.equal(audioSettings(p).voice, audio === "voice");
    assert.equal(audioSettings(p).nature, audio !== "silent");
    for (const voice of [true, false]) for (const nature of [true, false]) {
      const persisted = JSON.parse(JSON.stringify({ ...p, guidance: { voice, nature, voiceVolume: .25, natureVolume: .7 } }));
      validateGuidance(persisted);
      assert.equal(audioSettings(persisted).voice, voice);
      assert.equal(audioSettings(persisted).nature, nature);
      assert.equal(audioSettings(persisted).voiceVolume, .25);
    }
  }
  assert.throws(() => validateGuidance({ guidance: { voiceVolume: 1.1 } } as Preferences));
  assert.throws(() => validateGuidance({ guidance: { voiceId: "missing" as "male", language: "es" } } as Preferences));
  assert.throws(() => validateGuidance({ guidance: { music: true, musicId: "missing-track" } } as Preferences));
  for (const option of voiceOptions) {
    validateGuidance({ guidance: { voiceId: option.id, language: option.language } });
  }
  assert.deepEqual(musicTrackIds, ["bliss-breath", "sweet-and-spicy", "the-awakening", "the-initiation", "westerpark"]);
});

test("spoken cue indexes match breathing phases and never infer an unknown cue", () => {
  for (const [type, expected] of [
    ["inhale", 0], ["inhaleTopUp", 1], ["exhale", 2], ["hold", 4],
    ["hum", 5], ["retention", 6], ["recovery", 7], ["freeBreathing", 8],
  ] as const) {
    assert.equal(voiceCueIndex({ type }, false, true, false), expected);
  }
  assert.equal(voiceCueIndex({ type: "hold" }, true, false, false), 6);
  assert.equal(voiceCueIndex({ type: "retention" }, true, false, true), 4);
  assert.equal(voiceCueIndex({ type: "inhale", nostril: "left" }, false, true, false), 9);
  assert.equal(voiceCueIndex({ type: "inhale", nostril: "right" }, false, true, false), 10);
  assert.equal(voiceCueIndex({ type: "exhale", nostril: "left" }, false, true, false), 11);
  assert.equal(voiceCueIndex({ type: "exhale", nostril: "right" }, false, true, false), 12);
  assert.equal(voiceCueIndex({ type: "unmapped" }, false, true, false), undefined);
});
