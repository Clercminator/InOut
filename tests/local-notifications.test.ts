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
