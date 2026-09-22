import type { SessionRecord } from "@inout/shared-types";
import { stateShift } from "@inout/shared-types";
export { practiceDuration as statsDuration } from "./format";

export function periodRecords(records: SessionRecord[], days: number, now = new Date()) {
  const first = new Date(now);
  first.setHours(0, 0, 0, 0);
  first.setDate(first.getDate() - days + 1);
  return records.filter((record) => record.engine.startedAt >= first.getTime() && record.engine.startedAt <= now.getTime());
}

export type StatsPeriod = "Days" | "Weeks" | "Months" | "All time";
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dayStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
function dayNumber(date: Date) { return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000; }
function weekStart(date: Date) { return addDays(date, -((date.getDay() + 6) % 7)); }
export function practiceRecords(records: SessionRecord[], now: Date) {
  return records.filter(r => r.stage === "result" && Number.isFinite(r.engine.elapsedAtAnchor) && r.engine.elapsedAtAnchor > 0 && r.engine.startedAt <= now.getTime());
}
export function summarize(records: SessionRecord[]) {
  const totalMs = records.reduce((sum, r) => sum + r.engine.elapsedAtAnchor, 0);
  const shifts = records.filter(r => r.endReason === "completed").map(r => stateShift(r.pre, r.post)).filter((n): n is number => n !== null);
  return { count: records.length, totalMs, activeDays: new Set(records.map(r => dayKey(new Date(r.engine.startedAt)))).size,
    averageSession: records.length ? totalMs / records.length : 0,
    longestSession: records.reduce((max, r) => Math.max(max, r.engine.elapsedAtAnchor), 0),
    shifts: shifts.length, averageShift: shifts.length ? shifts.reduce((a, b) => a + b, 0) / shifts.length : null };
}
export function breakdown(records: SessionRecord[], by: "goal" | "protocolName" | "source") {
  const groups = new Map<string, SessionRecord[]>();
  for (const r of records) {
    const key = by === "source" ? r.source === "manual" ? "Manual" : "In-app" : r[by];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups].map(([label, rows]) => ({ label, ...summarize(rows) })).sort((a, b) => b.totalMs - a.totalMs || a.label.localeCompare(b.label));
}
export interface Milestone { id: string; label: string; date: string }
export function practiceStats(records: SessionRecord[], now = new Date()) {
  const valid = practiceRecords(records, now);
  const activeDates = [...new Set(valid.map(r => dayKey(new Date(r.engine.startedAt))))].sort();
  const activeDays = new Set(activeDates);
  let best = 0, run = 0, previous = -Infinity;
  const milestones: Milestone[] = [];
  const awarded = new Set<number>();
  activeDates.forEach((key, i) => {
    const [y, m, d] = key.split("-").map(Number);
    const number = dayNumber(new Date(y, m - 1, d));
    run = number === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run); previous = number;
    if (run % 7 === 0 && !awarded.has(run)) {
      awarded.add(run); milestones.push({ id: `streak-${run}`, label: `${run} consecutive days`, date: key });
    }
    if ([1, 10, 25, 50, 100, 250, 500, 1000].includes(i + 1))
      milestones.push({ id: `days-${i + 1}`, label: `${i + 1} practice ${i === 0 ? "day" : "days"}`, date: key });
  });
  let current = 0, cursor = dayStart(now);
  if (!activeDays.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  while (activeDays.has(dayKey(cursor))) { current++; cursor = addDays(cursor, -1); }
  return { ...summarize(valid), records: valid, activeDates, activeDays, current, best,
    milestones: milestones.reverse(), nextMilestone: (Math.floor(current / 7) + 1) * 7 };
}
export interface StatsBucket { key: string; label: string; records: SessionRecord[] }
export function periodStats(records: SessionRecord[], period: StatsPeriod, now = new Date()) {
  const valid = practiceRecords(records, now);
  let start: Date;
  if (period === "Days") start = addDays(now, -13);
  else if (period === "Weeks") start = addDays(weekStart(now), -77);
  else if (period === "Months") start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  else start = valid.length ? dayStart(new Date(valid.reduce((min, r) => Math.min(min, r.engine.startedAt), Infinity))) : dayStart(now);
  const selected = valid.filter(r => r.engine.startedAt >= start.getTime());
  const buckets: StatsBucket[] = [];
  const annual = period === "All time" && (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() > 23;
  let cursor = period === "All time" ? new Date(start.getFullYear(), annual ? 0 : start.getMonth(), 1) : new Date(start);
  while (cursor <= now) {
    const next = period === "Days" ? addDays(cursor, 1) : period === "Weeks" ? addDays(cursor, 7) : new Date(cursor.getFullYear() + (annual ? 1 : 0), cursor.getMonth() + (annual ? 0 : 1), 1);
    buckets.push({ key: dayKey(cursor), label: annual ? String(cursor.getFullYear()) : cursor.toLocaleDateString(undefined, period === "Days" ? { month: "short", day: "numeric" } : period === "Weeks" ? { month: "short", day: "numeric" } : { month: "short", year: "2-digit" }),
      records: selected.filter(r => r.engine.startedAt >= cursor.getTime() && r.engine.startedAt < next.getTime()) });
    cursor = next;
  }
  const summary = summarize(selected);
  return { ...summary, start, records: selected, buckets, unit: period === "Days" ? "day" : period === "Weeks" ? "week" : annual ? "year" : "month", calendarDays: dayNumber(now) - dayNumber(start) + 1,
    averagePerBucket: summary.totalMs / Math.max(1, buckets.length), averageSessionsPerBucket: summary.count / Math.max(1, buckets.length) };
}
