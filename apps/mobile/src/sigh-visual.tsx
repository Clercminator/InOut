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
import type { Protocol, Phase } from "@inout/shared-types";
import { Copy } from "./ui";
import { BoxVisual } from "./box-visual";
type Snapshot = ReturnType<typeof snapshot>;
export function SighVisual({
  view,
  running,
  animationType = "sigh",
  phases = [],
}: {
  view: Snapshot;
  running: boolean;
  animationType?: Protocol["animationType"];
  phases?: Phase[];
}) {
  const [reduced, setReduced] = useState(true);
  const scale = useRef(new Animated.Value(0.7)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const phaseProgress = Math.min(
    1,
    view.phaseElapsedMs / Math.max(1, view.phase.durationMs),
  );
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
    ripple.stopAnimation();
    if (reduced) ripple.setValue(0);
    if (!running || reduced || animationType !== "ripple" || view.phase.type !== "hum") return;
    ripple.setValue(0);
    const animation = Animated.loop(Animated.timing(ripple, {
      toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [running, reduced, view.cueKey, animationType, ripple]);
  useEffect(() => {
    scale.stopAnimation();
    let previous = 1;
    for (let offset = 1; offset <= phases.length; offset++) {
      const phase = phases[(view.phaseIndex - offset + phases.length) % phases.length];
      if (["exhale", "hum"].includes(phase.type)) { previous = 0.65; break; }
      if (["inhale", "inhaleTopUp"].includes(phase.type)) break;
    }
    const from =
      view.phase.type === "inhale"
        ? 0.65
        : view.phase.type === "inhaleTopUp"
          ? 0.9
          : previous;
    const to =
      view.phase.type === "inhale"
        ? animationType === "sigh" ? 0.9 : 1
        : view.phase.type === "inhaleTopUp"
          ? 1
          : view.phase.type === "exhale" || view.phase.type === "hum" ? 0.65 : from;
    if (animationType === "box") { scale.setValue(1); return; }
    scale.setValue(reduced ? 1 : from + (to - from) * phaseProgress);
    if (!running || reduced) return;
    const animation = Animated.timing(scale, {
      toValue: to,
      duration: view.phaseRemainingMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [view.cueKey, running, reduced, scale, animationType]);
  const shapeStyle =
    animationType === "ripple"
          ? styles.ripple
          : animationType === "pulse"
            ? styles.pulse
            : animationType === "wave"
              ? styles.orb
              : styles.ring;
  const phaseColor = view.phase.type === "inhale" || view.phase.type === "inhaleTopUp"
    ? c.inhale : view.phase.type === "exhale" || view.phase.type === "hum"
      ? c.exhale : view.phaseIndex === 3 ? c.rest : c.hold;
  return (
    <View style={styles.area}>
      {animationType !== "box" && animationType !== "alternating" && animationType !== "ripple" && <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[shapeStyle, { borderColor: phaseColor, transform: [{ scale }] }]}
      />}
      {animationType === "box" && <BoxVisual view={view} running={running} reduced={reduced} />}
      {animationType === "alternating" && (["left", "right"] as const).map((side) => (
        <Animated.View key={side} accessible={false} importantForAccessibility="no-hide-descendants"
          style={[styles.airChannel, {
            left: side === "left" ? "4%" : "78%",
            borderColor: view.phase.nostril === side ? phaseColor : c.sessionBorder,
            backgroundColor: view.phase.nostril === side ? phaseColor + "15" : "transparent",
            opacity: view.phase.nostril === side ? 1 : 0.4,
            transform: [{ scaleY: view.phase.nostril === side ? scale : 0.65 }],
          }]} />
      ))}
      {animationType === "ripple" && [0, 1, 2].map((index) => (
        <Animated.View key={index} accessible={false} importantForAccessibility="no-hide-descendants"
          style={[styles.ripple, {
            borderColor: phaseColor,
            opacity: reduced || !running || view.phase.type !== "hum" ? 0.3 : ripple.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.35, 0.2, 0] }),
            transform: [{ scale: reduced ? 0.72 + index * 0.13 : ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6 + index * 0.12, 0.78 + index * 0.12] }) }],
          }]} />
      ))}
      {animationType === "sigh" && (
        <Animated.View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.sighCore, { backgroundColor: phaseColor, transform: [{ scale }] }]}
        />
      )}
      {animationType === "wave" && (
        <Animated.View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.orbHighlight, { transform: [{ scale }] }]}
        />
      )}
      <View
        style={styles.readout}
        accessibilityLabel={`${view.phase.label}. Cycle ${view.currentCycle} of ${view.totalCycles}`}
      >
        <Copy style={[styles.phase, { color: running ? phaseColor : c.secondaryText }]}>{running ? view.phase.label.toUpperCase() : "PAUSED"}</Copy>
        {view.phase.nostril && <Copy>{view.phase.nostril.toUpperCase()} NOSTRIL</Copy>}
        <Copy style={styles.timer}>
          {Math.ceil(view.phaseRemainingMs / 1000)
            .toString()
            .padStart(2, "0")}
        </Copy>
        <Copy style={styles.cycle}>
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
    borderWidth: 2,
    borderColor: c.accent,
    backgroundColor: "#adc6ff08",
  },
  airChannel: { position: "absolute", top: "15%", width: "18%", height: "70%", borderRadius: 999, borderWidth: 2 },
  ripple: {
    position: "absolute",
    width: "94%",
    height: "94%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: c.accent,
    backgroundColor: "transparent",
  },
  pulse: {
    position: "absolute",
    width: "58%",
    height: "58%",
    borderRadius: 999,
    borderWidth: 10,
    borderColor: c.inhale,
    backgroundColor: "#adc6ff12",
  },
  orb: {
    position: "absolute",
    width: "58%",
    height: "58%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: c.accent,
    backgroundColor: "#adc6ff24",
    shadowColor: c.accent,
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 12,
  },
  orbHighlight: {
    position: "absolute",
    width: "34%",
    height: "34%",
    borderRadius: 999,
    backgroundColor: "#ffffff22",
  },
  sighCore: {
    position: "absolute",
    width: "54%",
    height: "54%",
    borderRadius: 999,
    backgroundColor: c.accent,
    opacity: 0.08,
    shadowColor: c.accent,
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 10,
  },
  readout: { alignItems: "center", gap: 8, maxWidth: "72%" },
  phase: { fontFamily: f.label, fontSize: 13, letterSpacing: 2, textAlign: "center" },
  cycle: { fontFamily: f.label, fontSize: 11, letterSpacing: 1.2, color: c.secondaryText },
  timer: {
    fontFamily: f.metric,
    fontSize: 72,
    lineHeight: 82,
    fontVariant: ["tabular-nums"],
  },
});
