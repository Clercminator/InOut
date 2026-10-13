import { useCallback, useEffect, useRef } from "react";
import { View, Animated, AccessibilityInfo } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { BackScreen, Title, Label, Copy, Card, Button } from "../src/ui";
import { useSession } from "../src/provider";
import { attemptComparison, testDefinition, testCatalog } from "../src/challenge-tests";
import { ChallengeArt } from "../src/challenge-art";
import { AchievementMark } from "../src/achievement-mark";
import { useTheme } from "../src/theme";
import { useLanguage } from "../src/use-language";
import { message, t } from "../src/i18n";
export default function ChallengeAttemptResult() {
  useLanguage();
  const { attempt, fresh } = useLocalSearchParams<{ attempt: string; fresh?: string }>(), c = useSession(), { colors } = useTheme();
  const a = c.testAttempts().find(a => a.id === attempt), d = testDefinition(a?.challengeId ?? ""), celebrated = useRef(false);
  const programId = c.challenges().find(s => s.status === "completed" && !s.celebrationSeen && s.completedSteps.some(step => step.sessionId === attempt))?.challengeId;
  useFocusEffect(useCallback(() => { if (fresh === "1" && programId && !c.error) router.push({ pathname: "/challenge-complete", params: { id: programId } }); }, [fresh, programId, c.error]));
  const reveal = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let mounted = true;
    if (fresh === "1" && a?.completed) void AccessibilityInfo.isReduceMotionEnabled().then(reduced => { if (mounted && !reduced) { reveal.setValue(.95); Animated.spring(reveal, { toValue: 1, useNativeDriver: true, damping: 18 }).start(); } }).catch(() => {});
    return () => { mounted = false; reveal.stopAnimation(); };
  }, [fresh, a?.id, a?.completed, reveal]);
  useEffect(() => { if (fresh === "1" && a?.completed && c.preferences.haptics && !celebrated.current) { celebrated.current = true; void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } }, [fresh, a?.id, a?.completed, c.preferences.haptics]);
  if (!a || !d) return <BackScreen title="Challenges"><Copy>Result unavailable</Copy></BackScreen>;
  const comparison = attemptComparison(a, c.testAttempts());
  const best = comparison.currentBest;
  return <BackScreen title={d.title}>
    <View style={{ alignItems: "center", gap: 12 }}><Label>{comparison.isPersonalBest ? "NEW PERSONAL BEST" : a.completed ? "CHALLENGE COMPLETE" : "ATTEMPT SAVED"}</Label><Title>{d.title}</Title></View>
    <Animated.View style={{ transform: [{ scale: reveal }] }}><ChallengeArt art={d.art} height={180} /></Animated.View>
    <View style={{ alignItems: "center", gap: 14 }}>
      {a.completed && <AchievementMark earned size={76} />}
      <Copy translate={false} style={{ fontSize: 56, lineHeight: 68, fontWeight: "700", color: colors.accent }}>{d.id === "state-shift-60" ? `${a.before} → ${a.after}` : `${a.value.toFixed(1)} ${t(d.unit)}`}</Copy>
      {d.id === "state-shift-60" && <><Label>{message("{0} in 60 seconds", [a.value > 0 ? `+${a.value}` : a.value])}</Label><Copy>Self-reported tension · 1–10</Copy><Copy>Results vary. A change in either direction is a valid result.</Copy></>}
      {d.id === "nasal-10" && <Copy>{a.completed ? "Ten comfortable minutes. A practice for everyday life." : "Every attempt teaches you something. Try again when it feels right."}</Copy>}
    </View>
    {d.type === "benchmark" && <Card><Label>PERSONAL HISTORY</Label><Copy>{message("Best: {0} sec", [best?.toFixed(1) ?? "—"])}</Copy><Copy>{message("Attempts: {0}", [comparison.attemptCount])}</Copy>
      {comparison.previousAttempt !== null && <Copy>{message("Previous attempt: {0} sec", [comparison.previousAttempt.toFixed(1)])}</Copy>}
      {comparison.previousBest !== null && <Copy>{message("Previous best: {0} sec", [comparison.previousBest.toFixed(1)])}</Copy>}
      {comparison.isPersonalBest && <Copy>{message("+{0} sec from your previous best", [comparison.improvement!.toFixed(1)])}</Copy>}
      {d.id === "comfort-hold" && <Copy>Repeatability matters more than duration. Always stop at the first desire to breathe.</Copy>}
    </Card>}
    <Button title="Share result" onPress={() => router.push({ pathname: "/challenge-share", params: { attempt: a.id } })} />
    <Button title="Try again" secondary onPress={() => { c.analytics.track("challenge_retried"); router.replace({ pathname: "/challenge-test", params: { id: d.id } }); }} />
    <Button title="Done" secondary onPress={() => router.replace("/(tabs)/challenges")} />
  </BackScreen>;
}
