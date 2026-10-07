import { useTheme } from "./theme";
import { t } from "./i18n";
import { useLanguage } from "./use-language";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSession } from "./provider";
import { experienceFor, weeklyPractice, cosmetics } from "./experience";
import { Button, Card, Copy, Label, useStyles } from "./ui";
export function WeeklyGoal({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const s = useStyles();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  useLanguage();
  const controller = useSession();
  const e = experienceFor(controller.preferences);
  const weekly = weeklyPractice(controller.history(), controller.rewards(), e.weeklyGoal);
  const progress = Math.min(1, weekly.count / weekly.goal);
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!mounted) return;
      if (reduced) fill.setValue(progress);
      else { animation = Animated.timing(fill, { toValue: progress, duration: 650, useNativeDriver: false }); animation.start(); }
    }).catch(() => { if (mounted) fill.setValue(progress); });
    return () => { mounted = false; animation?.stop(); };
  }, [progress, fill]);
  const next = cosmetics.find(item => !controller.rewards().badges.some(b => b.id === item.badge));
  return <Card style={{ borderColor: colors.gold + "55" }}>
    <Label>YOUR WEEK</Label>
    <View style={{ flexDirection: stacked ? "column" : "row", alignItems: stacked ? "flex-start" : "center", gap: 16 }}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center" }}>
        {Array.from({ length: weekly.goal }, (_, i) => {
          const angle = i * Math.PI * 2 / weekly.goal - Math.PI / 2;
          return <Animated.View key={i} style={{ position: "absolute", left: 33 + Math.cos(angle) * 31, top: 33 + Math.sin(angle) * 31,
            width: 10, height: 10, borderRadius: 5, backgroundColor: colors.exhale,
            opacity: fill.interpolate({ inputRange: [Math.max(0, i / weekly.goal), (i + 1) / weekly.goal], outputRange: [0.15, 1], extrapolate: "clamp" }) }} />;
        })}
        <Copy style={[s.subtitle, { color: colors.gold }]}>{Math.min(weekly.count, weekly.goal)}/{weekly.goal}</Copy>
      </View>
      <Copy style={[s.subtitle, { flex: stacked ? undefined : 1 }]}>{weekly.count >= weekly.goal ? "You did it! Weekly goal complete." : `${weekly.count} of ${weekly.goal} practice days`}</Copy>
    </View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: weekly.goal, now: Math.min(weekly.count, weekly.goal), text: t(`${weekly.count} of ${weekly.goal} practice days`) }} style={{ height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.border }}>
      <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: colors.exhale, width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
    </View>
    <Copy style={s.small}>A short practice counts. Your earned badges stay with you.</Copy>
    {!compact && <>
      {next && <Copy>Next unlock: {next.label} · {next.requirement}.</Copy>}
      <Button title="My goals & rewards" secondary onPress={() => router.push("/personalize")} />
    </>}
  </Card>;
}
