import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet, View } from "react-native";
import type { snapshot } from "@inout/breathing-engine";
import type { Phase } from "@inout/shared-types";
import { breathingGuidance, smoothBreath } from "./breathing-guidance";

const artwork = require("../assets/pulse-orb.png");

/** Static brand art has no animation or timers on browsing screens. */
export function PulseArtwork({ size = 180 }: { size?: number }) {
  return <Image source={artwork} accessible={false} resizeMode="contain" style={{ width: size, height: size }} />;
}

/** Experimental only. Both transforms follow the existing engine's phase clock. */
export function PulseOrb({ view, phases, running, motionEnabled = true }: {
  view: ReturnType<typeof snapshot>; phases: Phase[]; running: boolean; motionEnabled?: boolean;
}) {
  const [reduced, setReduced] = useState(true);
  const guidance = breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs);
  const volume = useRef(new Animated.Value(guidance.volume)).current;
  const turn = useRef(new Animated.Value(0)).current;
  const scale = useMemo(() => volume.interpolate({ inputRange: [0, 1], outputRange: [0.70, 1] }), [volume]);
  const rotate = useMemo(() => turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }), [turn]);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    volume.stopAnimation();
    turn.stopAnimation();
    if (reduced || !motionEnabled) { volume.setValue(1); turn.setValue(0); return; }
    volume.setValue(guidance.volume);
    turn.setValue(view.sessionElapsedMs / 60000);
    if (!running) return;
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
      Animated.timing(turn, {
        toValue: (view.sessionElapsedMs + view.phaseRemainingMs) / 60000,
        duration: view.phaseRemainingMs, easing: t => t, useNativeDriver: true, isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
    // Phase boundaries and resume resync from the authoritative snapshot; timer ticks do not restart native animation.
  }, [view.cueKey, running, reduced, motionEnabled, volume, turn]);
  return <View testID="pulse-orb" accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ width: "100%", maxWidth: 300, aspectRatio: 1, alignSelf: "center" }}>
    <Animated.Image source={artwork} resizeMode="contain" style={[StyleSheet.absoluteFill,
      { width: "100%", height: "100%", transform: [{ scale: reduced || !motionEnabled ? 1 : scale }, { rotate }] }]} />
  </View>;
}
