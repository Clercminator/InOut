import React from "react";
import { AccessibilityInfo, PanResponder } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import TabLayout from "../app/(tabs)/_layout";

const mockJumps: string[] = [];
let mockFocused = true;
jest.mock("../src/provider", () => ({ useSession: () => ({ preferences: { onboardingComplete: true } }) }));
jest.mock("expo-router", () => ({
  Redirect: () => null,
  Tabs: Object.assign((props: any) => {
    const React = require("react"), { View } = require("react-native");
    const [index, setIndex] = React.useState(1);
    const routes = ["progress", "index", "challenges"].map(name => ({ name, key: name }));
    const navigation = { isFocused: () => mockFocused, emit: () => ({ defaultPrevented: false }), navigate: (name: string) => {
      mockJumps.push(name); setIndex(routes.findIndex(r => r.name === name));
    } };
    return React.createElement(View, null, props.screenLayout({ children: React.createElement(View), route: routes[index], navigation }), props.tabBar({ state: { index, routes }, navigation }));
  }, { Screen: () => null }),
}));
beforeEach(() => {
  jest.useFakeTimers(); mockJumps.length = 0; mockFocused = true;
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(false);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test("swipes and bottom buttons use the same active tab state and never wrap at boundaries", async () => {
  const create = jest.spyOn(PanResponder, "create");
  await render(<SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 0, left: 0, right: 0 }}><TabLayout /></SafeAreaInsetsContext.Provider>);
  const swipe = async (dx: number) => {
    await act(() => jest.advanceTimersByTime(400));
    const handlers = create.mock.calls.at(-1)![0], g = { dx, dy: 0, numberActiveTouches: 1 } as any;
    await act(() => { handlers.onStartShouldSetPanResponderCapture?.({} as any, g); if (handlers.onMoveShouldSetPanResponderCapture?.({} as any, g)) handlers.onPanResponderRelease?.({} as any, g); });
  };
  await swipe(90); expect(screen.getByTestId("tab-progress").props.accessibilityState.selected).toBe(true);
  await swipe(90); expect(mockJumps).toEqual(["progress"]);
  await swipe(-90); expect(screen.getByTestId("tab-index").props.accessibilityState.selected).toBe(true);
  await swipe(-90); expect(screen.getByTestId("tab-challenges").props.accessibilityState.selected).toBe(true);
  await swipe(-90); expect(mockJumps).toEqual(["progress", "index", "challenges"]);
  await fireEvent.press(screen.getByTestId("tab-progress"));
  expect(screen.getByTestId("tab-progress").props.accessibilityState.selected).toBe(true);
  mockFocused = false; await swipe(-90); expect(mockJumps).toHaveLength(4);
});
