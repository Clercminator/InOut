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
const supplied = {
  enMaleIn: require("../assets/audio/supplied/voice-en-male-in.mp3"),
  enMaleOut: require("../assets/audio/supplied/voice-en-male-out.mp3"),
  enMaleHold: require("../assets/audio/supplied/voice-en-male-hold.mp3"),
  enMaleFlow: require("../assets/audio/supplied/voice-en-male-flow.mp3"),
  enFemaleIn: require("../assets/audio/supplied/voice-en-female-in.mp3"),
  enFemaleOut: require("../assets/audio/supplied/voice-en-female-out.mp3"),
  enFemaleHold: require("../assets/audio/supplied/voice-en-female-hold.mp3"),
  enFemaleFlow: require("../assets/audio/supplied/voice-en-female-flow.mp3"),
  esFemaleIn: require("../assets/audio/supplied/voice-es-female-in.mp3"),
  esFemaleOut: require("../assets/audio/supplied/voice-es-female-out.mp3"),
  esFemaleHold: require("../assets/audio/supplied/voice-es-female-hold.mp3"),
};
const suppliedVoiceDurations = {
  english: { in: 2038, out: 2038, hold: 2090, flow: 2038 },
  spanish: { in: 1567, out: 1724, hold: 1489 },
};
voiceBanks.push({ id: "male", language: "en", label: "Male",
  cues: [supplied.enMaleIn, undefined, supplied.enMaleOut, undefined, supplied.enMaleHold, undefined, supplied.enMaleHold, undefined, supplied.enMaleFlow],
  durations: [suppliedVoiceDurations.english.in, Infinity, suppliedVoiceDurations.english.out, Infinity, suppliedVoiceDurations.english.hold, Infinity, suppliedVoiceDurations.english.hold, Infinity, suppliedVoiceDurations.english.flow],
});
voiceBanks.push({ id: "female", language: "en", label: "Female",
  cues: [supplied.enFemaleIn, undefined, supplied.enFemaleOut, undefined, supplied.enFemaleHold, undefined, supplied.enFemaleHold, undefined, supplied.enFemaleFlow],
  durations: [suppliedVoiceDurations.english.in, Infinity, suppliedVoiceDurations.english.out, Infinity, suppliedVoiceDurations.english.hold, Infinity, suppliedVoiceDurations.english.hold, Infinity, suppliedVoiceDurations.english.flow],
});
voiceBanks.push({ id: "female", language: "es", label: "Female",
  cues: [supplied.esFemaleIn, undefined, supplied.esFemaleOut, undefined, supplied.esFemaleHold, undefined, supplied.esFemaleHold],
  durations: [suppliedVoiceDurations.spanish.in, Infinity, suppliedVoiceDurations.spanish.out, Infinity, suppliedVoiceDurations.spanish.hold, Infinity, suppliedVoiceDurations.spanish.hold],
});
export interface MusicTrack { id: string; title: string; source: number; durationMs: number; crossfadeMs: number }
export const musicTracks: MusicTrack[] = [
  { id: "bliss-breath", title: "Bliss Breath", source: require("../assets/audio/supplied/music-bliss-breath.mp3"), durationMs: 300100, crossfadeMs: 180 },
  { id: "sweet-and-spicy", title: "Sweet and Spicy", source: require("../assets/audio/supplied/music-sweet-and-spicy.mp3"), durationMs: 344020, crossfadeMs: 180 },
  { id: "the-awakening", title: "The Awakening", source: require("../assets/audio/supplied/music-the-awakening.mp3"), durationMs: 446180, crossfadeMs: 180 },
  { id: "the-initiation", title: "The Initiation", source: require("../assets/audio/supplied/music-the-initiation.mp3"), durationMs: 462770, crossfadeMs: 180 },
  { id: "westerpark", title: "Westerpark", source: require("../assets/audio/supplied/music-westerpark.mp3"), durationMs: 292800, crossfadeMs: 180 },
];
export function selectedVoice(p: Preferences) {
  const settings = audioSettings(p);
  return voiceBanks.find(bank => bank.id === settings.voiceId && bank.language === settings.language);
}
