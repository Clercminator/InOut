import type { Experience, Preferences, SessionRecord } from "@inout/shared-types";
import { addDays, dayKey, practiceStats } from "./progress";
import { achievementProgress, qualifyingRecords } from "./achievements";

export const defaultExperience: Experience = {
  name: "", bio: "", intention: "A moment for myself", avatar: "spa", pinnedBadges: [], weeklyGoal: 3,
  palette: "sky", texture: "glass", background: "midnight", frame: "simple",
  celebration: "gentle", celebrationStyle: "sparks", chime: "bell", breathSound: "air",
  guidanceVolume: 0.7, celebrationVolume: 0.45, rituals: [],
};
export const experienceFor = (preferences: Preferences): Experience => ({ ...defaultExperience, ...preferences.experience });
export interface Badge { id: string; label: string; date: string }
export interface RewardLedger { version: 1; badges: Badge[]; weekGoals: Record<string, number> }
export const emptyLedger = (): RewardLedger => ({ version: 1, badges: [], weekGoals: {} });
export function weekKey(date: Date) { return dayKey(addDays(date, -((date.getDay() + 6) % 7))); }
export function weeklyPractice(records: SessionRecord[], ledger: RewardLedger, goal: number, now = new Date()) {
  const week = weekKey(now);
  const days = new Set(qualifyingRecords(records, now)
    .filter(r => weekKey(new Date(r.engine.startedAt)) === week).map(r => dayKey(new Date(r.engine.startedAt))));
  return { days, count: days.size, goal: ledger.weekGoals[week] ?? goal, week };
}
export function reconcileRewards(records: SessionRecord[], previous: RewardLedger, goal: number, now = new Date()): RewardLedger {
  const stats = practiceStats(qualifyingRecords(records, now), now);
  const badges = new Map(previous.badges.map(b => [b.id, b]));
  const weekGoals = { ...previous.weekGoals };
  const award = (id: string, label: string, date: string) => { if (!badges.has(id)) badges.set(id, { id, label, date }); };
  for (const badge of achievementProgress(records, now)) if (badge.earnedAt) award(badge.id, badge.title, badge.earnedAt);
  const ordered = [...stats.records].sort((a, b) => a.engine.startedAt - b.engine.startedAt);
  for (const n of [1, 10, 25, 50, 100, 250, 500, 1000]) {
    if (ordered.length >= n) award(`sessions-${n}`, n === 1 ? "First practice" : `${n} sessions`, dayKey(new Date(ordered[n - 1].engine.startedAt)));
  }
  for (const n of [3, 10, 25, 50, 100, 250, 500, 1000]) {
    if (stats.activeDates.length >= n) award(`days-${n}`, `${n} practice days`, stats.activeDates[n - 1]);
  }
  for (const badge of stats.milestones.filter(b => b.id.startsWith("streak-"))) award(badge.id, badge.label, badge.date);
  const weeks = new Map<string, string[]>();
  for (const date of stats.activeDates) {
    const week = weekKey(new Date(date + "T12:00:00"));
    const dates = weeks.get(week) ?? []; dates.push(date); weeks.set(week, dates);
  }
  for (const [week, dates] of weeks) {
    weekGoals[week] ??= goal;
    if (dates.length >= weekGoals[week]) award(`week-${week}`, "Weekly goal complete", dates[weekGoals[week] - 1]);
  }
  return { version: 1, badges: [...badges.values()].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), weekGoals };
}
export const cosmetics = [
  { id: "mint", kind: "palette", label: "Mint palette", badge: "sessions-1", requirement: "Complete your first practice" },
  { id: "halo", kind: "texture", label: "Halo bubble", badge: "days-3", requirement: "Practice on 3 different days" },
  { id: "glow", kind: "frame", label: "Glow frame", badge: "days-3", requirement: "Practice on 3 different days" },
  { id: "dusk", kind: "palette", label: "Dusk palette", badge: "sessions-10", requirement: "Save 10 sessions" },
  { id: "confetti", kind: "celebrationStyle", label: "Confetti celebration", badge: "sessions-10", requirement: "Save 10 sessions" },
  { id: "orbit", kind: "texture", label: "Orbit bubble", badge: "days-10", requirement: "Practice on 10 different days" },
  { id: "sunrise", kind: "palette", label: "Sunrise palette", badge: "days-25", requirement: "Practice on 25 different days" },
  { id: "laurel", kind: "frame", label: "Laurel frame", badge: "sessions-50", requirement: "Save 50 sessions" },
] as const;
export function unlocked(ledger: RewardLedger, kind: string, id: string) {
  const item = cosmetics.find(c => c.kind === kind && c.id === id);
  return !item || ledger.badges.some(b => b.id === item.badge);
}
export function welcomeMessage(records: SessionRecord[], now = new Date()) {
  const last = Math.max(...records.map(r => r.engine.startedAt));
  return Number.isFinite(last) && dayKey(now) >= dayKey(addDays(new Date(last), 3))
    ? "Good to have you back. Start with a short reset — your achievements are still here." : null;
}
