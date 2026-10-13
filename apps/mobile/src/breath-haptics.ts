import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import type { Phase, Preferences } from "@inout/shared-types";

export function hapticOffsets(phase: Phase, mode: Preferences["hapticMode"]) {
  if (mode === "rhythm") return undefined;
  return phase.type === "inhale" && phase.durationMs >= 400 ? [0, 140] : [0];
}

export function emitBreathHaptic(style: "medium" | "light" | "soft") {
  // Android's impact fallback can be a long buzzer. Use its purpose-built tactile ticks.
  const effect = Platform.OS === "android"
    ? Haptics.performAndroidHapticsAsync(style === "soft" ? Haptics.AndroidHaptics.Segment_Frequent_Tick : Haptics.AndroidHaptics.Segment_Tick)
    : Haptics.impactAsync(style === "soft" ? Haptics.ImpactFeedbackStyle.Soft : Haptics.ImpactFeedbackStyle.Light);
  void effect.catch(() => {});
}
