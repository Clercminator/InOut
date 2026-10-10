import React from "react";
import { AccessibilityInfo, Animated, AppState, type AppStateStatus } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { snapshot, start } from "@inout/breathing-engine";
import Testing, { testingPlan } from "../app/testing";
import { PulseOrb } from "../src/pulse-orb";

jest.mock("expo-router", () => ({ useFocusEffect: jest.fn(), router: { canGoBack: () => false, replace: jest.fn() } }));
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test("orb respects reduced motion and does not schedule animation", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const timing = jest.spyOn(Animated, "timing");
  await render(<PulseOrb view={snapshot(start(testingPlan, 0), 2000)} phases={testingPlan.blocks[0].phases} running />);
  expect(screen.getByTestId("pulse-orb", { includeHiddenElements: true })).toBeTruthy();
  expect(timing).not.toHaveBeenCalled();
});

test("orb uses remaining phase time, avoids restarting on ticks, and cancels on pause", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  const stop = jest.fn();
  const timing = jest.spyOn(Animated, "timing").mockImplementation(() => ({ start: jest.fn(), stop, reset: jest.fn() }));
  const state = start(testingPlan, 0);
  const rendered = await render(<PulseOrb view={snapshot(state, 2000)} phases={testingPlan.blocks[0].phases} running />);
  expect(timing).toHaveBeenCalledTimes(2);
  expect(timing.mock.calls[0][1]).toMatchObject({ duration: 3000, toValue: 1, useNativeDriver: true, isInteraction: false });
  await rendered.rerender(<PulseOrb view={snapshot(state, 2100)} phases={testingPlan.blocks[0].phases} running />);
  expect(timing).toHaveBeenCalledTimes(2);
  await rendered.rerender(<PulseOrb view={snapshot(state, 2200)} phases={testingPlan.blocks[0].phases} running={false} />);
  expect(stop).toHaveBeenCalled();
  expect(timing).toHaveBeenCalledTimes(2);
  await rendered.rerender(<PulseOrb view={snapshot(state, 2200)} phases={testingPlan.blocks[0].phases} running motionEnabled={false} />);
  expect(timing).toHaveBeenCalledTimes(2);
});

test("testing starts on demand, pauses in background, resumes without counting background time and restarts", async () => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  let onState: (state: AppStateStatus) => void = () => {};
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => { onState = listener; return { remove: jest.fn() }; });
  await render(<Testing />);
  expect(screen.getByText("Start testing")).toBeTruthy();
  await fireEvent.press(screen.getByText("Start testing"));
  await act(() => jest.advanceTimersByTime(2000));
  expect(screen.getByLabelText("Inhale. 3 seconds remaining.")).toBeTruthy();
  await act(() => onState("background"));
  await act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByLabelText("Paused. 3 seconds remaining.")).toBeTruthy();
  await fireEvent.press(screen.getByText("Resume"));
  await act(() => jest.advanceTimersByTime(3000));
  expect(screen.getByLabelText("Exhale. 5 seconds remaining.")).toBeTruthy();
  await fireEvent.press(screen.getByText("Restart"));
  expect(screen.getByText("Start testing")).toBeTruthy();
  expect(screen.getByLabelText("Paused. 5 seconds remaining.")).toBeTruthy();
  await fireEvent.press(screen.getByText("Start testing"));
  await act(() => jest.advanceTimersByTime(60000));
  expect(screen.getByLabelText("Completed. 0 seconds remaining.")).toBeTruthy();
  expect(screen.getByText("Try again")).toBeTruthy();
  await fireEvent.press(screen.getByText("Try again"));
  expect(screen.getByText("Start testing")).toBeTruthy();
});
