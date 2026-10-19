import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet, View } from "react-native";
import type { snapshot } from "@inout/breathing-engine";
import type { Phase } from "@inout/shared-types";
import { breathingGuidance, smoothBreath } from "./breathing-guidance";
import { resolvePacerTheme, type PacerThemeId } from "./pacer-theme";

const artwork = require("../assets/pulse-orb.png");

/** Static brand art has no animation or timers on browsing screens. */
export function PulseArtwork({ size = 180, theme = "default" }: { size?: number; theme?: PacerThemeId }) {
  return <Image testID="pulse-artwork" source={artwork} accessible={false} resizeMode="contain" style={{ width: size, height: size }} />;
}

/** Approved artwork; native scale follows the existing phase clock. Themes color only the outer glow. */
export function PulseOrb({ view, phases, running, motionEnabled = true, size = 260, theme = "default", minimumScale = .7 }: {
  view: ReturnType<typeof snapshot>; phases: Phase[]; running: boolean; motionEnabled?: boolean; size?: number; theme?: PacerThemeId; minimumScale?: number;
}) {
  const [reduced, setReduced] = useState(true);
  const guidance = breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs);
  const volume = useRef(new Animated.Value(guidance.volume)).current;
  const resolved = useMemo(() => resolvePacerTheme(theme), [theme]);
  const base = resolved.preview;

  const scale = useMemo(() => volume.interpolate({ inputRange: [0, 1], outputRange: [minimumScale, 1] }), [volume, minimumScale]);
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
  return <View pointerEvents="none" testID="pulse-orb" accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, maxWidth: "100%", alignSelf: "center", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <Animated.View style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center", transform: [{ scale: reduced || !motionEnabled ? .9 : scale }] }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: `${base.glow}14` }]} />
      <Image testID="pulse-branded-art" source={artwork} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
    </Animated.View>
  </View>;
}
