import React from "react";
import { AccessibilityInfo, Animated } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { SighVisual } from "../src/sigh-visual";
import { start, snapshot } from "@inout/breathing-engine";
import { planFor, protocols } from "@inout/protocols";

afterEach(() => jest.restoreAllMocks());

test("both holds are explicit to sight and screen readers, and paused guidance releases the pacing", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const protocol = protocols.find(p => p.id === "box")!;
  const state = start(planFor(protocol), 0);
  const rendered = await render(<SighVisual view={snapshot(state, 4000)} running animationType="box" phases={protocol.phases} />);
  expect(screen.getByLabelText(/Hold after inhale. 4 seconds remaining/)).toBeTruthy();
  await rendered.rerender(<SighVisual view={snapshot(state, 12000)} running animationType="box" phases={protocol.phases} />);
  expect(screen.getByLabelText(/Hold after exhale. 4 seconds remaining/)).toBeTruthy();
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
