import type { SessionRecord } from "@inout/shared-types";
import { addDays, dayKey, dayStart, practiceRecords, summarize } from "./progress";
export const insightPolicy = { windowDays: 30, minimumPairs: 5, minimumDays: 3 } as const;
export function practiceInsights(records: SessionRecord[], now = new Date()) {
  const valid = practiceRecords(records, now);
  const weekStart = addDays(dayStart(now), -6).getTime();
  const previousStart = addDays(dayStart(now), -13).getTime();
  const since = addDays(dayStart(now), -(insightPolicy.windowDays - 1)).getTime();
  const recent = valid.filter(r => r.engine.startedAt >= since);
  const completed = recent.filter(r => r.source !== "manual" && r.endReason === "completed");
  const groups = new Map<string, SessionRecord[]>();
  for (const record of completed) {
    const key = JSON.stringify([record.protocolId, record.protocolVersion, record.engine.plan]);
    const group = groups.get(key) ?? []; group.push(record); groups.set(key, group);
  }
  const patterns = [...groups].map(([key, rows]) => {
    const paired = rows.filter(r => r.pre !== null && r.post !== null);
    const days = new Set(paired.map(r => dayKey(new Date(r.engine.startedAt)))).size;
    const shifts = paired.map(r => r.pre! - r.post!).sort((a, b) => a - b);
    const enough = shifts.length >= insightPolicy.minimumPairs && days >= insightPolicy.minimumDays;
    const mid = Math.floor(shifts.length / 2);
    const median = enough ? shifts.length % 2 ? shifts[mid] : (shifts[mid - 1] + shifts[mid]) / 2 : null;
    return { key, record: rows[0], sessions: rows.length, pairs: paired.length, days, median,
      lower: shifts.filter(n => n > 0).length, same: shifts.filter(n => n === 0).length, higher: shifts.filter(n => n < 0).length };
  }).sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key));
  const mostUsed = patterns[0]?.sessions >= 3 ? patterns[0] : null;
  return { since: new Date(since), patterns, mostUsed,
    currentWeek: summarize(valid.filter(r => r.engine.startedAt >= weekStart)),
    previousWeek: summarize(valid.filter(r => r.engine.startedAt >= previousStart && r.engine.startedAt < weekStart)),
  };
}
