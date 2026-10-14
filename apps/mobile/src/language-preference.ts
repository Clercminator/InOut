import type { Preferences } from "@inout/shared-types";

export type AppLanguage = "en" | "es" | "pt";
export function deviceLanguage(tags: readonly string[]): AppLanguage {
  const primary = tags[0]?.trim().toLowerCase().split(/[-_]/)[0];
  return primary === "es" || primary === "pt" ? primary : "en";
}
let detected: AppLanguage = deviceLanguage([Intl.DateTimeFormat().resolvedOptions().locale]);
export const getDeviceLanguage = () => detected;
export function setDeviceLocales(tags: readonly string[]) { detected = deviceLanguage(tags); }
export function languagePreference(p: Pick<Preferences, "language" | "languageSource">): Pick<Preferences, "language" | "languageSource"> {
  // A saved language from an older release may be a manual choice. Preserve it.
  if (p.languageSource !== "device" && ["en", "es", "pt"].includes(p.language ?? ""))
    return { language: p.language, languageSource: "manual" };
  return { language: detected, languageSource: "device" };
}
