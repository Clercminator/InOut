import type { OnboardingJourney } from "@inout/shared-types";
export const onboardingSteps = ["welcome", "goals", "safety", "demo", "offer"] as const;
export type OnboardingStep = typeof onboardingSteps[number];
export function onboardingStep(journey: OnboardingJourney): OnboardingStep {
  // Resume older journeys without repeating an answered goal question.
  if (journey.step === "personalize") return "safety";
  if (journey.step === "value" || journey.step === "complete") return journey.safetyAcceptedAt ? "demo" : "safety";
  if (["demo", "offer"].includes(journey.step) && !journey.safetyAcceptedAt) return "safety";
  return journey.step as OnboardingStep;
}
export function previousOnboardingStep(journey: OnboardingJourney): OnboardingStep | undefined {
  const step = onboardingStep(journey);
  if (step === "welcome") return undefined;
  if (step === "safety" && journey.quickStart) return "welcome";
  return onboardingSteps[onboardingSteps.indexOf(step) - 1];
}
export function canAdvanceOnboarding(journey: OnboardingJourney, goalCount: number, gesture: boolean) {
  const step = onboardingStep(journey);
  return !(step === "goals" && goalCount === 0) && !(step === "safety" && gesture && !journey.safetyAcceptedAt);
}
