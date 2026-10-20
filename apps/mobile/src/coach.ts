import { protocols } from "@inout/protocols";
import type { PracticeGoal, Preferences, SessionRecord } from "@inout/shared-types";
import { addDays, dayKey } from "./progress";
import { experienceFor } from "./experience";
import { goalForDay, recommendPractice, selectedGoals } from "./personalization";

export const coachProtocolIds = ["diaphragmatic", "coherent", "extended-exhale", "equal", "box", "sleep-wind-down", "post-workout-reset"] as const;
export type CoachProtocolId = typeof coachProtocolIds[number];
export type ProgramId = "find-your-rhythm" | "evening-wind-down" | "focus-on-demand" | "build-your-practice";
export type CoachSession = { enrollmentId: string; step: number } | { week: string; date: string };
export interface ProgramStep { protocolId: CoachProtocolId; seconds: number; explanation: string }
export interface ProgramDefinition { id: ProgramId; title: string; goal: PracticeGoal; days: number; description: string; steps: ProgramStep[] }
const createSteps = (days: number, sequence: CoachProtocolId[], explanation: string) => Array.from({ length: days }, (_, i) => ({
  protocolId: sequence[i % sequence.length], seconds: i < 3 ? 120 : i < 7 ? 180 : 300, explanation,
}));
export const programs: ProgramDefinition[] = [
  { id: "find-your-rhythm", title: "Find Your Rhythm", goal: "learn", days: 7,
    description: "Seven gentle practice days to explore a rhythm you enjoy.",
    steps: createSteps(7, ["diaphragmatic", "coherent", "extended-exhale", "equal"], "Explore an approved, gentle rhythm. Keep your breath easy and unforced.") },
  { id: "evening-wind-down", title: "Evening Wind Down", goal: "sleep", days: 14,
    description: "A repeatable breathing pause for your evening routine.",
    steps: createSteps(14, ["extended-exhale", "coherent", "diaphragmatic"], "Make space to settle into your evening. Comfort matters more than completing the timer.") },
  { id: "focus-on-demand", title: "Focus on Demand", goal: "focus", days: 14,
    description: "Build a familiar breathing pause before your next task.",
    steps: createSteps(14, ["equal", "box", "coherent"], "Give your attention a familiar rhythm. Keep any holds comfortable; return to natural breathing whenever needed.") },
  { id: "build-your-practice", title: "Build Your Practice", goal: "learn", days: 21,
    description: "Explore, repeat, and make room for a sustainable practice.",
    steps: createSteps(21, ["diaphragmatic", "equal", "coherent", "extended-exhale"], "Repeat a gentle practice at a comfortable length. Missed days never erase your progress.") },
];
export interface ProgramEnrollment {
  id: string; programId: ProgramId; startedAt: number; status: "active" | "paused" | "completed";
  completed: { step: number; sessionId: string; date: string }[];
  deferUntil?: string;
}
export interface WeekEntry { date: string; protocolId: CoachProtocolId; cycles: number; status: "planned" | "rest" | "skipped" | "completed"; sessionId?: string }
export interface CoachState {
  version: 1; availableMinutes: number; useFeedback: boolean; activeEnrollmentId?: string;
  enrollments: ProgramEnrollment[];
  week?: { start: string; paused: boolean; entries: WeekEntry[] };
}
export const emptyCoach = (): CoachState => ({ version: 1, availableMinutes: 3, useFeedback: false, enrollments: [] });
export const programFor = (id: string) => programs.find(p => p.id === id);
export const coachProtocol = (id: string) => coachProtocolIds.includes(id as CoachProtocolId) ? protocols.find(p => p.id === id)! : null;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (value: unknown): value is string => typeof value === "string" && datePattern.test(value) && dayKey(new Date(value + "T12:00:00")) === value;
export function validateCoach(value: unknown): CoachState {
  const s = value as CoachState;
  if (!s || s.version !== 1 || !Number.isInteger(s.availableMinutes) || s.availableMinutes < 1 || s.availableMinutes > 10 || typeof s.useFeedback !== "boolean" || !Array.isArray(s.enrollments) || s.enrollments.length > 200) throw Error("Invalid coach state");
  const ids = new Set<string>();
  for (const e of s.enrollments) {
    const p = programFor(e.programId);
    if (!p || typeof e.id !== "string" || !e.id || ids.has(e.id) || !Number.isFinite(e.startedAt) || e.startedAt < 0 || !["active", "paused", "completed"].includes(e.status) || !Array.isArray(e.completed) || e.completed.length > p.days || (e.deferUntil !== undefined && !isDate(e.deferUntil))) throw Error("Invalid program enrollment");
    ids.add(e.id);
    if (new Set(e.completed.map(c => c.sessionId)).size !== e.completed.length || new Set(e.completed.map(c => c.date)).size !== e.completed.length || e.completed.some((c, i) => c.step !== i || typeof c.sessionId !== "string" || !c.sessionId || !isDate(c.date))) throw Error("Invalid program progress");
    if ((e.status === "completed") !== (e.completed.length === p.days)) throw Error("Invalid completion state");
  }
  if (s.activeEnrollmentId !== undefined && !ids.has(s.activeEnrollmentId)) throw Error("Invalid current program");
  if (s.enrollments.some(e => e.status === "active" && e.id !== s.activeEnrollmentId)) throw Error("Multiple active programs");
  if (s.week) {
    if (!isDate(s.week.start) || typeof s.week.paused !== "boolean" || !Array.isArray(s.week.entries) || s.week.entries.length !== 7) throw Error("Invalid weekly plan");
    s.week.entries.forEach((e, i) => {
      const protocol = coachProtocol(e.protocolId);
      if (!protocol || e.date !== dayKey(addDays(new Date(s.week!.start + "T12:00:00"), i)) || !Number.isInteger(e.cycles) || e.cycles < 1 || e.cycles * cycleMs(e.protocolId) > 600000 || !["planned", "rest", "skipped", "completed"].includes(e.status) || (e.status === "completed" && typeof e.sessionId !== "string")) throw Error("Invalid weekly session");
    });
  }
  return s;
}
export function enrollProgram(state: CoachState, programId: string, id: string, now: number): CoachState {
  const program = programFor(programId);
  if (!program) throw Error("Unknown program");
  const existing = state.enrollments.find(e => e.programId === programId && e.status !== "completed");
  const selected = existing ?? { id, programId: program.id, startedAt: now, status: "active" as const, completed: [] };
  const enrollments = [...state.enrollments.filter(e => e.id !== selected.id).map(e => e.status === "active" ? { ...e, status: "paused" as const } : e), { ...selected, status: "active" as const }];
  return validateCoach({ ...state, activeEnrollmentId: selected.id, enrollments });
}
const cycleMs = (id: CoachProtocolId) => coachProtocol(id)!.phases.reduce((sum, p) => sum + p.durationMs, 0);
export function comfortableCycles(id: CoachProtocolId, seconds: number) {
  return Math.max(1, Math.floor(Math.min(600, Math.max(60, Number.isFinite(seconds) ? seconds : 60)) * 1000 / cycleMs(id)));
}
export interface CoachRecommendation { protocolId: CoachProtocolId; cycles: number; seconds: number; reason: string; goal: PracticeGoal }
export function dailyRecommendation(preferences: Preferences, history: SessionRecord[], state: CoachState, now: number, goal = goalForDay(preferences, now)): CoachRecommendation {
  const recent = history.filter(r => r.source !== "manual" && r.finishedAt !== null && r.finishedAt <= now && r.finishedAt >= now - 7 * 86400000).sort((a, b) => b.finishedAt! - a.finishedAt! || a.id.localeCompare(b.id));
  const comfortable = recent[0]?.endReason === "unwell" || (state.useFeedback && recent[0]?.pre !== null && recent[0]?.post !== null && recent[0]?.post! > recent[0]?.pre!);
  const suggested = recommendPractice(goal, history.filter(r => r.finishedAt !== null && r.finishedAt <= now), id => !!coachProtocol(id));
  const favorite = preferences.favoriteProtocolIds?.find(id => coachProtocol(id)?.goalTags.includes(suggested.goalTags[0]));
  const protocolId = (comfortable ? "diaphragmatic" : favorite ?? suggested.id) as CoachProtocolId;
  const planned = Math.min(state.availableMinutes * 60, recent.length >= 3 ? 300 : 180);
  const seconds = comfortable ? 60 : planned;
  const cycles = comfortableCycles(protocolId, seconds);
  return { protocolId, cycles, seconds: cycles * cycleMs(protocolId) / 1000, goal,
    reason: comfortable ? "A shorter, gentle option after your recent feedback. Stop whenever you need to."
      : favorite ? "A saved rhythm that fits your goal and available time."
        : recent.length ? "A familiar, approved practice that fits your goal and available time." : "A short, approved practice based on your onboarding goal." };
}
export function programSession(state: CoachState, enrollmentId: string, step: number, repeat: boolean, today: string) {
  const enrollment = state.enrollments.find(e => e.id === enrollmentId);
  const program = enrollment && programFor(enrollment.programId);
  if (!program || !enrollment || state.activeEnrollmentId !== enrollmentId || enrollment.status === "paused" || !Number.isInteger(step)) return null;
  const definition = program.steps[step];
  if (!definition || (repeat ? step >= enrollment.completed.length : enrollment.status !== "active" || step !== enrollment.completed.length || (enrollment.deferUntil ?? "") > today || (enrollment.completed.at(-1)?.date ?? "") >= today)) return null;
  const cycles = comfortableCycles(definition.protocolId, Math.min(definition.seconds, state.availableMinutes * 60));
  return { ...definition, cycles, seconds: cycles * cycleMs(definition.protocolId) / 1000 };
}
/** Called in the same SQLite transaction as a completed result. Replays are idempotent. */
export function recordCoachSession(state: CoachState, record: SessionRecord): CoachState {
  const tag = record.coach;
  if (!tag || record.stage !== "result" || record.endReason !== "completed" || record.source === "manual" || !record.finishedAt || record.engine.elapsedAtAnchor < 1000 || !coachProtocol(record.protocolId)) return state;
  const date = record.completionLocalDay ?? dayKey(new Date(record.finishedAt));
  if ("enrollmentId" in tag) {
    const enrollment = state.enrollments.find(e => e.id === tag.enrollmentId);
    const step = enrollment && programFor(enrollment.programId)?.steps[tag.step];
    if (!enrollment || !step || enrollment.status !== "active" || tag.step !== enrollment.completed.length || step.protocolId !== record.protocolId || record.engine.startedAt < enrollment.startedAt || enrollment.completed.some(c => c.sessionId === record.id || c.date >= date)) return state;
    const completed = [...enrollment.completed, { step: tag.step, sessionId: record.id, date }];
    return { ...state, enrollments: state.enrollments.map(e => e.id === enrollment.id ? { ...e, completed, deferUntil: undefined, status: completed.length === programFor(e.programId)!.days ? "completed" : "active" } : e) };
  }
  // A practice that crosses midnight still belongs to the day it was started.
  if (state.week?.start !== tag.week || tag.date !== dayKey(new Date(record.engine.startedAt))) return state;
  return { ...state, week: { ...state.week, entries: state.week.entries.map(e => e.date === tag.date && e.status === "planned" && e.protocolId === record.protocolId ? { ...e, status: "completed", sessionId: record.id } : e) } };
}
export function generateWeek(preferences: Preferences, history: SessionRecord[], state: CoachState, now: number): NonNullable<CoachState["week"]> {
  const first = new Date(now); first.setHours(12, 0, 0, 0);
  const frequency = experienceFor(preferences).weeklyGoal;
  return { start: dayKey(first), paused: false, entries: Array.from({ length: 7 }, (_, i) => {
    const recommendation = dailyRecommendation(preferences, history, state, addDays(first, i).getTime());
    return {
    date: dayKey(addDays(first, i)), protocolId: recommendation.protocolId, cycles: recommendation.cycles,
    status: Math.floor((i + 1) * frequency / 7) > Math.floor(i * frequency / 7) ? "planned" : "rest",
  }; }) };
}
export function weeklyReview(history: SessionRecord[], now: number) {
  const recent = history.filter(r => r.stage === "result" && r.endReason === "completed" && r.finishedAt !== null && r.finishedAt <= now && r.finishedAt >= now - 7 * 86400000);
  return { sessions: recent.length, minutes: Math.floor(recent.reduce((sum, r) => sum + r.engine.elapsedAtAnchor, 0) / 60000), days: new Set(recent.map(r => r.completionLocalDay ?? dayKey(new Date(r.finishedAt!)))).size };
}

const programGoals: Record<ProgramId, PracticeGoal[]> = {
  "find-your-rhythm": ["learn", "stress"],
  "evening-wind-down": ["sleep", "stress"],
  "focus-on-demand": ["focus", "pressure"],
  "build-your-practice": ["learn", "performance", "energy"],
};
export function discoverPrograms(preferences: Preferences) {
  const goals = selectedGoals(preferences);
  return programs.map(program => ({ ...program, matchedGoals: goals.filter(goal => programGoals[program.id].includes(goal)) }))
    .sort((a, b) => b.matchedGoals.length - a.matchedGoals.length || programs.indexOf(programFor(a.id)!) - programs.indexOf(programFor(b.id)!));
}
export function programDuration(program: ProgramDefinition, availableMinutes: number) {
  const seconds = program.steps.map(step => comfortableCycles(step.protocolId, Math.min(step.seconds, availableMinutes * 60)) * cycleMs(step.protocolId) / 1000);
  return { min: Math.min(...seconds), max: Math.max(...seconds) };
}
