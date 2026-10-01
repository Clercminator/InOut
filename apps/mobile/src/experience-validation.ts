import type { Experience } from "@inout/shared-types";
import { planFor, availableForPractice } from "@inout/protocols";
import { validatePlan } from "@inout/breathing-engine";

export function validateExperience(value: Experience) {
  const fail = () => { throw new Error("Personal preferences could not be read. Your data has been preserved."); };
  if (!value || typeof value !== "object") return fail();
  for (const [key, max] of [["name", 40], ["bio", 180], ["intention", 90]] as const)
    if (typeof value[key] !== "string" || value[key].length > max) fail();
  const choices = {
    avatar: ["spa", "air", "nightlight", "wb-sunny"], palette: ["sky", "mint", "dusk", "sunrise"],
    texture: ["glass", "halo", "orbit"], background: ["midnight", "deep-sea", "plum"], frame: ["simple", "glow", "laurel"],
    celebration: ["quiet", "gentle", "playful"], celebrationStyle: ["sparks", "confetti"], chime: ["bell", "bloom", "off"], breathSound: ["air", "ocean", "warm"],
  };
  for (const [key, options] of Object.entries(choices)) if (!options.includes(value[key as keyof Experience] as string)) fail();
  if (!Number.isInteger(value.weeklyGoal) || value.weeklyGoal < 2 || value.weeklyGoal > 7) fail();
  for (const volume of [value.guidanceVolume, value.celebrationVolume]) if (!Number.isFinite(volume) || volume < 0 || volume > 1) fail();
  if (value.photo !== undefined && !/^profile-[a-zA-Z0-9-]+\.(jpg|png|jpeg|webp)$/.test(value.photo)) fail();
  if (!Array.isArray(value.pinnedBadges) || value.pinnedBadges.length > 3 || value.pinnedBadges.some(id => typeof id !== "string")) fail();
  if (!Array.isArray(value.rituals) || value.rituals.length > 20) fail();
  const ids = new Set<string>();
  for (const ritual of value.rituals) {
    if (!ritual || typeof ritual.id !== "string" || ids.has(ritual.id) || !ritual.name?.trim() || ritual.name.length > 40 ||
      !Number.isInteger(ritual.cycles) || ritual.cycles < 1 || ritual.cycles > 100 ||
      !["voice", "tones", "silent"].includes(ritual.audio) || ritual.protocol?.availability !== "enabled" ||
      !availableForPractice(ritual.protocol)) fail();
    ids.add(ritual.id);
    validatePlan(planFor(ritual.protocol, ritual.cycles));
    for (const key of ["palette", "texture", "background", "breathSound"] as const) if (!choices[key].includes(ritual.appearance?.[key])) fail();
    if (!Number.isFinite(ritual.appearance?.guidanceVolume) || ritual.appearance.guidanceVolume < 0 || ritual.appearance.guidanceVolume > 1) fail();
  }
  if (value.favoriteRitualId !== undefined && !ids.has(value.favoriteRitualId)) fail();
}
