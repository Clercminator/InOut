import React from "react";
import { AccessibilityInfo, Animated } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { SighVisual } from "../src/sigh-visual";
import { start, snapshot } from "@inout/breathing-engine";
import { planFor, protocols } from "@inout/protocols";

afterEach(() => jest.restoreAllMocks());

test("bubble retains one absolute size mapping through inhale, holds, exhale and next cycle", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  const interpolate = jest.spyOn(Animated.Value.prototype, "interpolate");
  jest.spyOn(Animated, "timing").mockImplementation((value, config) => ({
    start: () => { (value as Animated.Value).setValue(config.toValue as number); },
    stop: jest.fn(), reset: jest.fn(),
  }));
  const protocol = protocols.find(p => p.id === "box")!;
  const state = start(planFor(protocol), 0);
  const rendered = await render(<SighVisual view={snapshot(state, 0)} running animationType="box" phases={protocol.phases} />);
  const mappingIndex = interpolate.mock.calls.findIndex(([config]) => config.outputRange[0] === 0.6 && config.outputRange[1] === 1);
  expect(mappingIndex).toBeGreaterThanOrEqual(0);
  const mapping = interpolate.mock.results[mappingIndex].value;
  expect(mapping.__getValue()).toBe(1);
  for (const [time, expected] of [[4000, 1], [8000, 0.6], [12000, 0.6], [16000, 1]]) {
    await rendered.rerender(<SighVisual view={snapshot(state, time)} running animationType="box" phases={protocol.phases} />);
    expect(interpolate.mock.calls.filter(([config]) => config.outputRange[0] === 0.6 && config.outputRange[1] === 1)).toHaveLength(1);
    expect(mapping.__getValue()).toBeCloseTo(expected);
  }
});

test("both holds are explicit to sight and screen readers, and paused guidance releases the pacing", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const protocol = protocols.find(p => p.id === "box")!;
  const state = start(planFor(protocol), 0);
  const rendered = await render(<SighVisual view={snapshot(state, 4000)} running animationType="box" phases={protocol.phases} />);
  expect(screen.getByLabelText(/Hold. 4 seconds remaining/)).toBeTruthy();
  await rendered.rerender(<SighVisual view={snapshot(state, 12000)} running animationType="box" phases={protocol.phases} />);
  expect(screen.getByLabelText(/Hold. 4 seconds remaining/)).toBeTruthy();
  await rendered.rerender(<SighVisual view={snapshot(state, 12000)} running={false} animationType="box" phases={protocol.phases} />);
  expect(screen.getByText("Breathe naturally while paused")).toBeTruthy();
});

test("reduced motion gives phase guidance without starting breath or hum animations", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const timing = jest.spyOn(Animated, "timing");
  const protocol = protocols.find(p => p.id === "bhramari")!;
  const state = start(planFor(protocol), 0);
  await render(<SighVisual view={snapshot(state, 6000)} running animationType="ripple" phases={protocol.phases} />);
  expect(screen.getByText("Hum softly as you breathe out")).toBeTruthy();
  expect(timing).not.toHaveBeenCalled();
});
