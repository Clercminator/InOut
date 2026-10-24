import { configureEngagementNotifications, nativeReminderAdapter } from "../src/reminder-native";
import { notificationDefaults } from "../src/local-notifications";
import { defaultPreferences } from "../src/storage";
import { setLanguage } from "../src/i18n";
const mockScheduled = new Map<string, any>();
let mockAllowed = true;
let mockFailAfter = Infinity;
const mockCategory = jest.fn();
jest.mock("expo-constants", () => ({ __esModule: true, default: { executionEnvironment: "standalone" } }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date", WEEKLY: "weekly" },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: async () => ({ granted: mockAllowed, canAskAgain: false }),
  getAllScheduledNotificationsAsync: async () => [...mockScheduled.values()],
  cancelScheduledNotificationAsync: async (id: string) => { mockScheduled.delete(id); },
  scheduleNotificationAsync: async (item: any) => { if (mockScheduled.size >= mockFailAfter) throw Error("Scheduler unavailable"); mockScheduled.set(item.identifier, item); },
  setNotificationCategoryAsync: (...args: any[]) => mockCategory(...args),
}));
afterEach(() => { jest.useRealTimers(); mockAllowed = true; mockFailAfter = Infinity; mockScheduled.clear(); setLanguage("en"); });

test("native reconciliation replaces conditional prompts, localizes actions, and cancels after opt-out or denial", async () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 12, 10));
  setLanguage("es");
  const preferences = { ...defaultPreferences, language: "es" as const, notifications: { ...notificationDefaults, promotions: true, checkIn: true } };
  const context = { lastPracticeAt: null, remindersEnabled: true, pro: false, billingReady: true };
  await configureEngagementNotifications(preferences, true, context);
  expect([...mockScheduled.values()].some(item => item.content.data.notificationType === "promotion")).toBe(true);
  expect(mockCategory).toHaveBeenCalledWith("inout-check-in", expect.arrayContaining([expect.objectContaining({ buttonTitle: "Sí" }), expect.objectContaining({ buttonTitle: "Todavía no" })]));
  const ids = [...mockScheduled.keys()];
  await configureEngagementNotifications(preferences, true, context);
  expect([...mockScheduled.keys()]).toEqual(ids);
  await configureEngagementNotifications(preferences, false, { ...context, pro: true });
  expect([...mockScheduled.values()].some(item => item.content.data.notificationType === "promotion")).toBe(false);
  mockAllowed = false;
  await expect(configureEngagementNotifications({ ...preferences, language: "pt" }, false, context)).rejects.toThrow(/Notifications are off/);
  expect(mockScheduled.size).toBe(0);
  await configureEngagementNotifications({ ...preferences, notifications: notificationDefaults }, false, context);
  expect(mockScheduled.size).toBe(0);
  jest.useRealTimers(); setLanguage("en");
});

test("editing quiet hours also reschedules an already earned achievement", async () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 12, 10)); mockAllowed = true; mockScheduled.clear();
  const id = "inout-achievement:earned-badge";
  mockScheduled.set(id, { identifier: id, content: { title: "IN/OUT", data: { notificationType: "achievement", awardId: "earned-badge", scheduledFor: new Date(2026, 9, 12, 23).toISOString() } } });
  await configureEngagementNotifications({ ...defaultPreferences, notifications: { ...notificationDefaults, achievements: true, hour: 23, quietHoursEnabled: true } }, false, undefined, true);
  expect(mockScheduled.size).toBe(1);
  expect(mockScheduled.get(id).trigger.date.getHours()).toBe(8);
  expect(mockScheduled.get(id).trigger.date.getDate()).toBe(14);
  expect(mockScheduled.get(id).content.data.awardId).toBe("earned-badge");
  jest.useRealTimers();
});

test("permission revocation cancels pending earned alerts as well as prompts", async () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date(2026,9,12,10));
  mockScheduled.set("inout-achievement:earned", { identifier: "inout-achievement:earned", content: { data: { scheduledFor: new Date(2026,9,14,13).toISOString() } } });
  mockAllowed = false;
  await expect(configureEngagementNotifications({ ...defaultPreferences, notifications: { ...notificationDefaults, achievements: true } }, false, undefined, true)).rejects.toThrow("Notifications are off");
  expect(mockScheduled.size).toBe(0);
});

test("partial native failures roll back and a subsequent retry restores the schedule without duplicates", async () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date(2026,9,12,10)); mockFailAfter = 1;
  const preferences = { ...defaultPreferences, notifications: { ...notificationDefaults, motivation: true } };
  await expect(configureEngagementNotifications(preferences, false, undefined, true)).rejects.toThrow("Scheduler unavailable");
  expect(mockScheduled.size).toBe(0);
  mockFailAfter = Infinity;
  await configureEngagementNotifications(preferences, false, undefined, true);
  const ids = [...mockScheduled.keys()]; expect(ids.length).toBe(3);
  await configureEngagementNotifications(preferences, false, undefined, true);
  expect([...mockScheduled.keys()]).toEqual(ids);
});

test("saved reminders use quiet minutes, selected days and bounded dates, and reserve their daily slot", async () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date(2026,9,12,10));
  const reminder = { id: "saved", label: "Private title", hour: 23, minute: 0, weekdays: [2,4,6], enabled: true };
  const adapter = nativeReminderAdapter(undefined, () => ({ quietHoursEnabled: true, quietStartHour: 22, quietEndHour: 8, quietEndMinute: 30 }));
  for (const weekday of reminder.weekdays) await adapter.schedule(`inout-reminder:saved:${weekday}`, reminder, weekday);
  expect(mockScheduled.size).toBe(3);
  for (const item of mockScheduled.values()) {
    expect(item.trigger.type).toBe("date"); expect(item.trigger.date.getHours()).toBe(8); expect(item.trigger.date.getMinutes()).toBe(30);
    expect(reminder.weekdays).toContain(item.trigger.date.getDay()+1);
    expect(item.content.body).not.toContain(reminder.label);
  }
  await configureEngagementNotifications({ ...defaultPreferences, notifications: { ...notificationDefaults, motivation: true } }, false, undefined, true);
  const dates = [...mockScheduled.values()].map(item => item.trigger.date.toDateString());
  expect(new Set(dates).size).toBe(dates.length);
  mockScheduled.clear();
  const practiced = nativeReminderAdapter(undefined, undefined, () => Date.now());
  await practiced.schedule("inout-reminder:saved:2", { ...reminder, hour: 13 }, 2);
  expect(mockScheduled.size).toBe(0);
});
