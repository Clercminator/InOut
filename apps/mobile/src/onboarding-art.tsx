import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { PracticeGoal } from "@inout/shared-types";
import { PulseArtwork } from "./pulse-orb";
import { useTheme } from "./theme";

/** A shared line-and-orbit vocabulary, drawn locally with native primitives. */
export function GoalMark({ goal, size = 48 }: { goal: PracticeGoal; size?: number }) {
  const { colors } = useTheme();
  const ring = { position: "absolute" as const, borderWidth: 1.5, borderColor: colors.accent, borderRadius: size };
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size * .32, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    {goal === "sleep" ? <><View style={[ring, { width: size * .56, height: size * .56, backgroundColor: colors.accent }]} /><View style={{ position: "absolute", width: size * .5, height: size * .5, borderRadius: size, backgroundColor: colors.accentSurface, left: size * .44, top: size * .1 }} /></>
      : goal === "performance" ? [0, 1, 2].map(i => <View key={i} style={{ position: "absolute", width: size * .11, height: size * (.24 + i * .13), bottom: size * .2, left: size * (.25 + i * .2), backgroundColor: colors.accent, borderRadius: size }} />)
      : [0, 1, 2].map(i => <View key={i} style={[ring, { width: size * (.22 + i * .23), height: size * (goal === "stress" || goal === "learn" ? .28 + i * .12 : .22 + i * .23), transform: [{ rotate: goal === "pressure" ? "45deg" : goal === "learn" ? "-25deg" : "0deg" }], borderRadius: goal === "pressure" ? size * .12 : size, opacity: 1 - i * .18 }]} />)}
    {goal === "energy" && <View style={{ width: size * .18, height: size * .18, borderRadius: size, backgroundColor: colors.accent }} />}
  </View>;
}

export function OnboardingHero({ compact = false }: { compact?: boolean }) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(compact ? 150 : 224, width - 96, height * .3);
  return <LinearGradient colors={["#EDF9F3", "#E1F1EA", "#F4EFFB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={{ borderRadius: 32, minHeight: size + 32, padding: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    {[1.1, 1.5, 1.9].map(scale => <View key={scale} style={{ position: "absolute", width: size * scale, height: size * scale, borderRadius: size, borderWidth: 1, borderColor: "#617C751F" }} />)}
    <PulseArtwork size={size} />
  </LinearGradient>;
}

export function OnboardingScene({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let alive = true;
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", () => { opacity.stopAnimation(); opacity.setValue(1); });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!alive || reduced) return;
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true, isInteraction: false }).start();
    }).catch(() => {});
    return () => { alive = false; listener.remove(); opacity.stopAnimation(); };
  }, [opacity]);
  return <Animated.View style={{ opacity, gap: 20 }}>{children}</Animated.View>;
}
