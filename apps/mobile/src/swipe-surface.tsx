import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, PanResponder, View } from "react-native";
import { SwipeIntent, type SwipeDirection } from "./swipe-navigation";

const ExcludeSwipe = createContext<() => void>(() => {});
/** Place around controls that own horizontal gestures (charts, sliders, carousels). */
export function SwipeExclusion({ children }: PropsWithChildren) {
  const exclude = useContext(ExcludeSwipe);
  return <View onTouchStart={exclude}>{children}</View>;
}

export function SwipeSurface({ children, onSwipe, canSwipe, feedback = true, testID = "swipe-surface" }: PropsWithChildren<{
  onSwipe?: (direction: SwipeDirection) => void; canSwipe?: (direction: SwipeDirection) => boolean; feedback?: boolean; testID?: string;
}>) {
  const callback = useRef(onSwipe); callback.current = onSwipe;
  const permitted = useRef(canSwipe); permitted.current = canSwipe;
  const blocked = useRef(false), intent = useRef(new SwipeIntent()), last = useRef(-Infinity);
  const [reduced, setReduced] = useState(true), [reader, setReader] = useState(true);
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setReduced(v); }).catch(() => {});
    void AccessibilityInfo.isScreenReaderEnabled().then(v => { if (alive) setReader(v); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    const screenReader = AccessibilityInfo.addEventListener("screenReaderChanged", setReader);
    return () => { alive = false; motion.remove(); screenReader.remove(); offset.stopAnimation(); };
  }, [offset]);
  useEffect(() => { if (reduced || reader) { offset.stopAnimation(); offset.setValue(0); } }, [reduced, reader, offset]);
  const handlers = useMemo(() => {
    const reset = () => {
      if (reduced || !feedback) offset.setValue(0);
      else Animated.timing(offset, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    };
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: (_, g) => {
        if (g.numberActiveTouches > 1) intent.current.update(g.dx, g.dy, g.numberActiveTouches);
        else { blocked.current = false; intent.current = new SwipeIntent(); }
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => !reader && !blocked.current && !!callback.current &&
        intent.current.update(g.dx, g.dy, g.numberActiveTouches) &&
        (permitted.current?.(g.dx < 0 ? "left" : "right") ?? true),
      onPanResponderGrant: () => offset.stopAnimation(),
      onPanResponderMove: (_, g) => { intent.current.update(g.dx, g.dy, g.numberActiveTouches); if (!reduced && feedback) offset.setValue(Math.max(-36, Math.min(36, g.dx * .22))); },
      onPanResponderRelease: (_, g) => {
        const direction = intent.current.direction(g.dx, g.dy, g.vx), now = Date.now();
        if (direction && !reader && now - last.current >= 260 && !blocked.current && (permitted.current?.(direction) ?? true)) {
          offset.stopAnimation(); offset.setValue(0);
          last.current = now; callback.current?.(direction);
        } else reset();
      },
      onPanResponderTerminate: reset,
      onPanResponderTerminationRequest: () => true,
    }).panHandlers;
  }, [offset, reduced, reader, feedback]);
  const exclude = useCallback(() => { blocked.current = true; }, []);
  return <ExcludeSwipe.Provider value={exclude}>
    <Animated.View testID={testID} style={{ flex: 1, transform: [{ translateX: offset }] }} {...handlers}>{children}</Animated.View>
  </ExcludeSwipe.Provider>;
}
