import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import type { Phase, Preferences } from "@inout/shared-types";

export function hapticOffsets(phase: Phase, mode: Preferences["hapticMode"]) {
  if (mode === "rhythm") return undefined;
  return phase.type === "inhale" && phase.durationMs >= 400 ? [0, 140] : [0];
}

export function emitBreathHaptic(style: "medium" | "light" | "soft") {
  // Segment_Frequent_Tick is intentionally silent on some hardware. These established
  // feedback effects still respect Android's system touch-feedback setting.
  const effect = Platform.OS === "android"
    ? Haptics.performAndroidHapticsAsync(style === "soft" ? Haptics.AndroidHaptics.Clock_Tick : Haptics.AndroidHaptics.Context_Click)
    : Haptics.impactAsync(style === "soft" ? Haptics.ImpactFeedbackStyle.Soft : Haptics.ImpactFeedbackStyle.Light);
  return effect;
}
