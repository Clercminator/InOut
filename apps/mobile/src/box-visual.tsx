import { resolvePacerTheme, type PacerThemeId } from "./pacer-theme";
import type { ThemeColors } from "@inout/design-tokens";
import { useTheme, useThemedStyles } from "./theme";
import { useLanguage } from "./use-language";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import type { Phase } from "@inout/shared-types";
import type { snapshot } from "@inout/breathing-engine";
import { boxPoint as boxPointForTrail, boxSamples, trianglePoint, triangleSamples, triangleVertices } from "./box-path";
import { useExperience } from "./experience-context";


type Snapshot = ReturnType<typeof snapshot>;

export function BoxVisual({ view, running, reduced, pacerTheme, geometry = "box", phases }: {
  view: Snapshot;
  running: boolean;
  reduced: boolean;
  pacerTheme?: PacerThemeId;
  geometry?: "box" | "triangle";
  phases?: readonly Phase[];
}) {
  const { colors, palettes } = useTheme();
  const styles = useLocalStyles();
  useLanguage();
  const palette = palettes[useExperience().experience.palette];
  const theme = pacerTheme ? resolvePacerTheme(pacerTheme).preview : null;
  const phaseColors = theme ? [theme.ring, theme.glow, theme.ring, theme.secondaryText] : [palette.accent, palette.hold, palette.exhale, colors.rest];
  const [size, setSize] = useState(0);
  const clock = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(0)).current;
  const sides = geometry === "triangle" ? 3 : 4;
  const samples = geometry === "triangle" ? triangleSamples : boxSamples;
  const pointFor = geometry === "triangle" ? trianglePoint : boxPointForTrail;
  const phase = view.phaseIndex % sides;
  const color = phaseColors[geometry === "triangle" ? [0, 2, 3][phase] : phase];
  const durations = Array.from({ length: sides }, (_, i) => phases?.[i]?.durationMs ?? view.phase.durationMs);
  const durationsKey = durations.join(",");
  const boundaries = useMemo(() => durations.reduce((times, ms) => [...times, times[times.length - 1] + ms], [0]), [durationsKey]);
  const cycleMs = boundaries[sides];
  const progress = useMemo(() => Animated.modulo(Animated.add(clock, offset), cycleMs).interpolate({
    inputRange: boundaries, outputRange: boundaries.map((_, index) => index),
  }), [clock, offset, boundaries, cycleMs]);
  const staticCue = reduced ? view.cueKey : undefined;
  // Run the entire closed path on the native clock, including corners and cycle wrap.
  // Phase changes only recolor the track; they never stop/restart the moving guide.
  useEffect(() => {
    clock.stopAnimation();
    clock.setValue(0);
    offset.setValue(boundaries[phase] + (reduced ? durations[phase] / 2 : view.phaseElapsedMs));
    if (!running || reduced) return;
    const animation = Animated.loop(Animated.timing(clock, {
      toValue: cycleMs, duration: cycleMs, easing: Easing.linear,
      useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [running, reduced, clock, offset, geometry, view.blockIndex, view.sessionStartedAt, boundaries, staticCue]);

  const points = useMemo(() => [0.055, 0.028, 0].map((lag) => {
    const trail = samples.map((sample) => {
      // Offset samples around the closed path for a short, continuous light trail.
      const position = (sample.progress - lag + sides) % sides;
      return pointFor(position);
    });
    return {
      translateX: progress.interpolate({ inputRange: samples.map((p) => p.progress), outputRange: trail.map((p) => p.x * size) }),
      translateY: progress.interpolate({ inputRange: samples.map((p) => p.progress), outputRange: trail.map((p) => p.y * size) }),
    };
  }), [progress, size, geometry]);

  return <View testID={`${geometry}-session-geometry`} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <View style={styles.frame} onLayout={(event) => setSize(event.nativeEvent.layout.width)}>
      {geometry === "triangle" ? triangleVertices.map((from, index) => {
        const to = triangleVertices[(index + 1) % 3];
        return <View key={index} style={{ position: "absolute", left: from.x * size, top: from.y * size - 1,
          width: size, height: 2, borderRadius: 1, backgroundColor: phase === index ? color : colors.sessionBorder,
          transformOrigin: "left center", transform: [{ rotate: `${Math.atan2(to.y - from.y, to.x - from.x)}rad` }] }} />;
      }) : <><View style={[styles.track, { borderRadius: size * 0.09 }]} />
      <View style={[styles.track, { borderRadius: size * 0.09,
        borderTopColor: phase === 0 ? color : "transparent",
        borderRightColor: phase === 1 ? color : "transparent",
        borderBottomColor: phase === 2 ? color : "transparent",
        borderLeftColor: phase === 3 ? color : "transparent", opacity: 0.55 }]} /></>}
      {size > 0 && points.map((point, index) => (reduced && index !== 2 ? null :
        <Animated.View key={index} testID={index === 2 ? `${geometry}-guide` : undefined}
          style={[styles.marker, {
            opacity: index === 2 ? 1 : index === 1 ? 0.25 : 0.1,
            backgroundColor: color,
            transform: [{ translateX: point.translateX }, { translateY: point.translateY }],
          }]}>
          {index === 2 && <><View style={[styles.glow, { backgroundColor: color }]} /><View style={styles.core} /></>}
        </Animated.View>
      ))}
    </View>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  frame: { position: "absolute", left: "10%", top: "10%", width: "80%", height: "80%" },
  track: { position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderWidth: 2, borderColor: colors.sessionBorder },
  marker: { position: "absolute", left: -6, top: -6, width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 34, height: 34, borderRadius: 17, opacity: 0.12 },
  core: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.text },
});
function useLocalStyles() { return useThemedStyles(createStyles); }
