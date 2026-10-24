import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { defaultPreferences } from "../src/storage";
import { NotificationSettings } from "../src/notification-settings";
import { ReminderContext } from "../src/reminder-context";
import { ReminderService, type Reminder } from "../src/reminders";
import { setLanguage } from "../src/i18n";
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
const mockConfigure = jest.fn(async (..._args: unknown[]) => {});
const mockController = { preferences: defaultPreferences, setPreferences: jest.fn((value: typeof defaultPreferences) => { mockController.preferences = value; }),
  history: () => [], analytics: { track: jest.fn() }, entitlements: { state: { pro: false }, billingReady: true } };
jest.mock("../src/provider", () => ({ useSession: () => mockController }));
jest.mock("../src/reminder-native", () => ({ nativeReminderAdapter: () => ({ permission: async () => true }), configureEngagementNotifications: (...args: unknown[]) => mockConfigure(...args) }));
beforeEach(() => { setLanguage("en"); mockController.preferences = defaultPreferences; mockController.setPreferences.mockClear(); mockConfigure.mockReset().mockResolvedValue(undefined); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test("Settings preserves existing reminders and edits or pauses their schedules in the same panel", async () => {
  setLanguage("en");
  let items: Reminder[] = [{ id: "existing", label: "My practice", hour: 13, minute: 0, weekdays: [1,2,3,4,5,6,7], enabled: true }];
  const scheduled = new Set<string>();
  const permission = jest.fn(async () => true);
  const service = new ReminderService({ read: () => items, write: next => { items = next; } }, {
    permission, list: async () => [...scheduled], cancel: async id => { scheduled.delete(id); },
    schedule: async id => { scheduled.add(id); },
  }, () => false, () => []);
  await render(<ReminderContext.Provider value={service}><NotificationSettings /></ReminderContext.Provider>);
  expect(permission).not.toHaveBeenCalled();
  expect(items[0].weekdays).toHaveLength(7);
  expect(screen.queryByRole("button", { name: "Add reminder" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Saved reminders" }));
  await fireEvent(screen.getByLabelText("My practice"), "valueChange", false);
  expect(items[0].enabled).toBe(false); expect(scheduled.size).toBe(0);
  // The first weekday chips belong to the main schedule; the last belong to this saved reminder.
  await fireEvent.press(screen.getAllByRole("button", { name: "Sat" }).at(-1)!);
  await fireEvent.press(screen.getAllByRole("button", { name: "Sun" }).at(-1)!);
  await fireEvent(screen.getByLabelText("My practice"), "valueChange", true);
  expect(items[0].weekdays).toEqual([2,3,4,5,6]);
  expect(items[0].hour).toBe(13); expect(scheduled.size).toBe(5);
});

test("new installations have only the main notification settings", async () => {
  const service = new ReminderService({ read: () => [], write: () => {} }, {
    permission: async () => true, list: async () => [], cancel: async () => {}, schedule: async () => {},
  }, () => true, () => []);
  await render(<ReminderContext.Provider value={service}><NotificationSettings /></ReminderContext.Provider>);
  expect(screen.getByLabelText("Daily Reset")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Saved reminders" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Add reminder" })).toBeNull();
});

test("advanced actions stay collapsed, require confirmation, and retry appears only after failure", async () => {
  jest.useFakeTimers();
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  let items: Reminder[] = [{ id: "saved", label: "My time", hour: 17, minute: 20, weekdays: [2,4], enabled: true }];
  const service = new ReminderService({ read: () => items, write: value => { items = value; } }, {
    permission: async () => true, list: async () => [], cancel: async () => {}, schedule: async () => {},
  }, () => true, () => []);
  await render(<ReminderContext.Provider value={service}><NotificationSettings /></ReminderContext.Provider>);
  expect(screen.queryByRole("button", { name: "Disable all notifications" })).toBeNull();
  expect(screen.getByRole("button", { name: /QUIET HOURS START/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /QUIET HOURS END/ })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Advanced settings" }));
  expect(screen.queryByRole("button", { name: "Retry reminder scheduling" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Disable all notifications" }));
  expect(mockController.setPreferences).not.toHaveBeenCalled();
  expect(items[0].enabled).toBe(true);
  const buttons = alert.mock.calls.at(-1)![2]!;
  await act(async () => { buttons.find(b => b.text === "Disable")!.onPress!(); });
  expect(items[0]).toMatchObject({ enabled: false, hour: 17, minute: 20, weekdays: [2,4] });
  expect(screen.queryByRole("button", { name: "Retry reminder scheduling" })).toBeNull();
  await act(() => jest.advanceTimersByTime(2100));
  expect(screen.queryByText("Saved")).toBeNull();
  mockConfigure.mockRejectedValueOnce(Error("Scheduler unavailable"));
  await fireEvent(screen.getByLabelText("Motivational reminders"), "valueChange", true);
  expect(screen.getByRole("button", { name: "Retry reminder scheduling" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Retry reminder scheduling" }));
  expect(screen.queryByRole("button", { name: "Retry reminder scheduling" })).toBeNull();
});
