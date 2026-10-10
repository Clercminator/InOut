import type { Goal, SessionRecord } from "@inout/shared-types";
import { protocols } from "@inout/protocols";
import { dayKey } from "./progress";
import { productConfig } from "./product-config";

export type ChallengeArt = "dawn" | "waves" | "moon" | "focus" | "explore" | "growth";
export interface ChallengeDefinition {
  version?: number;
  id: string; title: string; description: string; artKey: ChallengeArt; category: string;
  durationDays: number | null; targetCount: number; requiresPro: boolean; safetyLevel: "gentle";
  sortOrder: number; enabled: boolean; recommendedProtocolIds: string[];
  qualificationRules: { mode: "sequence" | "days" | "unique" | "sessions"; goal?: Goal; minSeconds: number; windowDays?: number };
  time: string; whatCounts: string;
}
const legacyDefinitions: ChallengeDefinition[] = [
  { id: "first-breath", title: "First Breath", description: "Three gentle rhythms. A little space to begin.", artKey: "dawn", category: "Foundations", durationDays: null, targetCount: 3, requiresPro: false, safetyLevel: "gentle", sortOrder: 0, enabled: true, recommendedProtocolIds: ["diaphragmatic", "extended-exhale", "coherent"], qualificationRules: { mode: "sequence", minSeconds: 60 }, time: "3 sessions · 2–3 min each", whatCounts: "Complete Diaphragmatic, Extended Exhale, then Coherent breathing, in order. At least one minute per practice." },
  { id: "seven-day-calm", title: "7-Day Calm", description: "Make a small pocket of calm part of your day.", artKey: "waves", category: "Calm", durationDays: 7, targetCount: 7, requiresPro: false, safetyLevel: "gentle", sortOrder: 1, enabled: true, recommendedProtocolIds: ["extended-exhale", "coherent", "physiological-sigh", "bhramari"], qualificationRules: { mode: "days", goal: "Calm", minSeconds: 40 }, time: "7 practice days · 1–3 min/day", whatCounts: "One completed Calm practice per local calendar day, lasting at least 40 seconds. Missed days do not reset your progress." },
  { id: "sleep-reset", title: "Sleep Reset", description: "Build a consistent wind-down routine.", artKey: "moon", category: "Sleep", durationDays: 7, targetCount: 7, requiresPro: true, safetyLevel: "gentle", sortOrder: 2, enabled: true, recommendedProtocolIds: ["extended-exhale", "4-7-8"], qualificationRules: { mode: "days", goal: "Sleep", minSeconds: 60 }, time: "7 practice days · 2–3 min/day", whatCounts: "One completed Sleep practice per local calendar day, lasting at least one minute. Any time of day counts." },
  { id: "focus-week", title: "Focus Week", description: "Find a steady rhythm before your next task.", artKey: "focus", category: "Focus", durationDays: null, targetCount: 5, requiresPro: true, safetyLevel: "gentle", sortOrder: 3, enabled: true, recommendedProtocolIds: ["box", "equal", "nadi-shodhana"], qualificationRules: { mode: "sessions", goal: "Focus", minSeconds: 60 }, time: "5 sessions · 2–3 min each", whatCounts: "Complete five Focus practices, lasting at least one minute each. Practice at your own pace." },
  { id: "breath-explorer", title: "Breath Explorer", description: "Discover five different ways to find your rhythm.", artKey: "explore", category: "Discovery", durationDays: null, targetCount: 5, requiresPro: false, safetyLevel: "gentle", sortOrder: 4, enabled: true, recommendedProtocolIds: ["diaphragmatic", "extended-exhale", "coherent", "box", "equal"], qualificationRules: { mode: "unique", minSeconds: 40 }, time: "5 different protocols · your pace", whatCounts: "Complete five different gentle in-app protocols, lasting at least 40 seconds each. Each protocol counts once." },
  { id: "consistency", title: "Consistency", description: "Keep showing up, with room for life in between.", artKey: "growth", category: "Consistency", durationDays: 21, targetCount: 14, requiresPro: true, safetyLevel: "gentle", sortOrder: 5, enabled: true, recommendedProtocolIds: ["coherent", "extended-exhale", "diaphragmatic"], qualificationRules: { mode: "sessions", minSeconds: 60, windowDays: 21 }, time: "14 sessions · within 21 days", whatCounts: "Complete 14 gentle practices of at least one minute within 21 local calendar days. Rest days are welcome." },
];
const definitions: ChallengeDefinition[] = legacyDefinitions.map(d => {
  if (d.id === "sleep-reset") return { ...d, version: 2, targetCount: 5, qualificationRules: { ...d.qualificationRules, windowDays: 7 }, time: "5 nights · within 7 days", whatCounts: "Complete a Sleep practice of at least one minute on five different days within seven local calendar days." };
  if (d.id === "focus-week") return { ...d, version: 2, targetCount: 4, durationDays: 7, qualificationRules: { ...d.qualificationRules, windowDays: 7 }, time: "4 sessions · within 7 days", whatCounts: "Complete four Focus practices of at least one minute within seven local calendar days." };
  if (d.id === "consistency") return { ...d, version: 2, title: "Consistency 10", targetCount: 10, durationDays: 14, qualificationRules: { ...d.qualificationRules, mode: "days", windowDays: 14 }, time: "10 days · within 14 days", whatCounts: "Complete a gentle practice of at least one minute on ten different days within fourteen local calendar days. Days need not be consecutive." };
  return { ...d, version: 1 };
});
definitions.push({ id: "three-by-three", version: 1, title: "3×3", description: "Three minutes a day. Three days for yourself.", artKey: "dawn", category: "Foundations", durationDays: 3, targetCount: 3, requiresPro: false, safetyLevel: "gentle", sortOrder: -1, enabled: true, recommendedProtocolIds: ["coherent", "diaphragmatic", "extended-exhale"], qualificationRules: { mode: "days", minSeconds: 180 }, time: "3 minutes a day · 3 days", whatCounts: "Complete a gentle in-app protocol for at least three minutes on three different local calendar days. Rest days are welcome." });
export function definitionForState(d: ChallengeDefinition, state?: UserChallenge): ChallengeDefinition {
  if (state && (state.definitionVersion ?? 1) !== (d.version ?? 1)) {
    const legacy = legacyDefinitions.find(old => old.id === d.id);
    if (legacy && (state.definitionVersion ?? 1) === 1) return { ...legacy, version: 1, requiresPro: d.requiresPro };
    throw Error("This challenge needs a newer version of IN/OUT.");
  }
  return d;
}
export function challengeCatalog() {
  return definitions.map(d => ({ ...d, requiresPro: productConfig.proChallengeIds.includes(d.id), enabled: !productConfig.disabledChallengeIds.includes(d.id) })).filter(d => d.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}
export interface ChallengeStep { sessionId: string; protocolId: string; localDay: string; finishedAt: number; elapsedMs: number }
export interface UserChallenge {
  definitionVersion?: number;
  challengeId: string; startedAt: number; startedLocalDay: string; completedAt: number | null;
  progress: number; completedSteps: ChallengeStep[]; processedSessionIds: string[];
  lastQualifiedAt: number | null; status: "active" | "completed"; celebrationSeen: boolean;
}
export type ChallengeStatus = "not_started" | UserChallenge["status"];
export function enrollChallenge(id: string, states: UserChallenge[], pro: boolean, now: number): UserChallenge[] {
  const d = challengeCatalog().find(d => d.id === id);
  if (!d || (d.requiresPro && !pro)) throw Error("This challenge requires InOut Pro.");
  const existing = states.find(s => s.challengeId === id);
  if (existing && !challengeExpired(d, existing, now)) return states;
  return [...states.filter(s => s.challengeId !== id), { challengeId: id, definitionVersion: d.version ?? 1, startedAt: now, startedLocalDay: dayKey(new Date(now)), completedAt: null, progress: 0, completedSteps: [], processedSessionIds: [], lastQualifiedAt: null, status: "active", celebrationSeen: false }];
}
function ordinal(day: string) { return Date.parse(day + "T12:00:00Z") / 86400000; }
export function challengeExpired(d: ChallengeDefinition, s: UserChallenge, now = Date.now()) {
  d = definitionForState(d, s);
  return s.status !== "completed" && !!d.qualificationRules.windowDays && ordinal(dayKey(new Date(now))) - ordinal(s.startedLocalDay) >= d.qualificationRules.windowDays;
}
// Credits freeze the local completion date at ingestion, so travel cannot move an earned day.
// Reconciliation only ingests newly saved results; enrollment never scans past history.
export function reconcileChallenges(states: UserChallenge[], records: SessionRecord[], pro: boolean, now = Date.now()): UserChallenge[] {
  return states.map(previous => {
    const current = challengeCatalog().find(d => d.id === previous.challengeId);
    if (!current || previous.status === "completed") return previous;
    const d = definitionForState(current, previous);
    const s = { ...previous, completedSteps: [...previous.completedSteps], processedSessionIds: [...previous.processedSessionIds] };
    for (const r of [...records].sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0) || a.id.localeCompare(b.id))) {
      if (s.status === "completed" || r.stage !== "result" || r.engine.startedAt < s.startedAt || s.processedSessionIds.includes(r.id)) continue;
      const finished = r.finishedAt;
      if (!Number.isFinite(finished) || finished! > now || finished! < r.engine.startedAt) continue;
      s.processedSessionIds.push(r.id);
      const rules = d.qualificationRules;
      const day = r.completionLocalDay && /^\d{4}-\d{2}-\d{2}$/.test(r.completionLocalDay) ? r.completionLocalDay : dayKey(new Date(finished!));
      if ((d.requiresPro && !pro) || r.endReason !== "completed" || r.source === "manual" || !r.protocol || !protocols.some(p => p.id === r.protocolId && p.intensity !== "high") || r.protocol.intensity === "high" || r.protocol.plan || !Number.isFinite(r.engine.elapsedAtAnchor) || r.engine.elapsedAtAnchor < rules.minSeconds * 1000 || r.engine.elapsedAtAnchor > finished! - r.engine.startedAt + 1000) continue;
      if (ordinal(day) < ordinal(s.startedLocalDay)) continue;
      if (rules.windowDays && ordinal(day) - ordinal(s.startedLocalDay) >= rules.windowDays) continue;
      if (rules.goal && !r.protocol.goalTags.includes(rules.goal)) continue;
      if (rules.mode === "days" && s.completedSteps.some(step => step.localDay === day)) continue;
      if (rules.mode === "unique" && s.completedSteps.some(step => step.protocolId === r.protocolId)) continue;
      if (rules.mode === "sequence" && r.protocolId !== d.recommendedProtocolIds[s.progress]) continue;
      // Overlapping or replayed completions cannot manufacture practice credit.
      if (s.lastQualifiedAt !== null && r.engine.startedAt < s.lastQualifiedAt) continue;
      s.completedSteps.push({ sessionId: r.id, protocolId: r.protocolId, localDay: day, finishedAt: finished!, elapsedMs: r.engine.elapsedAtAnchor });
      s.progress = s.completedSteps.length; s.lastQualifiedAt = finished!;
      if (s.progress >= d.targetCount) { s.status = "completed"; s.completedAt = finished!; }
    }
    return s;
  });
}
export function challengeShareable(d: ChallengeDefinition, s?: UserChallenge) {
  d = definitionForState(d, s);
  return !!s && (s.status === "completed" || s.progress >= Math.ceil(d.targetCount / 2) || (d.targetCount >= 7 && s.progress >= 3));
}
export function validateChallenges(value: unknown): asserts value is UserChallenge[] {
  if (!Array.isArray(value) || value.some(s => !s || typeof s.challengeId !== "string" || !Number.isFinite(s.startedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(s.startedLocalDay) || !["active", "completed"].includes(s.status) || typeof s.celebrationSeen !== "boolean" || !Array.isArray(s.processedSessionIds) || s.processedSessionIds.some((id: unknown) => typeof id !== "string") || !Array.isArray(s.completedSteps) || s.progress !== s.completedSteps.length || !Number.isInteger(s.progress) || s.completedSteps.some((step: ChallengeStep) => !step || typeof step.sessionId !== "string" || typeof step.protocolId !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(step.localDay) || !Number.isFinite(step.finishedAt) || !Number.isFinite(step.elapsedMs) || step.elapsedMs <= 0) || (s.completedAt !== null && !Number.isFinite(s.completedAt)) || (s.lastQualifiedAt !== null && !Number.isFinite(s.lastQualifiedAt))) || new Set(value.map(s => s.challengeId)).size !== value.length) throw Error("Saved challenges could not be read. Your data has been preserved.");
  for (const state of value as UserChallenge[]) {
    if (state.definitionVersion !== undefined && (!Number.isInteger(state.definitionVersion) || state.definitionVersion < 1)) throw Error("Invalid challenge version");
    const last = state.completedSteps.at(-1);
    if (new Set(state.completedSteps.map(step => step.sessionId)).size !== state.progress ||
      state.completedSteps.some(step => !state.processedSessionIds.includes(step.sessionId) || step.finishedAt < state.startedAt) ||
      state.lastQualifiedAt !== (last?.finishedAt ?? null) ||
      (state.status === "completed" ? !last || state.completedAt !== last.finishedAt : state.completedAt !== null)) throw Error("Saved challenges could not be read. Your data has been preserved.");
  }
}
