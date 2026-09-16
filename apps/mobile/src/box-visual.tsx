import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "@inout/design-tokens";
import type { snapshot } from "@inout/breathing-engine";
import { boxPoint as boxPointForTrail, boxSamples } from "./box-path";

type Snapshot = ReturnType<typeof snapshot>;
const phaseColors = [colors.inhale, colors.hold, colors.exhale, colors.rest];

export function BoxVisual({ view, running, reduced }: {
  view: Snapshot;
  running: boolean;
  reduced: boolean;
}) {
  const [size, setSize] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const phase = view.phaseIndex % 4;
  const color = phaseColors[phase];
  // Resample from the authoritative engine on phase changes and pause/resume.
  // Native transforms interpolate between those boundaries without JS frame updates.
  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(phase + (reduced ? 0.5 : view.phaseElapsedMs / Math.max(1, view.phase.durationMs)));
    if (!running || reduced) return;
    const animation = Animated.timing(progress, {
      toValue: phase + 1,
      duration: view.phaseRemainingMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [view.cueKey, running, reduced, progress]);

  const points = useMemo(() => [0.055, 0.028, 0].map((lag) => {
    const samples = boxSamples.map((sample) => {
      // Offset samples around the closed path for a short, continuous light trail.
      const position = (sample.progress - lag + 4) % 4;
      return boxPointForTrail(position);
    });
    return {
      translateX: progress.interpolate({ inputRange: boxSamples.map((p) => p.progress), outputRange: samples.map((p) => p.x * size) }),
      translateY: progress.interpolate({ inputRange: boxSamples.map((p) => p.progress), outputRange: samples.map((p) => p.y * size) }),
    };
  }), [progress, size]);

  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <View style={styles.halo} />
    <View style={styles.frame} onLayout={(event) => setSize(event.nativeEvent.layout.width)}>
      <View style={[styles.track, { borderRadius: size * 0.09 }]} />
      <View style={[styles.track, { borderRadius: size * 0.09,
        borderTopColor: phase === 0 ? color : "transparent",
        borderRightColor: phase === 1 ? color : "transparent",
        borderBottomColor: phase === 2 ? color : "transparent",
        borderLeftColor: phase === 3 ? color : "transparent", opacity: 0.55 }]} />
      {size > 0 && points.map((point, index) => (reduced && index !== 2 ? null :
        <Animated.View key={index} testID={index === 2 ? "box-guide" : undefined}
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

const styles = StyleSheet.create({
  frame: { position: "absolute", left: "10%", top: "10%", width: "80%", height: "80%" },
  halo: { position: "absolute", left: "18%", top: "18%", width: "64%", height: "64%", borderRadius: 48, backgroundColor: "#adc6ff05" },
  track: { position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderWidth: 2, borderColor: colors.sessionBorder },
  marker: { position: "absolute", left: -6, top: -6, width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 34, height: 34, borderRadius: 17, opacity: 0.12 },
  core: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.text },
});
