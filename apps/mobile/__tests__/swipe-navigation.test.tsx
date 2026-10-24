import React from "react";
import { AccessibilityInfo, Animated, PanResponder, View } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SwipeExclusion, SwipeSurface } from "../src/swipe-surface";

const gesture = (dx = 0, dy = 0, numberActiveTouches = 1) => ({ dx, dy, numberActiveTouches } as any);
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(false);
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
test("horizontal swipes navigate once, rapid repeats are suppressed, and vertical movement stays scrolling", async () => {
  const create = jest.spyOn(PanResponder, "create"), navigate = jest.fn();
  await render(<SwipeSurface onSwipe={navigate}><View /></SwipeSurface>);
  const handlers = create.mock.calls.at(-1)![0];
  const swipe = (dx: number, dy = 0) => {
    handlers.onStartShouldSetPanResponderCapture?.({} as any, gesture());
    const accepts = handlers.onMoveShouldSetPanResponderCapture?.({} as any, gesture(dx, dy));
    if (accepts) handlers.onPanResponderRelease?.({} as any, gesture(dx, dy));
    return accepts;
  };
  await act(() => { expect(swipe(-90)).toBe(true); swipe(-90); });
  expect(navigate.mock.calls).toEqual([["left"]]);
  await act(() => jest.advanceTimersByTime(400));
  await act(() => { swipe(90); expect(swipe(10, 90)).toBe(false); });
  expect(navigate.mock.calls).toEqual([["left"], ["right"]]);
});
test("nested horizontal controls own their touches and cancellation never navigates", async () => {
  const create = jest.spyOn(PanResponder, "create"), navigate = jest.fn();
  await render(<SwipeSurface onSwipe={navigate}><SwipeExclusion><View testID="carousel" /></SwipeExclusion></SwipeSurface>);
  const handlers = create.mock.calls.at(-1)![0];
  handlers.onStartShouldSetPanResponderCapture?.({} as any, gesture());
  await fireEvent(screen.getByTestId("carousel"), "touchStart");
  expect(handlers.onMoveShouldSetPanResponderCapture?.({} as any, gesture(-100))).toBe(false);
  await act(() => handlers.onPanResponderTerminate?.({} as any, gesture(-100)));
  expect(navigate).not.toHaveBeenCalled();
});
test("screen readers retain native gestures and reduced motion never starts a translation animation", async () => {
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(true);
  const create = jest.spyOn(PanResponder, "create"), animation = jest.spyOn(Animated, "timing");
  await render(<SwipeSurface onSwipe={jest.fn()}><View /></SwipeSurface>);
  const handlers = create.mock.calls.at(-1)![0];
  expect(handlers.onMoveShouldSetPanResponderCapture?.({} as any, gesture(-100))).toBe(false);
  await act(() => handlers.onPanResponderTerminate?.({} as any, gesture(-100)));
  expect(animation).not.toHaveBeenCalled();
});
