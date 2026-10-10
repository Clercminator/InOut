import test from "node:test";
import assert from "node:assert/strict";
import { periodRecords } from "../apps/mobile/src/progress";
import type { SessionRecord } from "../packages/shared-types/src/index";
import { addDays, breakdown, dayKey, periodStats, practiceStats } from "../apps/mobile/src/progress";
import { manualSession, parseLocalDateTime } from "../apps/mobile/src/manual-session";
import { practiceDuration } from "../apps/mobile/src/format";
import { chartLayout, chartColors } from "../apps/mobile/src/chart-layout";

test("readable durations preserve hours, minutes and seconds consistently", () => {
  assert.equal(practiceDuration(0), "0s");
  assert.equal(practiceDuration(48000), "48s");
  assert.equal(practiceDuration(3605000), "1h 5s");
  assert.equal(practiceDuration(3725000), "1h 2m 5s");
});

test("chart layout fits normal periods and scrolls for larger text and long histories", () => {
  const compact = chartLayout(240, 14, 1);
  assert.equal(compact.scroll, false);
  assert.ok(compact.plotWidth + compact.axisWidth + 8 <= 240);
  assert.equal(chartLayout(240, 14, 1.6).scroll, true);
  assert.equal(chartLayout(320, 30, 1).scroll, true);
  assert.notEqual(chartColors.Calm, chartColors.Focus);
});

function record(date: Date, durationMs = 60000) {
  return manualSession({ goal: "Calm", startedAt: date.getTime(), durationMs }, String(date.getTime()), date.getTime() + durationMs);
}

test("streaks deduplicate dates, retain yesterday and award dated milestones only once", () => {
  const now = new Date(2026, 8, 21, 12);
  const records = Array.from({ length: 14 }, (_, i) => record(addDays(now, i - 14)));
  records.push(record(addDays(now, -1)), record(addDays(now, 1)));
  const stats = practiceStats(records, now);
  assert.equal(stats.current, 14); assert.equal(stats.best, 14); assert.equal(stats.activeDays.size, 14);
  assert.equal(stats.nextMilestone, 21);
  assert.deepEqual(stats.milestones.filter(m => m.id.startsWith("streak")).map(m => [m.id, m.date]), [["streak-14", "2026-09-20"], ["streak-7", "2026-09-13"]]);
  assert.equal(practiceStats(records.slice(0, -2), addDays(now, 1)).current, 0);
  assert.equal(practiceStats([], now).averageShift, null);
});

test("period buckets reconcile time and counts, include zero days and separate count/time percentages", () => {
  const now = new Date(2026, 8, 21, 12);
  const a = record(new Date(2026, 8, 8), 60000), b = record(new Date(2026, 8, 21), 180000);
  b.goal = "Focus"; b.source = "app"; b.pre = 8; b.post = 3;
  const invalid = { ...record(now), engine: { ...record(now).engine, elapsedAtAnchor: 0 } };
  const stats = periodStats([a, b, invalid, record(new Date(2026, 8, 7, 23, 59)), record(addDays(now, 1))], "Days", now);
  assert.equal(stats.count, 2); assert.equal(stats.totalMs, 240000); assert.equal(stats.calendarDays, 14);
  assert.equal(stats.buckets.length, 14); assert.equal(stats.buckets.reduce((n, b) => n + b.records.length, 0), 2);
  assert.equal(stats.averagePerBucket, 240000 / 14); assert.equal(stats.averageSession, 120000); assert.equal(stats.longestSession, 180000);
  assert.equal(stats.shifts, 1); assert.equal(stats.averageShift, 5);
  assert.deepEqual(breakdown(stats.records, "source").map(g => [g.label, g.count, g.totalMs]), [["In-app", 1, 180000], ["Manual", 1, 60000]]);
});

test("weeks start Monday, months cross years, all-time retains older records", () => {
  const now = new Date(2026, 0, 5, 12);
  const records = [record(new Date(2022, 0, 1)), record(new Date(2026, 0, 4)), record(new Date(2026, 0, 5))];
  const weeks = periodStats(records, "Weeks", now);
  assert.equal(weeks.buckets.length, 12); assert.equal(weeks.buckets.at(-1)?.key, "2026-01-05"); assert.equal(weeks.buckets.at(-1)?.records.length, 1);
  assert.equal(dayKey(periodStats(records, "Months", now).start), "2025-02-01");
  const all = periodStats(records, "All time", now);
  assert.equal(all.count, 3); assert.equal(all.buckets.length, 5);
  assert.equal(all.buckets.flatMap(b => b.records).length, 3);
});

test("local calendar arithmetic counts consecutive dates across daylight saving changes", () => {
  const old = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const now = new Date(2026, 2, 9, 12);
    assert.equal(practiceStats([record(new Date(2026, 2, 7)), record(new Date(2026, 2, 8)), record(new Date(2026, 2, 9))], now).current, 3);
    assert.equal(periodStats([], "Days", now).calendarDays, 14);
    process.env.TZ = "America/Santiago";
    const chileNow = new Date(2026, 8, 7, 12);
    assert.equal(addDays(new Date(2026, 8, 6, 12), 1).getHours(), 0);
    const chileStats = periodStats([record(new Date(2026, 8, 7, 0, 30))], "Days", chileNow);
    assert.equal(chileStats.buckets.at(-1)?.records.length, 1);
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});

test("manual entries reject invalid duration, future completion and impossible local dates", () => {
  const now = new Date(2026, 8, 21, 12).getTime();
  for (const durationMs of [0, -1, NaN, 1000.5, 86400001]) assert.throws(() => manualSession({ goal: "Calm", durationMs, startedAt: now - 86400000 }, "test", now));
  assert.throws(() => manualSession({ goal: "Calm", durationMs: 60000, startedAt: now }, "test", now));
  assert.throws(() => parseLocalDateTime("2026-02-30", "12:00"));
  assert.throws(() => parseLocalDateTime("2026-09-21", "24:00"));
  assert.equal(parseLocalDateTime("2026-09-21", "12:00"), now);
});

test("progress periods include local calendar boundaries and exclude future records", () => {
  const now = new Date(2026, 8, 15, 12);
  const times = [new Date(2026, 8, 8, 23, 59), new Date(2026, 8, 9), now, new Date(2026, 8, 16)];
  const records = times.map((date, id) => ({ id: String(id), engine: { startedAt: date.getTime() } }) as SessionRecord);
  assert.deepEqual(periodRecords(records, 7, now).map((r) => r.id), ["1", "2"]);
  assert.deepEqual(periodRecords(records, 30, now).map((r) => r.id), ["0", "1", "2"]);
});
