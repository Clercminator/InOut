import React from "react";
import { AccessibilityInfo, Animated, AppState, type AppStateStatus } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { WelcomeToast } from "../src/welcome-toast";
import { setLanguage, t } from "../src/i18n";

const wrap = (eligible = true) => <SafeAreaInsetsContext.Provider value={{ top: 24, bottom: 0, left: 0, right: 0 }}><WelcomeToast eligible={eligible} /></SafeAreaInsetsContext.Provider>;
beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" });
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test.each(["en", "es", "pt"] as const)("welcome translates, dismisses, and stays dismissed across navigation (%s)", async language => {
  setLanguage(language);
  const view = await render(wrap(false));
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
  await view.rerender(wrap());
  expect(screen.getByText(t("Great to have you back 🥳🫂"))).toBeTruthy();
  await act(() => jest.advanceTimersByTime(4200));
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
  await view.rerender(wrap(false));
  await view.rerender(wrap());
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
});

test("leaving Home cancels the toast and timer, without replay on return", async () => {
  const view = await render(wrap());
  expect(screen.getByTestId("welcome-toast")).toBeTruthy();
  await view.rerender(wrap(false));
  await view.rerender(wrap());
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
});

test("a cold open in the background waits for foreground, and interruptions dismiss it", async () => {
  Object.defineProperty(AppState, "currentState", { configurable: true, value: "background" });
  let change: (state: AppStateStatus) => void = () => {};
  const remove = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => { change = listener; return { remove }; });
  const view = await render(wrap());
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
  await act(() => change("active"));
  expect(screen.getByTestId("welcome-toast")).toBeTruthy();
  await act(() => change("inactive"));
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
  await act(() => change("active"));
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
  await view.unmount();
  expect(remove).toHaveBeenCalled();
});

test("standard motion animates in and out; reduced motion does not animate", async () => {
  const timing = jest.spyOn(Animated, "timing");
  const view = await render(wrap());
  expect(timing).not.toHaveBeenCalled();
  await view.unmount();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  await render(wrap());
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, useNativeDriver: true }));
  await act(() => jest.advanceTimersByTime(4500));
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, useNativeDriver: true }));
  expect(screen.queryByTestId("welcome-toast")).toBeNull();
});
