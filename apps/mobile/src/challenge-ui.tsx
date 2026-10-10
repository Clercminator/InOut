import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { typography } from "@inout/design-tokens";
import { router } from "expo-router";
import { Pressable } from "./localized-native";
import { Copy, Label } from "./ui";
import { useTheme } from "./theme";
import { message, t } from "./i18n";
import { ChallengeArt } from "./challenge-art";
import { definitionForState, type ChallengeDefinition, type UserChallenge } from "./challenges";

export function ChallengeProgress({ definition: d, state }: { definition: ChallengeDefinition; state?: UserChallenge }) {
  d = definitionForState(d, state);
  const { colors } = useTheme();
  const progress = state?.progress ?? 0;
  return <View style={{ gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Label>{state?.status === "completed" ? "CHALLENGE COMPLETE" : "YOUR PROGRESS"}</Label><Copy style={{ fontFamily: typography.heading }}>{message("{0} / {1}", [progress, d.targetCount])}</Copy></View>
    <View accessibilityRole="progressbar" accessibilityLabel={t(d.title)} accessibilityValue={{ min: 0, max: d.targetCount, now: progress }} style={{ height: 6, borderRadius: 8, backgroundColor: colors.border }}><View style={{ height: 6, borderRadius: 8, width: `${progress / d.targetCount * 100}%`, backgroundColor: state?.status === "completed" ? colors.reward : colors.accent }} /></View>
  </View>;
}
export function ChallengeCard({ definition: d, state, pro, compact = false }: { definition: ChallengeDefinition; state?: UserChallenge; pro: boolean; compact?: boolean }) {
  d = definitionForState(d, state);
  const { colors } = useTheme();
  const locked = d.requiresPro && !pro && state?.status !== "completed";
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t(d.title)}. ${t(locked ? "Requires Pro" : state?.status === "completed" ? "CHALLENGE COMPLETE" : state ? "Continue" : "View challenge")}`} onPress={() => router.push({ pathname: "/challenge", params: { id: d.id } })}
    style={({ pressed }) => ({ padding: 12, gap: 16, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOpacity: .07, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 2, opacity: pressed ? .8 : 1 })}>
    {!compact && <ChallengeArt art={d.artKey} />}
    <View style={{ paddingHorizontal: 8, paddingBottom: 10, gap: 10 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Copy style={{ flex: 1, fontFamily: typography.heading, fontSize: 23, lineHeight: 29 }}>{d.title}</Copy>{d.requiresPro && <Copy style={{ color: colors.gold, fontFamily: typography.heading, fontSize: 11 }}>PRO</Copy>}</View>
      <Copy style={{ color: colors.secondaryText }}>{d.description}</Copy>
      {state ? <ChallengeProgress definition={d} state={state} /> : <Copy style={{ color: colors.secondaryText, fontSize: 12, lineHeight: 18 }}>{d.time}</Copy>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Copy style={{ flex: 1, fontFamily: typography.heading, color: colors.accent }}>{locked ? "Discover challenge" : state?.status === "completed" ? "View achievement" : state ? "Continue" : "Start challenge"}</Copy><MaterialIcons accessible={false} name={locked ? "lock-outline" : "arrow-forward"} size={22} color={colors.accent} /></View>
    </View>
  </Pressable>;
}
