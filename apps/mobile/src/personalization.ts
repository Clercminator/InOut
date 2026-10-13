import type { Goal, OnboardingJourney, PracticeGoal, Preferences, SessionRecord } from "@inout/shared-types";
import { protocols, sigh } from "@inout/protocols";

export const goalContent: Record<PracticeGoal, { title: string; icon: "spa" | "bedtime" | "center-focus-strong" | "fitness-center" | "wb-sunny" | "mic" | "air"; situation: Goal; protocolId: string; heading: string; body: string; reminder: string }> = {
  stress: { title: "Reduce stress & anxiety", icon: "spa", situation: "Calm", protocolId: "extended-exhale", heading: "Make room for a calmer moment.", body: "Try an easy inhale and a longer, comfortable exhale. Follow the guide without forcing your breath, then notice how you feel. There is no score to beat.", reminder: "A few quiet breaths, when it suits you." },
  sleep: { title: "Sleep better", icon: "bedtime", situation: "Sleep", protocolId: "coherent", heading: "Ease into your evening.", body: "A gentle, repeatable rhythm can be part of your wind-down routine. Keep the breath comfortable and let the guide do the counting.", reminder: "Ready for your evening wind-down?" },
  focus: { title: "Improve focus", icon: "center-focus-strong", situation: "Focus", protocolId: "box", heading: "One rhythm. One thing at a time.", body: "Give your attention a simple pattern to follow before your next task. Keep holds easy; return to natural breathing whenever you need to.", reminder: "A breathing pause before your next task." },
  performance: { title: "Performance & recovery", icon: "fitness-center", situation: "Recover", protocolId: "diaphragmatic", heading: "Reset between efforts.", body: "Settle into an unforced rhythm before or after your activity. Start with foundational breathing and explore other protocols at your own pace.", reminder: "Make time for an easy breathing reset." },
  energy: { title: "Increase energy", icon: "wb-sunny", situation: "Energize", protocolId: "equal", heading: "Begin with intention.", body: "Take a short, attentive pause before moving into your day. Follow an even rhythm and notice what feels comfortable for you.", reminder: "A fresh moment for your breathing practice." },
  pressure: { title: "Prepare for high-pressure moments", icon: "mic", situation: "Perform", protocolId: "box", heading: "Find your rhythm before the moment.", body: "Use a familiar cadence before a presentation or demanding task. Practice seated, keep holds comfortable, and finish with natural breathing.", reminder: "Find your rhythm before the next moment." },
  learn: { title: "Learn to control my breathing", icon: "air", situation: "Calm", protocolId: "diaphragmatic", heading: "Get to know your breath.", body: "Start with a simple, gentle pattern. The guide shows when to breathe in and out. You can adjust the duration and skip any optional check-in.", reminder: "A small moment to get to know your breath." },
};
export const practiceGoals = Object.keys(goalContent) as PracticeGoal[];
export function journeyFor(p: Preferences): OnboardingJourney {
  return p.journey ?? { version: 1, step: p.onboardingComplete ? "complete" : "welcome", secondaryGoals: [] };
}
export function completeJourney(p: Preferences, now: number): Preferences {
  const journey = journeyFor(p);
  return { ...p, onboardingComplete: true, journey: { ...journey, step: "complete", completedAt: journey.completedAt ?? now } };
}
export function validateJourney(j: OnboardingJourney) {
  if (!j || j.version !== 1 || !["welcome", "goals", "value", "safety", "offer", "complete"].includes(j.step) ||
    (j.primaryGoal !== undefined && !practiceGoals.includes(j.primaryGoal)) || !Array.isArray(j.secondaryGoals) ||
    j.secondaryGoals.length > 6 || j.secondaryGoals.some(g => !practiceGoals.includes(g)) ||
    [j.safetyAcceptedAt, j.completedAt].some(n => n !== undefined && (!Number.isFinite(n) || n < 0))) throw Error("Saved onboarding could not be read.");
}
export function recommendPractice(goal: PracticeGoal = "stress", records: SessionRecord[] = [], allowed: (id: string) => boolean = () => true) {
  const content = goalContent[goal];
  const recent = [...records].filter(r => r.endReason === "completed" && r.source !== "manual").sort((a, b) => b.engine.startedAt - a.engine.startedAt);
  // A familiar gentle practice takes priority after at least two completions. Never recommend high intensity by default.
  const familiar = protocols.find(p => p.intensity === "gentle" && p.goalTags.includes(content.situation) && allowed(p.id) && recent.slice(0, 10).filter(r => r.protocolId === p.id).length >= 2);
  return familiar ?? protocols.find(p => p.id === content.protocolId && allowed(p.id)) ?? protocols.find(p => p.intensity === "gentle" && allowed(p.id)) ?? sigh;
}
