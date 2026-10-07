import type { SessionRecord } from "@inout/shared-types";
import { dayKey, addDays, practiceRecords } from "./progress";
import { productConfig } from "./product-config";

export type AchievementMetric = "sessions" | "minutes" | "protocols" | "calm" | "sleep" | "morning" | "weeks" | "streak";
export interface AchievementDefinition { id: string; title: string; description: string; icon: "air" | "timer" | "explore" | "spa" | "bedtime" | "wb-sunny" | "event-available"; conditionType: AchievementMetric; conditionValue: number; shareable: boolean }
export function achievementDefinitions(): AchievementDefinition[] {
  const c = productConfig.achievementThresholds;
  const define = (id: string, title: string, description: string, icon: AchievementDefinition["icon"], conditionType: AchievementMetric, conditionValue: number): AchievementDefinition => ({ id, title, description, icon, conditionType, conditionValue, shareable: true });
  return [define("sessions-1", "First Breath", "Complete your first breathing session.", "air", "sessions", 1),
    ...c.minutes.map(n => define(`minutes-${n}`, `${n} Minutes`, "Build up time with comfortable breathing.", "timer", "minutes", n)),
    define("streak-7", "7 Day Streak", "Complete a session on seven consecutive days.", "event-available", "streak", 7),
    ...c.sessions.map(n => define(`sessions-${n}`, `${n} Sessions`, "Make a little space for regular practice.", "air", "sessions", n)),
    define("explorer", "Explorer", "Try different in-app protocols.", "explore", "protocols", c.explorer),
    define("calm-practice", "Calm Practice", "Complete sessions with a calm intention.", "spa", "calm", c.calm),
    define("sleep-routine", "Sleep Routine", "Make time for sleep-oriented practice.", "bedtime", "sleep", c.sleep),
    define("early-bird", "Early Bird", "Complete morning sessions before noon.", "wb-sunny", "morning", c.morning),
    define("consistency", "Consistency", "Practice across different calendar weeks.", "event-available", "weeks", c.weeks)];
}
export function qualifyingRecords(records: SessionRecord[], now = new Date()) {
  return [...new Map(practiceRecords(records, now).filter(r => r.endReason === "completed").map(r => [r.id, r])).values()];
}
export function achievementProgress(records: SessionRecord[], now = new Date()) {
  const definitions = achievementDefinitions();
  const totals: Record<AchievementMetric, number> = { sessions: 0, minutes: 0, protocols: 0, calm: 0, sleep: 0, morning: 0, weeks: 0, streak: 0 };
  const protocolIds = new Set<string>(), weeks = new Set<string>();
  const earnedAt = new Map<string, string>();
  let lastDay = "", run = 0;
  for (const r of qualifyingRecords(records, now).sort((a, b) => a.engine.startedAt - b.engine.startedAt || a.id.localeCompare(b.id))) {
    const date = new Date(r.engine.startedAt), day = dayKey(date);
    totals.sessions++; totals.minutes += r.engine.elapsedAtAnchor / 60000;
    if (r.source !== "manual") protocolIds.add(r.protocolId);
    totals.protocols = protocolIds.size;
    const goals = r.protocol?.goalTags ?? [r.goal];
    totals.calm += Number(goals.includes("Calm")); totals.sleep += Number(goals.includes("Sleep"));
    totals.morning += Number(date.getHours() >= 5 && date.getHours() < 12);
    weeks.add(dayKey(addDays(date, -((date.getDay() + 6) % 7)))); totals.weeks = weeks.size;
    if (day !== lastDay) { run = dayKey(addDays(date, -1)) === lastDay ? run + 1 : 1; lastDay = day; }
    totals.streak = Math.max(totals.streak, run);
    for (const definition of definitions) if (!earnedAt.has(definition.id) && totals[definition.conditionType] >= definition.conditionValue) earnedAt.set(definition.id, day);
  }
  return definitions.map(d => ({ ...d, progress: Math.min(d.conditionValue, totals[d.conditionType]), earnedAt: earnedAt.get(d.id) }));
}
