import { validLocalDay } from "./daily-reset";

export type FitnessId = "plank" | "wall-sit" | "push-ups";
export interface PersonalChallengeDefinition {
  id: FitnessId | "daily-reset";
  type: "breathing" | "stopwatch" | "manual";
  unit: "seconds" | "repetitions";
  achievement: "daily-completion" | "self-reported-best";
  title: string;
  instructions: string;
}
export const fitnessChallenges: (PersonalChallengeDefinition & { id: FitnessId })[] = [
  { id: "plank", type: "stopwatch", unit: "seconds", achievement: "self-reported-best", title: "Plank", instructions: "Use a stable surface. Support yourself on forearms and toes, or knees if preferred. Keep a comfortable straight line and breathe normally. Stop when your form or comfort changes." },
  { id: "wall-sit", type: "stopwatch", unit: "seconds", achievement: "self-reported-best", title: "Wall Sit / Static Squat", instructions: "Rest your back against a stable wall, feet on a non-slip surface. Lower only as far as comfortable. Keep breathing normally and stand up whenever you need to." },
  { id: "push-ups", type: "manual", unit: "repetitions", achievement: "self-reported-best", title: "Push-Ups", instructions: "Choose a comfortable variation, using a wall, knees or toes. Move with control and breathe normally. Enter only repetitions you completed; no camera or sensors count them." },
];
export const fitnessDefinition = (id: string) => fitnessChallenges.find(d => d.id === id);
export const fitnessSafety = "Stop for pain, dizziness or unusual symptoms. Rest whenever needed. There is no target you have to reach.";
// Future competitions must supply separate, explicit verification and opt-in evidence.
// Local records never satisfy this boundary and are never uploaded automatically.
export interface VerifiedChallengeSubmission { consent: "explicit-opt-in"; verification: { provider: string; evidenceId: string }; challengeId: string; value: number; unit: PersonalChallengeDefinition["unit"] }
export interface FitnessResult {
  id: string; challengeId: FitnessId; startedAt: number; finishedAt: number; localDay: string; localTime?: string;
  value: number; unit: "seconds" | "repetitions"; note?: string; source: "self-reported";
}
export interface FitnessPending {
  id: string; challengeId: FitnessId; startedAt: number; elapsedMs: number;
  status: "running" | "paused" | "finished"; finishedAt?: number; localDay?: string; localTime?: string; repetitions?: number; note?: string;
}
export interface FitnessStore { version: 1; results: FitnessResult[]; pending: FitnessPending | null }
export const emptyFitness = (): FitnessStore => ({ version: 1, results: [], pending: null });
export function validateFitness(value: unknown): asserts value is FitnessStore {
  const s = value as FitnessStore;
  const noteValid = (n: unknown) => n === undefined || typeof n === "string" && n.length <= 500;
  const localTimeValid = (v: unknown) => v === undefined || typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const timeValid = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (!s || s.version !== 1 || !Array.isArray(s.results) || !(s.pending === null || typeof s.pending === "object" && s.pending)) throw Error("Invalid fitness history");
  for (const r of s.results) {
    const d = r && fitnessDefinition(r.challengeId);
    if (!d || typeof r.id !== "string" || !r.id || !timeValid(r.startedAt) || !timeValid(r.finishedAt) || !validLocalDay(r.localDay) || !localTimeValid(r.localTime) || !Number.isFinite(r.value) || r.value <= 0 || r.unit !== d.unit || r.source !== "self-reported" || !noteValid(r.note) || (d.unit === "repetitions" && (!Number.isSafeInteger(r.value) || r.value > 99999))) throw Error("Invalid fitness result");
  }
  if (new Set(s.results.map(r => r.id)).size !== s.results.length) throw Error("Duplicate fitness result");
  const p = s.pending;
  if (p && (!fitnessDefinition(p.challengeId) || !p.id || !timeValid(p.startedAt) || !Number.isFinite(p.elapsedMs) || p.elapsedMs < 0 || !["running", "paused", "finished"].includes(p.status) || !noteValid(p.note) || !localTimeValid(p.localTime) || (p.repetitions !== undefined && (!Number.isSafeInteger(p.repetitions) || p.repetitions < 0 || p.repetitions > 99999)) || (p.status === "finished" && (!timeValid(p.finishedAt) || !validLocalDay(p.localDay))))) throw Error("Invalid unfinished fitness attempt");
}
export function fitnessBest(results: FitnessResult[], id: FitnessId) {
  return results.filter(r => r.challengeId === id).reduce<FitnessResult | null>((best, r) => !best || r.value > best.value ? r : best, null);
}
export function isFitnessBest(result: FitnessResult, history: FitnessResult[]) {
  const prior = fitnessBest(history.filter(r => r.id !== result.id), result.challengeId);
  return !prior || result.value > prior.value;
}
export function appendFitness(state: FitnessStore, result: FitnessResult): FitnessStore {
  if (state.results.some(r => r.id === result.id)) return state;
  const next = { ...state, results: [...state.results, result], pending: state.pending?.id === result.id ? null : state.pending };
  validateFitness(next); return next;
}
export function fitnessClock(elapsedMs: number) {
  const tenths = Math.floor(Math.max(0, elapsedMs) / 100), seconds = Math.floor(tenths / 10);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.${tenths % 10}`;
}
