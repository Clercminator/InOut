import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { typography } from "@inout/design-tokens";
import { Pressable } from "../../src/localized-native";
import { ChallengeArt } from "../../src/challenge-art";
import { PulseArtwork } from "../../src/pulse-orb";
import { challengeCatalog } from "../../src/challenges";
import { ChallengeProgress } from "../../src/challenge-ui";
import { photoUri } from "../../src/profile-photo";
import { duration } from "../../src/format";
import { useTheme } from "../../src/theme";
import { t, protocolTitle, message } from "../../src/i18n";
import { useLanguage } from "../../src/use-language";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import { Screen, Title, Label, Copy, Button, Card, ActionRow, Chip } from "../../src/ui";
import { useSession } from "../../src/provider";
import { protocols, isCyclic } from "@inout/protocols";
import type { Goal, PracticeGoal } from "@inout/shared-types";
import { AdSlot } from "../../src/ad-slot";
import { experienceFor, welcomeMessage } from "../../src/experience";
import { WeeklyGoal } from "../../src/practice-rewards";
import { goalContent, recommendPractice } from "../../src/personalization";
import { practiceStats } from "../../src/progress";
import { GuidanceAllowance } from "../../src/guidance-allowance";

const situationGoals: Record<Goal, PracticeGoal> = { Calm: "stress", Sleep: "sleep", Focus: "focus", Perform: "pressure", Recover: "performance", Energize: "energy" };
export default function Today() {
  const { colors, mode } = useTheme();
  useLanguage();
  const controller = useSession();
  const { current } = controller;
  const experience = experienceFor(controller.preferences);
  const favorite = experience.rituals.find(r => r.id === experience.favoriteRitualId);
  const [moment, setMoment] = useState<PracticeGoal | null>(null);
  const primary = controller.preferences.journey?.primaryGoal;
  const goal = moment ?? primary ?? "stress";
  const content = goalContent[goal];
  const records = controller.history();
  const today = new Date().toDateString();
  const pro = controller.entitlements.state.pro;
  const stats = useMemo(() => practiceStats(records), [records, today]);
  const recommendation = useMemo(() => recommendPractice(goal, records, id => controller.entitlements.protocolAccess({ id }).allowed), [goal, records, pro, controller]);
  const recent = records.find(r => r.source !== "manual" && protocols.some(p => p.id === r.protocolId));
  const returning = welcomeMessage(records);
  const activeChallenge = controller.challenges().find(s => s.status === "active");
  const challenge = challengeCatalog().find(d => d.id === activeChallenge?.challengeId);
  const [photoFailed, setPhotoFailed] = useState(false);
  return <Screen tabScreen hideHeader>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1, gap: 4 }}><Copy style={{ color: colors.secondaryText }}>{experience.name ? "Welcome," : "Welcome to InOut"}</Copy><Title translate={!experience.name}>{experience.name || "A little space to breathe."}</Title></View>
      <Pressable accessibilityRole="button" accessibilityLabel={message("{0} day streak", [stats.current])} onPress={() => router.push({ pathname: "/(tabs)/progress", params: { view: "Overview" } })} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: colors.accentBorder, alignItems: "center", justifyContent: "center" }}><Copy style={{ fontFamily: typography.metric, fontSize: 19 }}>{stats.current}</Copy></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("My practice profile")} onPress={() => router.push("/profile")} style={{ width: 48, height: 48, borderRadius: 18, overflow: "hidden", backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" }}>{experience.photo && !photoFailed ? <Image source={{ uri: photoUri(experience.photo) }} onError={() => setPhotoFailed(true)} style={{ width: 48, height: 48 }} /> : <MaterialIcons accessible={false} name={experience.avatar} size={27} color={colors.accent} />}</Pressable>
    </View>
    {controller.preferences.experience?.intention && <Copy translate={false} style={{ color: colors.secondaryText }}>{experience.intention}</Copy>}
    {current?.stage === "active" && <Button title="Return to paused session" onPress={() => router.push("/session")} />}
    {current?.stage === "post" && <Button title="Finish your State Shift" onPress={() => router.push("/post")} />}
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Explore protocols")} onPress={() => router.push("/protocols")} style={({ pressed }) => ({ flex: 1.12, borderRadius: 26, overflow: "hidden", backgroundColor: colors.accentSurface, opacity: pressed ? .8 : 1 })}>
        {mode === "dark" ? <View style={{ height: 156, alignItems: "center", justifyContent: "center", backgroundColor: colors.lowest }}><PulseArtwork size={174} /></View> : <ChallengeArt art="waves" height={156} />}<View style={{ padding: 18, gap: 5 }}><Copy style={{ fontFamily: typography.heading, fontSize: 23, lineHeight: 28 }}>Breathe</Copy><Copy style={{ fontSize: 12, color: colors.secondaryText }}>Find your rhythm</Copy><MaterialIcons accessible={false} name="arrow-forward" size={23} color={colors.accent} /></View>
      </Pressable>
      <View style={{ flex: 1, gap: 12 }}>
        <HomeTile title="Quick reset" icon="air" tone="aqua" onPress={() => router.push("/pre")} />
        <HomeTile title="Create" icon="tune" tone="gold" onPress={() => router.push("/custom")} />
      </View>
    </View>
    <Card style={{ backgroundColor: colors.accentSurface, gap: 10 }}><Label>{content.title}</Label><Copy style={{ fontFamily: typography.heading, fontSize: 20, lineHeight: 27 }}>{content.heading}</Copy><Copy translate={false} style={{ color: colors.secondaryText }}>{protocolTitle(recommendation)} · {duration(recommendation.defaultDuration)}</Copy><Button title="Start practice" onPress={() => router.push({ pathname: "/pre", params: { id: recommendation.id } })} /></Card>
    <GuidanceAllowance />
    <View style={{ gap: 12 }}><Label>WHAT DO YOU NEED?</Label><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 20, alignItems: "center" }}>
      {(Object.keys(situationGoals) as Goal[]).map(situation => <Chip key={situation} title={situation} selected={content.situation === situation} onPress={() => { setMoment(situationGoals[situation]); controller.analytics.track("situation_selected"); }} />)}
    </ScrollView></View>
    {returning && <Copy>{returning}</Copy>}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      <QuickTile title="Saved practices" icon="bookmark-border" onPress={() => router.push("/custom")} />
      <QuickTile title="My rituals" icon="auto-awesome" onPress={() => router.push("/rituals")} />
      <QuickTile title="Create your rhythm" icon="graphic-eq" onPress={() => router.push("/custom-pattern")} />
      <QuickTile title="Learn breathing" icon="school" onPress={() => router.push("/learn")} />
    </View>
    <Card><Label>CHALLENGE</Label>{challenge ? <><Title>{challenge.title}</Title><ChallengeProgress definition={challenge} state={activeChallenge} /></> : <><Title>Try your first challenge</Title><Copy>Small steps. A habit that feels like you.</Copy></>}<ActionRow title={challenge ? "Continue challenge" : "Explore challenges"} icon="emoji-events" onPress={() => router.push("/(tabs)/challenges")} /></Card>
    {(favorite || recent) && <Card><Label>YOUR FAMILIAR RHYTHMS</Label>
      {favorite && <Button translate={false} title={message("Start {0}", [favorite.name])} disabled={!!controller.error || (!!current && current.stage !== "result")} onPress={() => { if (isCyclic(favorite.protocol)) router.push({ pathname: "/pre", params: { ritualId: favorite.id } }); else if (controller.startRitual(favorite.id)) router.push("/session"); }} />}
      {recent && <Button title={message("Start {0}", [protocolTitle(protocols.find(p => p.id === recent.protocolId)!)])} secondary onPress={() => router.push({ pathname: "/pre", params: { id: recent.protocolId } })} />}
      <ActionRow title="My rituals" icon="auto-awesome" onPress={() => router.push("/rituals")} />
    </Card>}
    <WeeklyGoal /><Card><ActionRow title="View progress" icon="insights" onPress={() => router.push("/(tabs)/progress")} /></Card><AdSlot placement="today" />
  </Screen>;
}

function HomeTile({ title, icon, tone, onPress }: { title: string; icon: keyof typeof MaterialIcons.glyphMap; tone: "aqua" | "gold"; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={t(title)} onPress={onPress} style={({ pressed }) => ({ flex: 1, minHeight: 116, padding: 18, gap: 14, borderRadius: 24, justifyContent: "space-between", backgroundColor: tone === "gold" ? colors.reward + "28" : colors.raised, opacity: pressed ? .8 : 1 })}><MaterialIcons accessible={false} name={icon} size={34} color={colors.accent} /><Copy style={{ fontFamily: typography.heading, fontSize: 18, lineHeight: 24 }}>{title}</Copy></Pressable>;
}
function QuickTile({ title, icon, onPress }: { title: string; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={t(title)} onPress={onPress} style={({ pressed }) => ({ flexBasis: "46%", flexGrow: 1, minHeight: 108, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 12, opacity: pressed ? .8 : 1 })}><MaterialIcons accessible={false} name={icon} size={25} color={colors.accent} /><Copy style={{ fontFamily: typography.heading, fontSize: 14, lineHeight: 20 }}>{title}</Copy></Pressable>;
}
