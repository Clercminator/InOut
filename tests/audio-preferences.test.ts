import test from "node:test";
import assert from "node:assert/strict";
import { audioSettings, validateGuidance } from "../apps/mobile/src/audio-preferences";
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
});
