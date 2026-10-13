import { useEffect } from "react";
import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { protocols } from "@inout/protocols";
import { BackScreen, Title, Copy, Label, Card, Button, ActionRow } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { definitionForState, challengeCatalog, challengeExpired, challengeShareable } from "../src/challenges";
import { ChallengeArt } from "../src/challenge-art";
import { ChallengeProgress } from "../src/challenge-ui";
import { useTheme } from "../src/theme";
import { useLanguage } from "../src/use-language";
import { dayKey } from "../src/progress";
import { message, protocolTitle, t } from "../src/i18n";
export default function ChallengeDetail() {
  useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useSession(), { colors } = useTheme();
  const state = c.challenges().find(s => s.challengeId === id), current = challengeCatalog().find(d => d.id === id);
  const d = current ? definitionForState(current, state) : undefined;
  const locked = !!d?.requiresPro && !c.entitlements.state.pro && state?.status !== "completed";
  useEffect(() => { c.analytics.track("challenge_viewed"); if (locked) c.analytics.track("challenge_locked_tapped"); }, [c, id, locked]);
  if (!d) return <BackScreen title="Challenges"><Title>Challenge unavailable</Title><Button title="Explore challenges" onPress={() => router.replace("/(tabs)/challenges")} /></BackScreen>;
  const expired = !!state && challengeExpired(d, state);
  const practicedToday = state?.completedSteps.some(step => step.localDay === dayKey(new Date())) && d.qualificationRules.mode === "days";
  const candidates = d.recommendedProtocolIds.map(id => protocols.find(p => p.id === id)!).filter(Boolean);
  const recommended = d.qualificationRules.mode === "sequence" ? candidates[state?.progress ?? 0] : d.qualificationRules.mode === "unique" ? candidates.find(p => !state?.completedSteps.some(s => s.protocolId === p.id)) : candidates[(state?.progress ?? 0) % candidates.length];
  const start = () => {
    if (locked) { router.push({ pathname: "/pro", params: { source: "challenges" } }); return; }
    if ((!state || expired) && !c.enrollChallenge(d.id)) return;
    const next = expired ? candidates[0] : recommended;
    if (next) router.push({ pathname: "/pre", params: { id: next.id, minSeconds: String(d.qualificationRules.minSeconds) } });
  };
  return <BackScreen title="Challenges">
    <ChallengeArt art={d.artKey} height={230} />
    <View style={{ gap: 8 }}><Label>{d.requiresPro ? "INOUT PRO CHALLENGE" : "FREE CHALLENGE"}</Label><Title>{d.title}</Title><Copy>{d.description}</Copy><Copy style={{ color: colors.secondaryText }}>{d.time}</Copy></View>
    <ChallengeProgress definition={d} state={state} />
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{Array.from({ length: d.targetCount }, (_, index) => <View key={index} accessible accessibilityLabel={message("Step {0} of {1}", [index + 1, d.targetCount])} style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: index < (state?.progress ?? 0) ? colors.accent : colors.raised }}>
      {index < (state?.progress ?? 0) ? <MaterialIcons accessible={false} name="check" size={18} color={colors.onAccent} /> : <Copy style={{ fontSize: 12 }}>{index + 1}</Copy>}
    </View>)}</View>
    {expired ? <Card><Label>A FRESH START</Label><Copy>Your challenge window has ended. Start again when it feels right.</Copy></Card> : state?.status !== "completed" && <Card style={{ backgroundColor: colors.accentSurface }}><Label>{practicedToday ? "TODAY IS COMPLETE" : "YOUR NEXT PRACTICE"}</Label><Copy>{practicedToday ? "You made space today. Return tomorrow for your next step." : recommended ? protocolTitle(recommended) : d.whatCounts}</Copy></Card>}
    {state?.status === "completed" ? <Button title="View achievement" onPress={() => router.push({ pathname: "/challenge-complete", params: { id } })} /> : <Button title={locked ? "Unlock with InOut Pro" : expired ? "Restart challenge" : !state ? "Start challenge" : practicedToday ? "Explore protocols" : "Start today's practice"} disabled={!!c.error} onPress={practicedToday && !locked ? () => router.push("/protocols") : start} />}
    {challengeShareable(d, state) && <Button title="Share my progress" secondary onPress={() => router.push({ pathname: "/challenge-share", params: { id } })} />}
    <Card><Label>WHAT COUNTS</Label><Copy>{d.whatCounts}</Copy><Copy style={{ color: colors.secondaryText, fontSize: 13 }}>Only practices completed in the app after joining count. Manual entries and high-intensity practices are excluded.</Copy></Card>
    <Card><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><MaterialIcons accessible={false} name="workspace-premium" color={colors.gold} size={36} /><View style={{ flex: 1 }}><Label>YOUR REWARD</Label><Copy>{message("{0} badge", [t(d.title)])}</Copy></View></View></Card>
    {d.qualificationRules.mode === "unique" && !!state?.completedSteps.length && <Card><Label>EXPLORED</Label>{state.completedSteps.map(step => <Copy key={step.protocolId}>{protocolTitle(protocols.find(p => p.id === step.protocolId)!)}</Copy>)}</Card>}
    {d.qualificationRules.mode === "sequence" && <Card><Label>YOUR PRACTICES</Label>{candidates.map((p, i) => <Copy key={p.id}>{message("{0}. {1}", [i + 1, protocolTitle(p)])}</Copy>)}</Card>}
    <Copy style={{ color: colors.secondaryText, fontSize: 13 }}>Breathe comfortably. Progress comes from practice, never from pushing your limits.</Copy>
    <ActionRow title="Breathing safety" icon="health-and-safety" onPress={() => router.push("/safety")} /><SaveError />
  </BackScreen>;
}
