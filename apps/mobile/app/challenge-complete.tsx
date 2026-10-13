import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSession, SaveError } from "../src/provider";
import { definitionForState, challengeCatalog } from "../src/challenges";
import { Screen, Title, Label, Copy, Button } from "../src/ui";
import { ChallengeArt } from "../src/challenge-art";
import { AchievementMark } from "../src/achievement-mark";
import { message, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { useTheme } from "../src/theme";
export default function ChallengeComplete() {
  useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>(), c = useSession(), { colors } = useTheme();
  const state = c.challenges().find(s => s.challengeId === id), current = challengeCatalog().find(d => d.id === id);
  const d = current ? definitionForState(current, state) : undefined;
  const reveal = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (state?.status === "completed" && !state.celebrationSeen && !c.error) c.acknowledgeChallenge(id); }, [c, id, state?.status, state?.celebrationSeen, c.error]);
  useEffect(() => { let mounted = true; void AccessibilityInfo.isReduceMotionEnabled().then(reduced => { if (mounted && !reduced) { reveal.setValue(.94); Animated.spring(reveal, { toValue: 1, useNativeDriver: true, damping: 18 }).start(); } }).catch(() => {}); return () => { mounted = false; reveal.stopAnimation(); }; }, [reveal]);
  if (!d || state?.status !== "completed") return <Screen><Title>Your next milestone is ahead.</Title><Button title="Explore challenges" onPress={() => router.replace("/(tabs)/challenges")} /></Screen>;
  return <Screen hideHeader><View style={{ alignItems: "center", paddingTop: 24, gap: 14 }}><Label>CHALLENGE COMPLETE</Label><Title>{d.title}</Title></View>
    <Animated.View style={{ transform: [{ scale: reveal }], paddingVertical: 10 }}><ChallengeArt art={d.artKey} height={250} /><View style={{ alignItems: "center", marginTop: -50 }}><AchievementMark earned size={100} /></View></Animated.View>
    <View style={{ alignItems: "center", gap: 14 }}><Copy style={{ color: colors.accent, fontSize: 22, lineHeight: 28, fontWeight: "700", textAlign: "center" }}>{message("{0} practices · {1} min", [state.progress, Math.floor(state.completedSteps.reduce((n, s) => n + s.elapsedMs, 0) / 60000)])}</Copy><Copy style={{ textAlign: "center", color: colors.secondaryText }}>{d.id === "three-by-three" ? "3 days. 9+ minutes. Done." : "You kept making space for yourself. This moment is yours."}</Copy><Label>{message("{0} badge earned", [t(d.title)])}</Label></View>
    <Button title="Share achievement" onPress={() => router.push({ pathname: "/challenge-share", params: { id } })} />
    <Button title="Close" secondary disabled={!!c.error} onPress={() => { if (c.acknowledgeChallenge(id)) { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/challenges"); } }} /><SaveError />
  </Screen>;
}
