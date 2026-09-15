import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { colors as c, typography as f } from "@inout/design-tokens";
import type { snapshot } from "@inout/breathing-engine";
import { Copy, Label } from "./ui";
type Snapshot = ReturnType<typeof snapshot>;
export function SighVisual({
  view,
  running,
}: {
  view: Snapshot;
  running: boolean;
}) {
  const [reduced, setReduced] = useState(true);
  const scale = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    scale.stopAnimation();
    const from =
      view.phase.type === "inhale"
        ? 0.65
        : view.phase.type === "inhaleTopUp"
          ? 0.9
          : 1;
    const to =
      view.phase.type === "inhale"
        ? 0.9
        : view.phase.type === "inhaleTopUp"
          ? 1
          : 0.65;
    scale.setValue(
      reduced
        ? 1
        : from + ((to - from) * view.phaseElapsedMs) / view.phase.durationMs,
    );
    if (!running || reduced) return;
    const animation = Animated.timing(scale, {
      toValue: to,
      duration: view.phaseRemainingMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [view.cueKey, running, reduced, scale]);
  return (
    <View style={styles.area}>
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.ring, { transform: [{ scale }] }]}
      />
      <View
        style={styles.readout}
        accessibilityLabel={`${view.phase.label}. Cycle ${view.currentCycle} of ${view.totalCycles}`}
      >
        <Label>{running ? view.phase.label.toUpperCase() : "PAUSED"}</Label>
        <Copy style={styles.timer}>
          {Math.ceil(view.phaseRemainingMs / 1000)
            .toString()
            .padStart(2, "0")}
        </Copy>
        <Copy>
          CYCLE {view.currentCycle}/{view.totalCycles}
        </Copy>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  area: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 320,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    width: "95%",
    height: "95%",
    borderRadius: 999,
    borderWidth: 3,
    borderColor: c.accent,
    backgroundColor: "#adc6ff08",
  },
  readout: { alignItems: "center", gap: 4 },
  timer: {
    fontFamily: f.metric,
    fontSize: 72,
    lineHeight: 82,
    fontVariant: ["tabular-nums"],
  },
});
