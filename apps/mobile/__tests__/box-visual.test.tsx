import React from "react";
import { Animated } from "react-native";
import { render } from "@testing-library/react-native";
import { BoxVisual } from "../src/box-visual";
import { start, snapshot } from "@inout/breathing-engine";
import { planFor, protocols } from "@inout/protocols";

const state = start(planFor(protocols.find((p) => p.id === "box")!), 0);
afterEach(() => jest.restoreAllMocks());

test.each([[0, 3000], [1, 6000], [2, 5000], [3, 2000]])("square edge %s uses its actual phase duration", async (phase, duration) => {
  const protocol = protocols.find(p => p.id === "box")!;
  const lengths = [3000, 6000, 5000, 2000];
  const custom = { ...protocol, phases: protocol.phases.map((p, i) => ({ ...p, durationMs: lengths[i] })) };
  const elapsed = lengths.slice(0, phase).reduce((sum, ms) => sum + ms, 0) + 500;
  const timing = jest.spyOn(Animated, "timing").mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  await render(<BoxVisual view={snapshot(start(planFor(custom), 0), elapsed)} running reduced={false} />);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: phase + 1, duration: duration - 500, useNativeDriver: true }));
});

test("box motion uses native timing and resumes from engine phase time", async () => {
  const stop = jest.fn();
  const timing = jest.spyOn(Animated, "timing").mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() });
  const rendered = await render(<BoxVisual view={snapshot(state, 1500)} running reduced={false} />);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 2500, toValue: 1, useNativeDriver: true }));
  await rendered.rerender(<BoxVisual view={snapshot(state, 2000)} running={false} reduced={false} />);
  expect(stop).toHaveBeenCalled();
  expect(timing).toHaveBeenCalledTimes(1);
  await rendered.rerender(<BoxVisual view={snapshot(state, 2000)} running reduced={false} />);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 2000 }));
});

test("reduced motion keeps a static phase guide and stops ongoing movement", async () => {
  const stop = jest.fn();
  const timing = jest.spyOn(Animated, "timing").mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() });
  const rendered = await render(<BoxVisual view={snapshot(state, 0)} running reduced />);
  expect(timing).not.toHaveBeenCalled();
  await rendered.rerender(<BoxVisual view={snapshot(state, 500)} running reduced={false} />);
  expect(timing).toHaveBeenCalledTimes(1);
  await rendered.rerender(<BoxVisual view={snapshot(state, 1000)} running reduced />);
  expect(stop).toHaveBeenCalled();
  expect(timing).toHaveBeenCalledTimes(1);
});
