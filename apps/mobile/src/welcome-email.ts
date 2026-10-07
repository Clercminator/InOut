import type { Preferences } from "@inout/shared-types";
export const validEmail = (value: string) => value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
export function welcomeRequest(p: Preferences, installation: string) {
  if (!p.onboardingComplete || !p.welcomeEmail || p.welcomeEmail.status !== "pending" || !validEmail(p.welcomeEmail.email) || !p.welcomeEmail.consentAt) return null;
  return { email: p.welcomeEmail.email, name: p.experience?.name ?? "", goal: p.journey?.primaryGoal ?? "learn", language: p.language ?? "en", consent: true, installation };
}
