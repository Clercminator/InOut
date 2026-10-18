import { configureEngagementNotifications } from "../src/reminder-native";
import { notificationDefaults } from "../src/local-notifications";
import { defaultPreferences } from "../src/storage";
import { setLanguage } from "../src/i18n";
const mockScheduled = new Map<string, any>();
let mockAllowed = true;
const mockCategory = jest.fn();
jest.mock("expo-constants", () => ({ __esModule: true, default: { executionEnvironment: "standalone" } }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date", WEEKLY: "weekly" },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: async () => ({ granted: mockAllowed, canAskAgain: false }),
  getAllScheduledNotificationsAsync: async () => [...mockScheduled.values()],
  cancelScheduledNotificationAsync: async (id: string) => { mockScheduled.delete(id); },
  scheduleNotificationAsync: async (item: any) => { mockScheduled.set(item.identifier, item); },
  setNotificationCategoryAsync: (...args: any[]) => mockCategory(...args),
}));

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
