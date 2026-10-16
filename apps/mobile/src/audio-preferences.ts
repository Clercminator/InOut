import type { Preferences } from "@inout/shared-types";

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

export function validateGuidance(p: Preferences) {
  const g = p.guidance;
  if (g === undefined) return;
  if (!g || typeof g !== "object" ||
    [g.voice, g.nature, g.breathingVoice, g.restingVoice, g.music].some(v => v !== undefined && typeof v !== "boolean") ||
    [g.voiceVolume, g.natureVolume, g.musicVolume].some(v => v !== undefined && (!Number.isFinite(v) || v < 0 || v > 1)) ||
    (g.voiceId !== undefined && !["existing", "female", "male"].includes(g.voiceId)) ||
    (g.language !== undefined && !["en", "es", "pt"].includes(g.language)) ||
    (g.musicId !== undefined && (typeof g.musicId !== "string" || g.musicId.length > 80))) throw Error("Saved sound settings could not be read.");
}
