import type { Preferences } from "@inout/shared-types";

export const voiceOptions = [
  { id: "existing", language: "en" },
  { id: "existing", language: "es" },
  { id: "existing", language: "pt" },
  { id: "male", language: "en" },
  { id: "female", language: "en" },
  { id: "female", language: "es" },
  { id: "male", language: "es" },
  { id: "female", language: "pt" },
  { id: "male", language: "pt" },
] as const;

export const musicTrackIds = [
  "bliss-breath",
  "sweet-and-spicy",
  "the-awakening",
  "the-initiation",
  "westerpark",
] as const;

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

export function voiceCueIndex(
  phase: { type: string; nostril?: "left" | "right" | "both" },
  holding: boolean,
  full: boolean,
  cyclic: boolean,
) {
  const indexes: Record<string, number> = {
    inhale: 0,
    inhaleTopUp: 1,
    exhale: 2,
    hold: 4,
    hum: 5,
    retention: 6,
    recovery: 7,
    freeBreathing: 8,
  };
  let index = indexes[phase.type];
  if (index === undefined) return undefined;
  if (holding && !full) index = 6;
  if (cyclic && phase.type === "retention") index = 4;
  if (phase.nostril === "left" || phase.nostril === "right") {
    if (phase.type === "inhale") index = phase.nostril === "left" ? 9 : 10;
    if (phase.type === "exhale") index = phase.nostril === "left" ? 11 : 12;
  }
  return index;
}

export function validateGuidance(p: Preferences) {
  const g = p.guidance;
  if (g === undefined) return;
  if (!g || typeof g !== "object" ||
    [g.voice, g.nature, g.breathingVoice, g.restingVoice, g.music].some(v => v !== undefined && typeof v !== "boolean") ||
    [g.voiceVolume, g.natureVolume, g.musicVolume].some(v => v !== undefined && (!Number.isFinite(v) || v < 0 || v > 1)) ||
    (g.voiceId !== undefined && !voiceOptions.some(option => option.id === g.voiceId && option.language === (g.language ?? p.language ?? "en"))) ||
    (g.language !== undefined && !["en", "es", "pt"].includes(g.language)) ||
    (g.musicId !== undefined && !(musicTrackIds as readonly string[]).includes(g.musicId))) throw Error("Saved sound settings could not be read.");
}
