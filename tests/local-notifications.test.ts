import assert from "node:assert/strict";
import test from "node:test";
import { buildEngagementSchedule, notificationDefaults, notificationTime, validateNotificationPreferences } from "../apps/mobile/src/local-notifications";

test("engagement prompts are opt-in and capped at three selected days each week", () => {
  assert.deepEqual(buildEngagementSchedule(notificationDefaults, new Date(2026, 9, 19, 10)), []);
  const settings = { ...notificationDefaults, dailyReset: true, motivation: true, checkIn: true };
  const schedule = buildEngagementSchedule(settings, new Date(2026, 9, 19, 10));
  assert.equal(schedule.length, 3);
  assert.deepEqual(schedule.map(item => item.type), ["daily-reset", "motivation", "check-in"]);
  assert.deepEqual(settings.weekdays, [2, 4, 6]);
});

test("quiet hours move scheduled prompts out of the selected quiet window", () => {
  const settings = {
    ...notificationDefaults,
    checkIn: true,
    hour: 23,
    quietHoursEnabled: true,
  };
  const schedule = buildEngagementSchedule(settings, new Date(2026, 9, 19, 10));
  assert.equal(schedule.length, 3);
  for (const item of schedule) {
    assert.equal(item.date.getHours(), 8);
    assert.ok(item.date.getTime() > new Date(2026, 9, 19, 10).getTime());
  }
});

test("invalid notification weekdays and quiet-hour ranges are rejected", () => {
  assert.throws(() => validateNotificationPreferences({ ...notificationDefaults, weekdays: [1, 2, 3, 4] }));
  assert.throws(() => validateNotificationPreferences({ ...notificationDefaults, quietEndHour: 22 }));
});

test("quiet-hour adjustment preserves daytime reminders and moves late reminders to morning", () => {
  const day = new Date(2026, 9, 19);
  const quiet = { ...notificationDefaults, quietHoursEnabled: true };
  const open = { ...notificationDefaults, quietHoursEnabled: false };
  const beforeQuiet = notificationTime(day, 13, 15, quiet);
  assert.equal(beforeQuiet.getDate(), day.getDate());
  assert.equal(beforeQuiet.getHours(), 13);
  const nextMorning = notificationTime(day, 23, 0, quiet);
  assert.equal(nextMorning.getDate(), day.getDate() + 1);
  assert.equal(nextMorning.getHours(), 8);
  assert.equal(notificationTime(day, 23, 0, open).getDate(), day.getDate());
});

test("education rotates into the capped schedule and re-engagement requires confirmed inactivity and reminders", () => {
  const now = new Date(2026, 9, 12, 10);
  const settings = { ...notificationDefaults, education: true, reengagement: true };
  const context = { lastPracticeAt: now.getTime() - 4 * 86400000, remindersEnabled: true, pro: false, billingReady: true };
  assert.ok(buildEngagementSchedule(settings, now, context).some(item => item.type === "reengagement"));
  for (const changed of [{ ...context, remindersEnabled: false }, { ...context, lastPracticeAt: now.getTime() }, { ...context, lastPracticeAt: null }]) {
    const schedule = buildEngagementSchedule(settings, now, changed);
    assert.ok(schedule.every(item => item.type === "education"));
    assert.ok(schedule.length <= 3);
  }
});

test("promotions occur no more than once in four weeks and never with Pro or unresolved billing", () => {
  const settings = { ...notificationDefaults, promotions: true };
  const context = { lastPracticeAt: null, remindersEnabled: true, pro: false, billingReady: true };
  const dates = new Set<number>();
  for (let day = 0; day < 90; day++) {
    const now = new Date(2026, 9, 12 + day, 10);
    for (const item of buildEngagementSchedule(settings, now, context)) dates.add(item.date.getTime());
    assert.deepEqual(buildEngagementSchedule(settings, now, { ...context, pro: true }), []);
    assert.deepEqual(buildEngagementSchedule(settings, now, { ...context, billingReady: false }), []);
    assert.deepEqual(buildEngagementSchedule(settings, now), []);
  }
  const sorted = [...dates].sort((a, b) => a - b);
  assert.ok(sorted.length >= 3);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 27 * 86400000);
});


test("optional weekly progress stays neutral and no engagement prompt follows today's practice", () => {
  const now = new Date(2026, 9, 19, 10);
  const settings = { ...notificationDefaults, weeklyProgress: true, weekdays: [2, 4, 6], hour: 13 };
  const context = { pro: false, billingReady: true, remindersEnabled: true, lastPracticeAt: now.getTime() - 60000 };
  const schedule = buildEngagementSchedule(settings, now, context);
  assert.ok(schedule.length > 0);
  assert.ok(schedule.every(item => item.date.getDate() !== 19 && item.type === "weekly-progress"));
  assert.ok(schedule.every(item => item.body === "Your weekly practice progress is ready to view."));
});
