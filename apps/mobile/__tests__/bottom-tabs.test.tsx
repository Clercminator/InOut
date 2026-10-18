import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import React, { useState } from "react";
import { AccessibilityInfo, Animated } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { BottomTabs } from "../src/bottom-tabs";
const navigations: string[] = [];
const routes = ["progress", "index", "challenges"].map(name => ({ name, key: name }));
function Harness({ initial = 0 }: { initial?: number }) {
  const [index, setIndex] = useState(initial);
  return <SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 24, left: 0, right: 0 }}><BottomTabs {...({ state: { index, routes }, navigation: {
    emit: () => ({ defaultPrevented: false }), navigate: (name: string) => { navigations.push(name); setIndex(routes.findIndex(r => r.name === name)); },
  } } as any)} /></SafeAreaInsetsContext.Provider>;
}
afterEach(() => { navigations.length = 0; jest.restoreAllMocks(); });
test.each([[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]])("tab %s to %s navigates immediately and ignores repeated selection", async (from, to) => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  await render(<Harness initial={from} />);
  await fireEvent.press(screen.getByTestId(`tab-${routes[to].name}`));
  expect(navigations).toEqual([routes[to].name]);
  expect(screen.getByTestId(`tab-${routes[to].name}`).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByTestId(`tab-${routes[to].name}`));
  expect(navigations).toHaveLength(1);
});
test("rapid tab changes settle on the last tap and animations never block navigation", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  const timing = jest.spyOn(Animated, "timing").mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  await render(<Harness />);
  await fireEvent.press(screen.getByTestId("tab-index"));
  await fireEvent.press(screen.getByTestId("tab-challenges"));
  expect(navigations).toEqual(["index", "challenges"]);
  expect(screen.getByTestId("tab-challenges").props.accessibilityState.selected).toBe(true);
  expect(timing.mock.calls.every(([, options]) => options.duration === 180 && options.isInteraction === false)).toBe(true);
});
test("reduced motion uses immediate active states without animation", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const timing = jest.spyOn(Animated, "timing");
  await render(<Harness />);
  await fireEvent.press(screen.getByTestId("tab-index"));
  expect(timing).not.toHaveBeenCalled();
});
