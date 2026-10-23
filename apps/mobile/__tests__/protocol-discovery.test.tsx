import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Protocols from "../app/protocols";
import Testing from "../app/testing";
import { setLanguage } from "../src/i18n";

const mockTrack = jest.fn();
const mockController = { analytics: { track: mockTrack }, isFavorite: (id: string) => id === "box", entitlements: { protocolAccess: () => ({ allowed: true }) } };
jest.mock("../src/provider", () => ({ useSession: () => mockController }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}), useFocusEffect: jest.fn(),
  router: { canGoBack: () => false, replace: jest.fn(), push: jest.fn() },
  Redirect: ({ href }: { href: string }) => require("react").createElement(require("react-native").View, { testID: `redirect:${href}` }),
}));
const originalDev = __DEV__;
beforeEach(() => { (globalThis as any).__DEV__ = false; mockTrack.mockClear(); });
afterEach(() => { (globalThis as any).__DEV__ = originalDev; jest.useRealTimers(); });

test("public catalog is compact and release deep links redirect without mounting the lab", async () => {
  const result = await render(<Protocols />);
  expect(screen.getByLabelText("Search protocols")).toBeTruthy();
  expect(screen.queryByText("Purposes")).toBeNull();
  expect(screen.queryByText("ANIMATION LAB")).toBeNull();
  await result.unmount();
  await render(<Testing />);
  expect(screen.getByTestId("redirect:/protocols")).toBeTruthy();
  expect(screen.queryByText("Start testing")).toBeNull();
});

test("Saved is independent, filters apply together, chips remove and empty search resets", async () => {
  await render(<Protocols />);
  await fireEvent.press(screen.getByRole("button", { name: "Saved" }));
  expect(screen.getByText("Protocols found: 1")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Filters, 0 active"));
  await fireEvent.press(screen.getByRole("button", { name: "Calm & Unwind" }));
  await fireEvent.press(screen.getByRole("button", { name: "Sleep" }));
  await fireEvent.press(screen.getByRole("button", { name: "Fitness" }));
  await fireEvent.press(screen.getByRole("button", { name: "Apply filters" }));
  expect(screen.getByText("Protocols found: 0")).toBeTruthy();
  expect(screen.getByLabelText("Filters, 3 active")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Remove filter: Calm & Unwind"));
  expect(screen.getByLabelText("Filters, 2 active")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Search protocols"), "zzzzzz");
  await fireEvent.press(screen.getByText("Reset search & filters"));
  await fireEvent.changeText(screen.getByLabelText("Search protocols"), "zzzzzz");
  expect(screen.getByText("No matching protocols.")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Clear search"));
  expect(screen.queryByText("No matching protocols.")).toBeNull();
  expect(screen.queryByLabelText("Clear search")).toBeNull();
});

test("closing discards draft choices and Clear applies immediately", async () => {
  await render(<Protocols />);
  await fireEvent.press(screen.getByLabelText("Filters, 0 active"));
  await fireEvent.press(screen.getByRole("button", { name: "Advanced" }));
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByLabelText("Filters, 0 active")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Filters, 0 active"));
  expect(screen.getByRole("button", { name: "Advanced" }).props.accessibilityState.selected).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Sleep" }));
  await fireEvent.press(screen.getByText("Apply filters"));
  await fireEvent.press(screen.getByLabelText("Filters, 1 active"));
  await fireEvent.press(screen.getByText("Clear filters"));
  expect(screen.getByLabelText("Filters, 0 active")).toBeTruthy();
});

test.each([['es', 'Filtros', 'Borrar búsqueda'], ['pt', 'Filtros', 'Limpar busca']] as const)("discovery controls translate in %s", async (language, filters, clear) => {
  setLanguage(language);
  await render(<Protocols />);
  expect(screen.getByText(filters)).toBeTruthy();
  await fireEvent.changeText(screen.getByDisplayValue(""), "box");
  expect(screen.getByLabelText(clear)).toBeTruthy();
});

test("sensitive and pre-filtered intimacy results never emit discovery telemetry", async () => {
  jest.useFakeTimers();
  await render(<Protocols />);
  await fireEvent.changeText(screen.getByLabelText("Search protocols"), "intimidade");
  await act(() => jest.advanceTimersByTime(1000));
  expect(mockTrack).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Search protocols"), "box");
  await act(() => jest.advanceTimersByTime(1000));
  expect(mockTrack).toHaveBeenCalledWith("protocol_search_used");
  expect(mockTrack.mock.calls[0]).toHaveLength(1);
});
