import { selectedMusicTrack, selectedVoice, musicTracks, voiceBanks } from "../src/approved-audio";
import { voiceOptions } from "../src/audio-preferences";
import type { Preferences } from "@inout/shared-types";

test("each supported language and voice combination resolves only to its own recording bank", () => {
  expect(voiceBanks.map(({ id, language }) => ({ id, language }))).toEqual(voiceOptions);
  for (const option of voiceOptions) {
    const preferences: Preferences = {
      audio: "voice",
      haptics: false,
      keepAwake: false,
      language: option.language,
      guidance: { voice: true, voiceId: option.id, language: option.language },
    };
    const bank = selectedVoice(preferences);
    expect(bank).toBeDefined();
    expect(bank).toMatchObject(option);
    expect(bank?.cues.length).toBeGreaterThan(0);
    expect(bank?.durations.length).toBe(bank?.cues.length);
  }
  expect(selectedVoice({
    audio: "voice",
    haptics: false,
    keepAwake: false,
    language: "es",
    guidance: { voice: true, language: "es", voiceId: "missing" as "male" },
  })).toBeUndefined();
});

test("all six supplied voices provide inhale, exhale, hold and flow without language substitution", () => {
  expect(voiceBanks.filter(bank => bank.id !== "existing")).toHaveLength(6);
  for (const bank of voiceBanks.filter(bank => bank.id !== "existing")) {
    for (const slot of [0, 2, 4, 6, 8]) {
      expect(bank.cues[slot]).toBeDefined();
      expect(bank.durations[slot]).toBeGreaterThan(0);
      expect(bank.durations[slot]).toBeLessThan(3000);
    }
    for (const slot of [1, 3, 5, 7]) expect(bank.cues[slot]).toBeUndefined();
  }
});

test("all bundled music choices resolve explicitly and unsupported IDs have no fallback", () => {
  expect(musicTracks.map(({ id }) => id)).toEqual([
    "bliss-breath", "sweet-and-spicy", "the-awakening", "the-initiation", "westerpark",
  ]);
  for (const track of musicTracks) expect(selectedMusicTrack(track.id)).toBe(track);
  expect(selectedMusicTrack()).toBe(musicTracks[0]);
  expect(selectedMusicTrack("missing-track")).toBeUndefined();
});
