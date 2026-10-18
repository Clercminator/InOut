import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { snapshot } from "@inout/breathing-engine";
import type { Phase } from "@inout/shared-types";
import { breathingGuidance, smoothBreath } from "./breathing-guidance";
import { resolvePacerTheme, type PacerThemeId } from "./pacer-theme";

const artwork = require("../assets/pulse-orb.png");

/** Static brand art has no animation or timers on browsing screens. */
export function PulseArtwork({ size = 180, theme = "default" }: { size?: number; theme?: PacerThemeId }) {
  const resolved = resolvePacerTheme(theme);
  return <Image source={artwork} accessible={false} resizeMode="contain" style={{ width: size, height: size, tintColor: resolved.preview.ring, opacity: 0.92 }} />;
}

/** Bounded native layers; all movement follows the existing phase clock. No frame-loop JS or blur. */
export function PulseOrb({ view, phases, running, motionEnabled = true, size = 260, theme = "default" }: {
  view: ReturnType<typeof snapshot>; phases: Phase[]; running: boolean; motionEnabled?: boolean; size?: number; theme?: PacerThemeId;
}) {
  const [reduced, setReduced] = useState(true);
  const guidance = breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs);
  const volume = useRef(new Animated.Value(guidance.volume)).current;
  const resolved = useMemo(() => resolvePacerTheme(theme), [theme]);
  const base = resolved.preview;

  const scale = useMemo(() => volume.interpolate({ inputRange: [0, 1], outputRange: [0.70, 1] }), [volume]);
  const rotate = useMemo(() => volume.interpolate({ inputRange: [0, 1], outputRange: ["-28deg", "28deg"] }), [volume]);
  const reverse = useMemo(() => volume.interpolate({ inputRange: [0, 1], outputRange: ["36deg", "-42deg"] }), [volume]);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    volume.stopAnimation();
    if (reduced || !motionEnabled) { volume.setValue(0.7); return; }
    volume.setValue(guidance.volume);
    if (!running || guidance.from === guidance.to) return;
    const phaseProgress = guidance.progress;
    const animation = Animated.parallel([
      Animated.timing(volume, {
        toValue: guidance.to, duration: view.phaseRemainingMs, useNativeDriver: true,
        isInteraction: false,
        easing: t => {
          const from = smoothBreath(phaseProgress);
          return from >= 1 ? 1 : (smoothBreath(phaseProgress + (1 - phaseProgress) * t) - from) / (1 - from);
        },
      }),
    ]);
    animation.start();
    return () => animation.stop();
    // Phase boundaries and resume resync from the authoritative snapshot; timer ticks do not restart native animation.
  }, [view.cueKey, phases, running, reduced, motionEnabled, volume]);
  return <View testID="pulse-orb" accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, maxWidth: "100%", alignSelf: "center" }}>
    <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: `${base.glow}14`, transform: [{ scale: 1.08 }] }]} />
    <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, transform: [{ scale: reduced || !motionEnabled ? .9 : scale }] }]}>
      <LinearGradient colors={[base.background, base.surface, base.ring, base.background]} start={{ x: .1, y: 1 }} end={{ x: .85, y: .05 }}
        style={{ flex: 1, borderRadius: size / 2, overflow: "hidden", borderWidth: 1, borderColor: `${base.ring}99` }}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <LinearGradient colors={[`${base.ring}CC`, `${base.glow}22`, `${base.background}00`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ position: "absolute", width: "130%", height: "52%", left: "-15%", top: "8%", borderRadius: size, borderTopWidth: 3, borderColor: `${base.ring}99`, transform: [{ rotate: "-24deg" }] }} />
          <View style={{ position: "absolute", width: "110%", height: "64%", left: "-6%", top: "39%", borderRadius: size, borderTopWidth: 10, borderColor: `${base.ring}66`, backgroundColor: `${base.surface}88`, transform: [{ rotate: "23deg" }] }} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: reverse }] }]}>
          <View style={{ position: "absolute", width: "65%", height: "115%", left: "8%", top: "-8%", borderRadius: size, borderRightWidth: 4, borderColor: `${base.glow}99`, backgroundColor: `${base.ring}22`, transform: [{ rotate: "-38deg" }] }} />
        </Animated.View>
        <LinearGradient colors={[`${base.background}00`, `${base.background}BB`]} style={StyleSheet.absoluteFill} start={{ x: .5, y: .35 }} end={{ x: .5, y: 1 }} />
      </LinearGradient>
    </Animated.View>
  </View>;
}
