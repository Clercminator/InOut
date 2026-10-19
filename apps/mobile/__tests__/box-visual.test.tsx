import React from "react";
import { Animated } from "react-native";
import { render } from "@testing-library/react-native";
import { BoxVisual } from "../src/box-visual";
import { start, snapshot } from "@inout/breathing-engine";
import { planFor, protocols } from "@inout/protocols";

const box = protocols.find(p => p.id === "box")!;
const state = start(planFor(box), 0);
const animation = () => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
afterEach(() => jest.restoreAllMocks());

test.each(["box", "triangle"] as const)("%s native guide continues through every corner and cycle without React restarting it", async geometry => {
  const protocol = protocols.find(p => p.id === (geometry === "box" ? "box" : "box-2"))!;
  const engine = start(planFor(protocol), 0);
  const cycleMs = protocol.phases.reduce((sum, phase) => sum + phase.durationMs, 0);
  const loop = animation();
  jest.spyOn(Animated, "loop").mockReturnValue(loop);
  const timing = jest.spyOn(Animated, "timing").mockReturnValue(animation());
  const rendered = await render(<BoxVisual geometry={geometry} phases={protocol.phases} view={snapshot(engine, 0)} running reduced={false} />);
  for (let time = 1000; time < cycleMs * 3; time += 1000)
    await rendered.rerender(<BoxVisual geometry={geometry} phases={protocol.phases} view={snapshot(engine, time)} running reduced={false} />);
  expect(timing).toHaveBeenCalledTimes(1);
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: cycleMs, duration: cycleMs, useNativeDriver: true, isInteraction: false }));
  expect(loop.stop).not.toHaveBeenCalled();
});

test("unequal phase durations map each side onto the same native cycle timeline", async () => {
  const lengths = [3000, 6000, 5000, 2000];
  const custom = { ...box, phases: box.phases.map((p, i) => ({ ...p, durationMs: lengths[i] })) };
  jest.spyOn(Animated, "loop").mockReturnValue(animation());
  const interpolate = jest.spyOn(Object.getPrototypeOf(Animated.modulo(new Animated.Value(0), 16000)), "interpolate");
  await render(<BoxVisual phases={custom.phases} view={snapshot(start(planFor(custom), 0), 3500)} running reduced={false} />);
  expect(interpolate).toHaveBeenCalledWith({ inputRange: [0, 3000, 9000, 14000, 16000], outputRange: [0, 1, 2, 3, 4] });
});

test("pause and reduced motion stop the native loop; Resume reanchors to engine time", async () => {
  const loop = animation();
  jest.spyOn(Animated, "loop").mockReturnValue(loop);
  const setValue = jest.spyOn(Animated.Value.prototype, "setValue");
  const timing = jest.spyOn(Animated, "timing").mockReturnValue(animation());
  const rendered = await render(<BoxVisual phases={box.phases} view={snapshot(state, 1500)} running reduced={false} />);
  await rendered.rerender(<BoxVisual phases={box.phases} view={snapshot(state, 2000)} running={false} reduced={false} />);
  expect(loop.stop).toHaveBeenCalled();
  expect(timing).toHaveBeenCalledTimes(1);
  await rendered.rerender(<BoxVisual phases={box.phases} view={snapshot(state, 2000)} running reduced={false} />);
  expect(setValue).toHaveBeenLastCalledWith(2000);
  expect(timing).toHaveBeenCalledTimes(2);
  await rendered.rerender(<BoxVisual phases={box.phases} view={snapshot(state, 4500)} running reduced />);
  expect(setValue).toHaveBeenLastCalledWith(6000);
  expect(timing).toHaveBeenCalledTimes(2);
});
