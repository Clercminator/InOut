import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { ReminderContext, ReminderEffects } from "../src/reminder-context";
import { ReminderService } from "../src/reminders";
import { SessionController } from "../src/session-controller";
import { SessionContext } from "../src/session-context";
import type { LocalStore } from "../src/storage";
import { defaultPreferences } from "../src/storage";

const mockPush = jest.fn();
let mockListener: (response: unknown) => void;
let mockHandler: { handleNotification(): Promise<{ shouldShowBanner: boolean; shouldPlaySound: boolean }> } | null;
const mockRemove = jest.fn();
const mockClear = jest.fn(async () => {});
const response = (id = "a", date = 1) => ({ actionIdentifier: "open", notification: { date, request: { identifier: `inout-reminder:${id}:2`, content: { data: { reminderId: id } } } } });
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock("../src/reminder-native", () => ({ notifications: () => ({
  DEFAULT_ACTION_IDENTIFIER: "open", setNotificationHandler: (handler: typeof mockHandler) => { mockHandler = handler; },
  addNotificationResponseReceivedListener: (listener: typeof mockListener) => { mockListener = listener; return { remove: mockRemove }; },
  getLastNotificationResponseAsync: async () => response(), clearLastNotificationResponseAsync: () => mockClear(),
}) }));

test("notification delivery stays quiet during practice, handles a tap once, and never auto-starts", async () => {
  const controller = new SessionController({ preferences: () => ({ ...defaultPreferences, onboardingComplete: true }), pending: () => null, save: () => {} } as unknown as LocalStore, () => 1000, () => "session");
  const service = new ReminderService({ read: () => [{ id: "a", label: "Private ritual name", hour: 8, minute: 0, weekdays: [2], enabled: true }], write: () => {} }, { permission: async () => true, list: async () => [], cancel: async () => {}, schedule: async () => {} }, () => false, () => []);
  mockPush.mockClear(); mockRemove.mockClear();
  const view = await render(<SessionContext.Provider value={controller}><ReminderContext.Provider value={service}><ReminderEffects /></ReminderContext.Provider></SessionContext.Provider>);
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pre"));
  expect(controller.current).toBeNull();
  await act(async () => { mockListener(response()); });
  expect(mockPush).toHaveBeenCalledTimes(1);
  await act(async () => { controller.start(null); });
  const presentation = await mockHandler!.handleNotification();
  expect(presentation.shouldPlaySound).toBe(false); expect(presentation.shouldShowBanner).toBe(false);
  await act(async () => { mockListener(response("a", 2)); });
  expect(mockPush).toHaveBeenLastCalledWith("/session");
  await act(async () => { mockListener(response("removed", 3)); });
  expect(mockPush).toHaveBeenCalledTimes(2);
  await view.unmount(); expect(mockRemove).toHaveBeenCalled(); expect(mockHandler).toBeNull();
});
