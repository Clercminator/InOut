import { SessionReadout } from "./session-readout";
import { sessionAnimationSize } from "./session-layout";
import { resolvePacerTheme, type PacerThemeId } from "./pacer-theme";
import type { ThemeColors } from "@inout/design-tokens";
import { useTheme, useThemedStyles } from "./theme";
import { t } from "./i18n";
import { useLanguage } from "./use-language";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { typography as f } from "@inout/design-tokens";
import type { snapshot } from "@inout/breathing-engine";
import type { Protocol, Phase } from "@inout/shared-types";
import { Copy } from "./ui";
import { BoxVisual } from "./box-visual";
import { breathingGuidance, smoothBreath } from "./breathing-guidance";
import { useExperience } from "./experience-context";

type Snapshot = ReturnType<typeof snapshot>;
export function SighVisual({
  view,
  running,
  animationType = "sigh",
  phases = [],
  cycleLabel,
  pacerTheme,
  availableHeight, nextLabel,
}: {
  view: Snapshot;
  running: boolean;
  animationType?: Protocol["animationType"];
  phases?: Phase[];
  cycleLabel?: string;
  pacerTheme?: PacerThemeId;
  availableHeight?: number; nextLabel?: string;
}) {
  const { colors: baseColors, palettes } = useTheme();
  const theme = pacerTheme ? resolvePacerTheme(pacerTheme).preview : null;
  const c = theme ? { ...baseColors, text: theme.text, secondaryText: theme.secondaryText, rest: theme.glow, sessionBorder: theme.ring } : baseColors;
  const styles = useLocalStyles();
  useLanguage();
  const { experience } = useExperience();
  const palette = theme ? { accent: theme.ring, exhale: theme.ring, hold: theme.glow } : palettes[experience.palette];
  const [reduced, setReduced] = useState(true);
  const { width, height, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const [readoutHeight, setReadoutHeight] = useState(190 * fontScale);
  const size = sessionAnimationSize(measuredWidth ?? width - 56, availableHeight ?? height * .7, readoutHeight);
  const guidance = breathingGuidance(phases.length ? phases : [view.phase], phases.length ? view.phaseIndex : 0, view.phaseElapsedMs);
  // Animate absolute volume: changing phases must never remap the previous
  // phase's final progress through the next phase's reversed size curve.
  const progress = useRef(new Animated.Value(guidance.volume)).current;
  const scale = useMemo(() => progress.interpolate({
    inputRange: [0, 1], outputRange: [0.45, 1],
  }), [progress]);
  const ripple = useRef(new Animated.Value(0)).current;
  const phaseProgress = Math.min(
    1,
    view.phaseElapsedMs / Math.max(1, view.phase.durationMs),
  );
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    }).catch(() => {});
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
      toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [running, reduced, view.cueKey, animationType, ripple]);
  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(guidance.volume);
    if (!running || reduced) return;
    const animation = Animated.timing(progress, {
      toValue: guidance.to,
      duration: view.phaseRemainingMs,
      easing: (t) => {
        const start = smoothBreath(phaseProgress);
        return start >= 1 ? 1 : (smoothBreath(phaseProgress + (1 - phaseProgress) * t) - start) / (1 - start);
      },
      useNativeDriver: true, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [view.cueKey, running, reduced, progress]);
  const shapeStyle =
    animationType === "ripple"
          ? styles.ripple
          : animationType === "pulse"
            ? styles.pulse
            : animationType === "wave"
              ? styles.orb
              : styles.ring;
  const phaseColor = guidance.inward ? palette.accent : guidance.outward ? palette.exhale : guidance.full ? palette.hold : c.rest;
  const breathScale = reduced ? 1 : scale;
  const textureStyle = experience.texture === "halo"
    ? { borderWidth: 5, shadowColor: phaseColor, shadowOpacity: 0.5, shadowRadius: 20 }
    : experience.texture === "orbit" ? { borderStyle: "dotted" as const, borderWidth: 3 } : undefined;
  return (
    <View testID={`specialized-${animationType}`} pointerEvents="none" style={{ gap: 12, backgroundColor: theme?.background, borderRadius: 24 }}>
    <View testID="session-animation-area" onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)} style={{ width: "100%", height: size, alignItems: "center" }}>
    <View style={[styles.area, { width: size * .9, height: size * .9, maxWidth: undefined, margin: size * .05 }]}>
      {animationType === "box" && <BoxVisual phases={phases} view={view} running={running} reduced={reduced} />}
      {animationType !== "alternating" && animationType !== "ripple" && <Animated.View
        testID="breathing-bubble"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[shapeStyle, textureStyle,
          { borderColor: phaseColor, transform: [{ scale: breathScale }] }]}
      />}
      {animationType === "alternating" && (["left", "right"] as const).map((side) => (
        <Animated.View key={side} accessible={false} importantForAccessibility="no-hide-descendants"
          style={[styles.airChannel, textureStyle, {
            left: side === "left" ? "4%" : "78%",
            borderColor: view.phase.nostril === side ? phaseColor : c.sessionBorder,
            backgroundColor: view.phase.nostril === side ? phaseColor + "15" : "transparent",
            opacity: view.phase.nostril === side ? 1 : 0.4,
            transform: [{ scaleY: view.phase.nostril === side ? breathScale : 0.65 }],
          }]} />
      ))}
      {animationType === "ripple" && [0, 1, 2].map((index) => (
        <Animated.View key={index} accessible={false} importantForAccessibility="no-hide-descendants"
          style={[styles.ripple, textureStyle, {
            borderColor: phaseColor,
            opacity: reduced || !running || view.phase.type !== "hum" ? 0.3 : ripple.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.35, 0.2, 0] }),
            transform: [{ scale: breathScale }, { scale: reduced || view.phase.type !== "hum" ? 0.72 + index * 0.13 : ripple.interpolate({ inputRange: [0, 1], outputRange: [0.72 + index * 0.13, 0.80 + index * 0.13] }) }],
          }]} />
      ))}
      {animationType === "sigh" && (
        <Animated.View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.sighCore, { backgroundColor: phaseColor, transform: [{ scale: breathScale }] }]}
        />
      )}
      {animationType === "wave" && (
        <Animated.View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.orbHighlight, { transform: [{ scale: breathScale }] }]}
        />
      )}
    </View>
    </View>
    <SessionReadout view={view} phases={phases} running={running} cycleLabel={cycleLabel} pacerTheme={pacerTheme} nextLabel={nextLabel}
      onLayout={event => setReadoutHeight(event.nativeEvent.layout.height)} />
    </View>
  );
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
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
    backgroundColor: c.accent + "08",
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
    backgroundColor: c.accent + "12",
  },
  orb: {
    position: "absolute",
    width: "58%",
    height: "58%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: c.accent,
    backgroundColor: c.accent + "24",
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
    backgroundColor: c.text + "22",
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
function useLocalStyles() { return useThemedStyles(createStyles); }
