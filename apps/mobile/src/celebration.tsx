import type { ThemeColors } from "@inout/design-tokens";
import { useTheme, useThemedStyles } from "./theme";
import { useLanguage } from "./use-language";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Animated, Easing, StyleSheet, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { Copy, Title } from "./ui";
import { useExperience } from "./experience-context";
import { chimes } from "./audio-library";
import { cosmetics, type Badge } from "./experience";
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

/** A short, non-blocking celebration; the message remains after the sparks fade. */
export function Celebration({ title, message, variant = "complete", awards = [] }: {
  title: string; message: string; variant?: "complete" | "saved"; awards?: Badge[];
}) {
  const { colors: c } = useTheme();
  const styles = useLocalStyles();
  useLanguage();
  const { experience, audio, haptics } = useExperience();
  const quiet = experience.celebration === "quiet";
  const playful = experience.celebration === "playful";
  const [reduced, setReduced] = useState(true);
  const burst = useRef(new Animated.Value(0)).current;
  const feedbackAttempted = useRef(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); });
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    if (reduced || quiet) return;
    burst.setValue(0);
    const animation = Animated.timing(burst, {
      toValue: 1, duration: playful || awards.length ? 2200 : 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [burst, reduced, quiet, playful]);
  useEffect(() => {
    if (variant !== "saved" || feedbackAttempted.current) return;
    feedbackAttempted.current = true;
    if (quiet) return;
    let disposed = false;
    let player: AudioPlayer | undefined;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      if (AppState.currentState !== "active") return;
      if (haptics) void (awards.length ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)).catch(() => {});
      if (audio !== "silent" && experience.chime !== "off") void (async () => {
        await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
        if (disposed) return;
        await setIsAudioActiveAsync(true);
        if (disposed || AppState.currentState !== "active") return;
        player = createAudioPlayer(chimes[experience.chime === "off" ? "bell" : experience.chime], { keepAudioSessionActive: false });
        player.volume = experience.celebrationVolume;
        player.play();
        releaseTimer = setTimeout(() => { player?.pause(); player?.remove(); player = undefined; }, awards.length ? 2200 : 900);
      })().catch(() => {});
    }, 300);
    const sub = AppState.addEventListener("change", state => { if (state !== "active") { disposed = true; player?.pause(); } });
    return () => { disposed = true; clearTimeout(timer); clearTimeout(releaseTimer); sub.remove(); player?.pause(); player?.remove(); };
  }, [variant, quiet, audio, haptics, experience.chime, experience.celebrationVolume]);
  return <View style={styles.card} accessibilityLiveRegion="polite">
    {!reduced && !quiet && <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {(playful || awards.length ? [0, 1, 2] : [1]).map(group => Array.from({ length: playful ? 12 : 8 }, (_, i) => {
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
    <View style={styles.badge}><MaterialIcons name={variant === "saved" ? "check" : "auto-awesome"} size={26} color={c.exhale} /></View>
    <Title>{title}</Title>
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
