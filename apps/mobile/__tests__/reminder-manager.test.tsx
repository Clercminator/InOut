import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Reminders from "../app/reminders";
import { ReminderContext } from "../src/reminder-context";
import { ReminderService, type Reminder } from "../src/reminders";
import { defaultPreferences } from "../src/storage";
import { setLanguage } from "../src/i18n";
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
let mockPro = false;
jest.mock("../src/provider", () => ({ useSession: () => ({ preferences: require("../src/storage").defaultPreferences, analytics: { track: jest.fn() }, entitlements: { state: { pro: mockPro } } }) }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "new-reminder" }));

test("presets save one reminder, summaries reflect days, and pause/edit replace schedules", async () => {
  mockPro = false;
  setLanguage("en");
  let items: Reminder[] = [];
  const scheduled = new Set<string>();
  const permission = jest.fn(async () => true);
  const service = new ReminderService({ read: () => items, write: next => { items = next; } }, {
    permission, list: async () => [...scheduled], cancel: async id => { scheduled.delete(id); },
    schedule: async id => { scheduled.add(id); },
  }, () => false, () => []);
  await render(<ReminderContext.Provider value={service}><Reminders /></ReminderContext.Provider>);
  expect(permission).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Add reminder" }));
  await fireEvent.press(screen.getByRole("button", { name: "Afternoon" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save reminder" }));
  expect(items).toHaveLength(1); expect(items[0].hour).toBe(13); expect(scheduled.size).toBe(7);
  expect(screen.getByText(/Every day ·/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Pause reminder" }));
  expect(scheduled.size).toBe(0);
  await fireEvent.press(screen.getByRole("button", { name: "Edit reminder" }));
  await fireEvent.press(screen.getByRole("button", { name: "Evening" }));
  await fireEvent.press(screen.getByRole("button", { name: "Saturday" }));
  await fireEvent.press(screen.getByRole("button", { name: "Sunday" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save reminder" }));
  expect(screen.getByText(/Monday–Friday ·/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Enable reminder" }));
  expect(items[0].hour).toBe(21); expect(scheduled.size).toBe(5);
});

test("Pro reminder settings suppress the upgrade prompt", async () => {
  mockPro = true;
  const service = new ReminderService({ read: () => [], write: () => {} }, {
    permission: async () => true, list: async () => [], cancel: async () => {}, schedule: async () => {},
  }, () => true, () => []);
  await render(<ReminderContext.Provider value={service}><Reminders /></ReminderContext.Provider>);
  expect(screen.queryByRole("button", { name: "Explore Pro" })).toBeNull();
});
