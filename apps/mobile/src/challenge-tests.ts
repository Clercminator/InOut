import type { SessionRecord } from "@inout/shared-types";
import { dayKey } from "./progress";
import { productConfig } from "./product-config";
import type { ChallengeArt, UserChallenge } from "./challenges";

export type TestId = "long-exhale" | "comfort-hold" | "state-shift-60" | "nasal-10";
export interface TestDefinition {
  id: TestId; version: number; title: string; description: string; instructions: string;
  safety: string; duration: string; art: ChallengeArt; type: "benchmark" | "before_after" | "real_world";
  unit: "sec" | "points" | "min"; direction: "higher_is_better" | "lower_is_better"; requiresPro: boolean;
}
const definitions: Omit<TestDefinition, "requiresPro">[] = [
  { id: "long-exhale", version: 1, title: "Long Exhale", description: "Find your comfortable controlled exhale.", instructions: "Sit comfortably. Take a normal breath in, then start and exhale slowly. Finish as soon as your comfortable exhale ends. Breathe normally before retrying.", safety: "Never strain. Stay seated, away from water and driving. Stop immediately if dizzy or uncomfortable. This does not measure lung health.", duration: "One comfortable exhale", art: "waves", type: "benchmark", unit: "sec", direction: "higher_is_better" },
  { id: "comfort-hold", version: 1, title: "Comfort Hold", description: "A repeatable observation, never a maximum hold.", instructions: "Sit safely. Breathe normally. Take one normal breath in and one normal breath out. Start after the exhale. Finish at the FIRST clear desire to breathe, then resume calm normal breathing.", safety: "Not a maximum breath-hold competition. No hyperventilation beforehand. Never in water, while driving or standing somewhere unsafe. Never push through the urge to breathe. Stop immediately if dizzy or uncomfortable. If breath holding is unsuitable for you or you are unsure, skip this test and seek professional guidance.", duration: "Until the first desire to breathe", art: "focus", type: "benchmark", unit: "sec", direction: "higher_is_better" },
  { id: "state-shift-60", version: 1, title: "State Shift 60", description: "Notice what one minute changes for you.", instructions: "Rate your tension, breathe gently for sixty seconds, then rate the same feeling again. A change in either direction is a valid result.", safety: "Self-reported tension, not a medical measurement. Sit safely, never while driving or in water. Stop if dizzy or uncomfortable.", duration: "60 seconds", art: "dawn", type: "before_after", unit: "points", direction: "lower_is_better" },
  { id: "nasal-10", version: 1, title: "Nasal 10", description: "Take your practice on an easy walk.", instructions: "Choose a safe place for an easy ten-minute walk. Breathe through your nose only while it stays comfortable. At the end, confirm how it went. No speed target.", safety: "Easy walking only. Watch your surroundings, not the screen. Return to normal breathing if uncomfortable or breath demand increases. Never hold your breath. Stop somewhere safe before using your phone.", duration: "10 minutes", art: "growth", type: "real_world", unit: "min", direction: "higher_is_better" },
];
export const testDefinition = (id: string) => definitions.find(d => d.id === id);
export const testCatalog = () => definitions.filter(d => !productConfig.disabledChallengeIds.includes(d.id)).map(d => ({ ...d, requiresPro: productConfig.proChallengeIds.includes(d.id) }));
export interface ChallengeAttempt {
  id: string; challengeId: TestId; definitionVersion: number; startedAt: number; finishedAt: number; localDay: string;
  value: number; completed: boolean; before?: number; after?: number;
}
export interface PendingTest {
  id: string; challengeId: "long-exhale" | "comfort-hold" | "nasal-10"; startedAt: number;
  finishedAt?: number; value?: number; localDay?: string;
}
export interface TestStore { version: 1; attempts: ChallengeAttempt[]; pending: PendingTest | null; daily: { day: string; id: string }[]; excluded: TestId[] }
export const emptyTestStore = (): TestStore => ({ version: 1, attempts: [], pending: null, daily: [], excluded: [] });
export interface PersonalBest { metricId: string; direction: TestDefinition["direction"]; unit: string; value: number; timestamp: number; challengeType: string }
export function personalBest(values: { value: number; timestamp: number }[], metric: Omit<PersonalBest, "value" | "timestamp">): PersonalBest | null {
  const valid = values.filter(v => Number.isFinite(v.value) && Number.isFinite(v.timestamp));
  if (!valid.length) return null;
  const best = valid.reduce((a, b) => (metric.direction === "higher_is_better" ? b.value > a.value : b.value < a.value) ? b : a);
  return { ...metric, ...best };
}
export function attemptComparison(a: ChallengeAttempt, history: ChallengeAttempt[]) {
  const d = testDefinition(a.challengeId)!;
  const prior = history.filter(r => r.challengeId === a.challengeId && r.completed && r.id !== a.id && r.finishedAt <= a.startedAt).sort((x, y) => y.finishedAt - x.finishedAt);
  const best = personalBest(prior.map(r => ({ value: r.value, timestamp: r.finishedAt })), { metricId: d.id, direction: d.direction, unit: d.unit, challengeType: d.type });
  const improvement = best ? (d.direction === "higher_is_better" ? a.value - best.value : best.value - a.value) : null;
  // Baselines and subjective state changes are never advertised as competitive PBs.
  const isPersonalBest = a.completed && d.type === "benchmark" && improvement !== null && improvement > 0.049;
  const currentBest = personalBest([...prior, ...(a.completed ? [a] : [])].map(r => ({ value: r.value, timestamp: r.finishedAt })), { metricId: d.id, direction: d.direction, unit: d.unit, challengeType: d.type });
  return { currentBest: currentBest?.value ?? null, previousBest: best?.value ?? null, previousAttempt: prior[0]?.value ?? null, improvement,
    improvementPercent: best && best.value !== 0 && improvement !== null ? improvement / Math.abs(best.value) * 100 : null,
    isPersonalBest, attemptCount: history.filter(r => r.challengeId === a.challengeId && r.finishedAt <= a.finishedAt).length };
}
export function stateShiftAttempt(r: SessionRecord): ChallengeAttempt | null {
  if (r.challengeTest !== "state-shift-60" || r.stage !== "result" || r.endReason !== "completed" || r.pre === null || r.post === null || r.engine.elapsedAtAnchor < 60000 || r.finishedAt === null) return null;
  return { id: r.id, challengeId: "state-shift-60", definitionVersion: 1, startedAt: r.engine.startedAt, finishedAt: r.finishedAt, localDay: r.completionLocalDay ?? dayKey(new Date(r.finishedAt)), value: r.post - r.pre, before: r.pre, after: r.post, completed: true };
}
export function appendAttempt(state: TestStore, attempt: ChallengeAttempt): TestStore {
  if (state.attempts.some(a => a.id === attempt.id)) return state;
  const next = { ...state, attempts: [...state.attempts, attempt] }; validateTestStore(next); return next;
}
export function selectDaily(state: TestStore, pro: boolean, programs: UserChallenge[], now: number): TestStore {
  const day = dayKey(new Date(now));
  const eligible = ["state-shift-60", "long-exhale", "three-by-three", "breath-explorer", "seven-day-calm"].filter(id =>
    !productConfig.disabledChallengeIds.includes(id) && (!productConfig.proChallengeIds.includes(id) || pro) && !state.excluded.includes(id as TestId) && !programs.some(s => s.challengeId === id && s.status === "completed"));
  if (!eligible.length) return { ...state, daily: state.daily.filter(d => d.day !== day) };
  if (state.daily.some(d => d.day === day && eligible.includes(d.id))) return state;
  const recent = state.daily.filter(d => d.day < day).slice(-2).map(d => d.id);
  const pool = eligible.filter(id => !recent.includes(id));
  const choices = pool.length ? pool : eligible;
  const index = Math.floor(Date.parse(day + "T12:00:00Z") / 86400000) % choices.length;
  return { ...state, daily: [...state.daily.filter(d => d.day !== day), { day, id: choices[index] }].sort((a, b) => a.day.localeCompare(b.day)).slice(-30) };
}
export const challengeBadgeDefinitions = [
  { id: "challenge-first", title: "First Challenge", threshold: 1 },
  { id: "challenge-ten", title: "10 Challenges Completed", threshold: 10 },
  { id: "challenge-twenty-five", title: "25 Challenges Completed", threshold: 25 },
] as const;
export function validateTestStore(value: unknown): asserts value is TestStore {
  const s = value as TestStore;
  const date = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v));
  if (!s || s.version !== 1 || !Array.isArray(s.attempts) || !Array.isArray(s.daily) || !Array.isArray(s.excluded) || s.excluded.some(id => !definitions.some(d => d.id === id)) || s.daily.some(d => !date(d.day) || typeof d.id !== "string")) throw Error("Saved challenge results could not be read. Your data has been preserved.");
  for (const a of s.attempts) {
    if (!a || !definitions.some(d => d.id === a.challengeId) || a.definitionVersion !== 1 || !a.id || !Number.isFinite(a.startedAt) || !Number.isFinite(a.finishedAt) || a.finishedAt < a.startedAt || !date(a.localDay) || !Number.isFinite(a.value) || typeof a.completed !== "boolean") throw Error("Invalid challenge result");
    if (a.challengeId === "state-shift-60" ? !Number.isInteger(a.before) || !Number.isInteger(a.after) || a.before! < 1 || a.before! > 10 || a.after! < 1 || a.after! > 10 || a.value !== a.after! - a.before! : a.value < 0 || a.value * (a.challengeId === "nasal-10" ? 60000 : 1000) > a.finishedAt - a.startedAt + 100) throw Error("Invalid challenge measurement");
    if (a.challengeId === "nasal-10" && a.completed && a.value < 10) throw Error("Incomplete walk");
  }
  if (new Set(s.attempts.map(a => a.id)).size !== s.attempts.length) throw Error("Duplicate challenge result");
  if (s.pending && (!s.pending.id || !["long-exhale", "comfort-hold", "nasal-10"].includes(s.pending.challengeId) || !Number.isFinite(s.pending.startedAt) || (s.pending.finishedAt !== undefined && (!Number.isFinite(s.pending.finishedAt) || s.pending.finishedAt < s.pending.startedAt || !Number.isFinite(s.pending.value) || !date(s.pending.localDay))))) throw Error("Invalid pending challenge");
}
