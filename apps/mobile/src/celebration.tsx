import type { ThemeColors } from "@inout/design-tokens";
import { useTheme, useThemedStyles } from "./theme";
import { useLanguage } from "./use-language";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Animated, Easing, StyleSheet, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { Button, Copy, Title } from "./ui";
import { useExperience } from "./experience-context";
import { chimes, chimeDurationMs } from "./audio-library";
import { cosmetics, type Badge } from "./experience";
import { createAudioPreview } from "./preview-audio";
import * as Haptics from "expo-haptics";

/** A short, non-blocking celebration; the message remains after the sparks fade. */
export function Celebration({ title, message, variant = "complete", awards = [], enabled = true, quietPractice = false, duration, milestone = false }: {
  title: string; message: string; variant?: "complete" | "saved"; awards?: Badge[]; enabled?: boolean; quietPractice?: boolean; duration?: string; milestone?: boolean;
}) {
  const { colors: c } = useTheme();
  const styles = useLocalStyles();
  useLanguage();
  const { experience, audio, haptics } = useExperience();
  const quiet = quietPractice || experience.celebration === "quiet";
  const [skipped, setSkipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const playful = experience.celebration === "playful";
  const rewarded = milestone || awards.length > 0;
  const [reduced, setReduced] = useState(true);
  const burst = useRef(new Animated.Value(0)).current;
  const feedbackAttempted = useRef(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    if (reduced || quiet || !enabled || skipped) { burst.setValue(1); return; }
    setAnimating(true);
    burst.setValue(0);
    const animation = Animated.timing(burst, {
      toValue: 1, duration: playful || rewarded ? 1800 : 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start(() => setAnimating(false));
    return () => animation.stop();
  }, [burst, reduced, quiet, playful, enabled, skipped, rewarded]);
  useEffect(() => {
    if (!enabled || variant !== "saved" || feedbackAttempted.current) return;
    feedbackAttempted.current = true;
    if (quiet) return;
    let playback: ReturnType<typeof createAudioPreview> | undefined;
    const timer = setTimeout(() => {
      if (AppState.currentState !== "active") return;
      if (haptics) void (rewarded ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)).catch(() => {});
      if (audio !== "silent" && experience.chime !== "off") {
        playback = createAudioPreview(() => {}, () => {});
        void playback.start([{ source: chimes[experience.chime], volume: experience.celebrationVolume, at: 0 }], chimeDurationMs[experience.chime] + 300);
      }
    }, 300);
    return () => { clearTimeout(timer); playback?.stop(); };
  }, [enabled, variant, quiet, audio, haptics, experience.chime, experience.celebrationVolume]);
  return <View style={styles.card} accessibilityLiveRegion="polite">
    {enabled && !skipped && !reduced && !quiet && <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {(playful || rewarded ? [0, 1, 2] : [1]).map(group => Array.from({ length: playful ? 12 : 8 }, (_, i) => {
        const angle = i * Math.PI / 5;
        const radius = 30 + (i % 3) * 11;
        return <Animated.View key={`${group}-${i}`} style={[styles.spark, {
          width: experience.celebrationStyle === "confetti" ? 6 : 3,
          left: `${18 + group * 32}%`, top: group === 1 ? 28 : 58,
          backgroundColor: [c.accent, c.exhale, c.gold][i % 3],
          opacity: burst.interpolate({ inputRange: [0, 0.12, 0.65, 1], outputRange: [0, 1, 0.7, 0] }),
          transform: [
            { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * radius] }) },
            { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * radius + 12] }) },
            { rotate: `${i * 36}deg` },
          ],
        }]} />;
      }))}
    </View>}
    <Animated.View style={[styles.badge, { transform: [{ scale: enabled && !reduced && !quiet && !skipped ? burst.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.85, 1.12, 1] }) : 1 }] }]}><MaterialIcons name={rewarded ? "emoji-events" : variant === "saved" ? "check" : "auto-awesome"} size={26} color={c.exhale} /></Animated.View>
    <Title>{title}</Title>
    {duration && <Copy translate={false} style={{ fontSize: 30, fontWeight: "700", color: c.exhale }}>{duration}</Copy>}
    {enabled && animating && !skipped && !reduced && <Button title="Skip animation" variant="quiet" onPress={() => { setSkipped(true); setAnimating(false); burst.stopAnimation(); burst.setValue(1); }} />}
    <Copy style={styles.message}>{message}</Copy>
    {awards.map(badge => <Copy key={badge.id} style={{ color: c.exhale, textAlign: "center" }}>✦ {badge.label}</Copy>)}
    {cosmetics.filter(item => awards.some(b => b.id === item.badge)).map(item => <Copy key={item.id} style={{ color: c.accent, textAlign: "center" }}>Unlocked · {item.label}</Copy>)}
  </View>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  card: { overflow: "hidden", alignItems: "center", gap: 10, padding: 24, borderRadius: 24,
    borderWidth: 1, borderColor: c.exhale + "55", backgroundColor: c.card },
  badge: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: c.exhale + "45", backgroundColor: c.exhale + "12" },
  message: { textAlign: "center", color: c.secondaryText },
  spark: { position: "absolute", width: 3, height: 7, borderRadius: 2 },
});
function useLocalStyles() { return useThemedStyles(createStyles); }
