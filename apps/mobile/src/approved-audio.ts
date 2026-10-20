import { audioSettings, musicTrackIds, voiceOptions } from "./audio-preferences";
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
function suppliedBank(cues: readonly number[], ms: readonly number[]): Pick<VoiceBank, "cues" | "durations"> {
  return {
    cues: [cues[0], undefined, cues[1], undefined, cues[2], undefined, cues[2], undefined, cues[3]],
    durations: [ms[0], Infinity, ms[1], Infinity, ms[2], Infinity, ms[2], Infinity, ms[3]],
  };
}
const supplied = {
  en: {
    male: suppliedBank([
      require("../assets/audio/supplied/voice-en-male-in.mp3"),
      require("../assets/audio/supplied/voice-en-male-out.mp3"),
      require("../assets/audio/supplied/voice-en-male-hold.mp3"),
      require("../assets/audio/supplied/voice-en-male-flow.mp3"),
    ], [2038, 2038, 2090, 2038]),
    female: suppliedBank([
      require("../assets/audio/supplied/voice-en-female-in.mp3"),
      require("../assets/audio/supplied/voice-en-female-out.mp3"),
      require("../assets/audio/supplied/voice-en-female-hold.mp3"),
      require("../assets/audio/supplied/voice-en-female-flow.mp3"),
    ], [2038, 2038, 2090, 2038]),
  },
  es: {
    male: suppliedBank([
      require("../assets/audio/supplied/voice-es-male-in.mp3"),
      require("../assets/audio/supplied/voice-es-male-out.mp3"),
      require("../assets/audio/supplied/voice-es-male-hold.mp3"),
      require("../assets/audio/supplied/voice-es-male-flow.mp3"),
    ], [1071, 1228, 993, 1959]),
    female: suppliedBank([
      require("../assets/audio/supplied/voice-es-female-in.mp3"),
      require("../assets/audio/supplied/voice-es-female-out.mp3"),
      require("../assets/audio/supplied/voice-es-female-hold.mp3"),
      require("../assets/audio/supplied/voice-es-female-flow.mp3"),
    ], [1567, 1724, 1489, 2508]),
  },
  pt: {
    male: suppliedBank([
      require("../assets/audio/supplied/voice-pt-male-in.mp3"),
      require("../assets/audio/supplied/voice-pt-male-out.mp3"),
      require("../assets/audio/supplied/voice-pt-male-hold.mp3"),
      require("../assets/audio/supplied/voice-pt-male-flow.mp3"),
    ], [1411, 1959, 1149, 1959]),
    female: suppliedBank([
      require("../assets/audio/supplied/voice-pt-female-in.mp3"),
      require("../assets/audio/supplied/voice-pt-female-out.mp3"),
      require("../assets/audio/supplied/voice-pt-female-hold.mp3"),
      require("../assets/audio/supplied/voice-pt-female-flow.mp3"),
    ], [1802, 2116, 1228, 1802]),
  },
};

export const voiceBanks: VoiceBank[] = voiceOptions.map(({ id, language }) => {
  if (id === "existing") return { id, language, label: "Current voice", cues: voices[language], durations: durations[language] };
  return { id, language, label: id === "male" ? "Male" : "Female", ...supplied[language][id] };
});
export interface MusicTrack { id: string; title: string; source: number; durationMs: number; crossfadeMs: number }
const tracksById: Record<typeof musicTrackIds[number], MusicTrack> = {
  "bliss-breath": { id: "bliss-breath", title: "Bliss Breath", source: require("../assets/audio/supplied/music-bliss-breath.mp3"), durationMs: 300096, crossfadeMs: 180 },
  "sweet-and-spicy": { id: "sweet-and-spicy", title: "Sweet and Spicy", source: require("../assets/audio/supplied/music-sweet-and-spicy.mp3"), durationMs: 344016, crossfadeMs: 180 },
  "the-awakening": { id: "the-awakening", title: "The Awakening", source: require("../assets/audio/supplied/music-the-awakening.mp3"), durationMs: 446184, crossfadeMs: 180 },
  "the-initiation": { id: "the-initiation", title: "The Initiation", source: require("../assets/audio/supplied/music-the-initiation.mp3"), durationMs: 462768, crossfadeMs: 180 },
  westerpark: { id: "westerpark", title: "Westerpark", source: require("../assets/audio/supplied/music-westerpark.mp3"), durationMs: 292800, crossfadeMs: 180 },
};
export const musicTracks = musicTrackIds.map(id => tracksById[id]);
export function selectedMusicTrack(id?: string) {
  if (id === undefined) return musicTracks[0];
  const supportedId = musicTrackIds.find(candidate => candidate === id);
  return supportedId === undefined ? undefined : tracksById[supportedId];
}

export function selectedVoice(p: Preferences) {
  const settings = audioSettings(p);
  return voiceBanks.find(bank => bank.id === settings.voiceId && bank.language === settings.language);
}
