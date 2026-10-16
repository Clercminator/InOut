import type { Preferences } from "@inout/shared-types";
import { voices } from "./voice-library";
import durations from "./voice-durations.json";

export type VoiceId = "existing" | "female" | "male";
export interface VoiceBank {
  id: VoiceId;
  language: "en" | "es" | "pt";
  label: string;
  cues: readonly number[];
  durations: readonly number[];
}
// Preserve approved bundled cues. Supplied recordings are not mapped until approved
// and identified; a missing bank must never silently select another language/gender.
export const voiceBanks: VoiceBank[] = (["en", "es", "pt"] as const).map(language => ({
  id: "existing", language, label: "Current voice", cues: voices[language], durations: durations[language],
}));
export interface MusicTrack { id: string; title: string; source: number; durationMs: number; crossfadeMs: number }
export const musicTracks: MusicTrack[] = [];
export function audioSettings(p: Preferences) {
  return {
    voice: p.guidance?.voice ?? p.audio === "voice",
    nature: p.guidance?.nature ?? p.audio !== "silent",
    breathingVoice: p.guidance?.breathingVoice ?? true,
    restingVoice: p.guidance?.restingVoice ?? true,
    voiceId: p.guidance?.voiceId ?? "existing",
    language: p.guidance?.language ?? p.language ?? "en",
    voiceVolume: p.guidance?.voiceVolume ?? p.experience?.guidanceVolume ?? 0.7,
    natureVolume: p.guidance?.natureVolume ?? (p.experience?.guidanceVolume ?? 0.7) * (p.audio === "voice" ? 0.25 : 1),
    musicId: p.guidance?.musicId,
    music: p.guidance?.music ?? false,
    musicVolume: p.guidance?.musicVolume ?? 0.3,
  };
}
export function selectedVoice(p: Preferences) {
  const settings = audioSettings(p);
  return voiceBanks.find(bank => bank.id === settings.voiceId && bank.language === settings.language);
}
