import { audioSettings } from "./audio-preferences";
import type { Preferences } from "@inout/shared-types";
import { voices } from "./voice-library";
import durations from "./voice-durations.json";

export type VoiceId = "existing" | "female" | "male";
export interface VoiceBank {
  id: VoiceId;
  language: "en" | "es" | "pt";
  label: string;
  cues: readonly (number | undefined)[];
  durations: readonly number[];
}
// Missing phrases remain quiet; never silently switch voice or language.
export const voiceBanks: VoiceBank[] = (["en", "es", "pt"] as const).map(language => ({
  id: "existing", language, label: "Current voice", cues: voices[language], durations: durations[language],
}));
const maleIn = require("../assets/audio/owner/male-in.mp3");
const maleOut = require("../assets/audio/owner/male-out.mp3");
const maleHold = require("../assets/audio/owner/male-hold.mp3");
const maleRest = require("../assets/audio/owner/male-rest.mp3");
voiceBanks.push({ id: "male", language: "en", label: "Male",
  cues: [maleIn, undefined, maleOut, undefined, maleHold, undefined, maleHold, undefined, maleRest],
  durations: [1970, Infinity, 1970, Infinity, 2040, Infinity, 2040, Infinity, 1970],
});
export interface MusicTrack { id: string; title: string; source: number; durationMs: number; crossfadeMs: number }
export const musicTracks: MusicTrack[] = [
  { id: "bliss-breath", title: "Bliss Breath", source: require("../assets/audio/owner/bliss-breath.mp3"), durationMs: 300100, crossfadeMs: 180 },
  { id: "sweet-and-spicy", title: "Sweet and Spicy", source: require("../assets/audio/owner/sweet-and-spicy.mp3"), durationMs: 344020, crossfadeMs: 180 },
  { id: "the-awakening", title: "The Awakening", source: require("../assets/audio/owner/the-awakening.mp3"), durationMs: 446180, crossfadeMs: 180 },
  { id: "the-initiation", title: "The Initiation", source: require("../assets/audio/owner/the-initiation.mp3"), durationMs: 462770, crossfadeMs: 180 },
  { id: "westerpark", title: "Westerpark", source: require("../assets/audio/owner/westerpark.mp3"), durationMs: 292800, crossfadeMs: 180 },
];
export function selectedVoice(p: Preferences) {
  const settings = audioSettings(p);
  return voiceBanks.find(bank => bank.id === settings.voiceId && bank.language === settings.language);
}
