import { FeatureCard } from "../../src/feature-card";
import { duration } from "../../src/format";
import { useTheme } from "../../src/theme";
import { t, protocolTitle, message, countLabel } from "../../src/i18n";
import { useLanguage } from "../../src/use-language";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Screen, Title, Label, Copy, Button, Card, ActionRow, IconButton, Chip, Disclosure } from "../../src/ui";
import { useSession } from "../../src/provider";
import { protocols, isCyclic } from "@inout/protocols";
import type { Goal, PracticeGoal } from "@inout/shared-types";
import { AdSlot } from "../../src/ad-slot";
import { experienceFor, welcomeMessage } from "../../src/experience";
import { WeeklyGoal } from "../../src/practice-rewards";
import { goalContent, recommendPractice } from "../../src/personalization";
import { practiceStats } from "../../src/progress";
import { productConfig } from "../../src/product-config";
import { GuidanceAllowance } from "../../src/guidance-allowance";

const situationGoals: Record<Goal, PracticeGoal> = { Calm: "stress", Sleep: "sleep", Focus: "focus", Perform: "pressure", Recover: "performance", Energize: "energy" };
export default function Today() {
  const { colors } = useTheme();
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
  const stats = practiceStats(records);
  const recommendation = recommendPractice(goal, records, id => controller.entitlements.protocolAccess({ id }).allowed);
  const recent = records.find(r => r.source !== "manual" && protocols.some(p => p.id === r.protocolId));
  const returning = welcomeMessage(records);
  return <Screen tabScreen headerAction={<View style={{ flexDirection: "row" }}><IconButton title="My practice profile" icon="person-outline" onPress={() => router.push("/profile")} /><IconButton title="Open settings" icon="settings" onPress={() => router.push("/settings")} /></View>}>
    <View style={{ gap: 8 }}><Label>TODAY</Label><Title translate={!experience.name}>{experience.name ? message("Welcome, {0}", [experience.name.split(" ")[0]]) : t("Breathe for what's next.")}</Title>
      {controller.preferences.experience?.intention && <Copy translate={false}>{experience.intention}</Copy>}
      <Copy>{stats.current ? message("{0} day streak · A little space for yourself", [stats.current]) : "A fresh moment. An easy place to begin."}</Copy>
    </View>
    {current?.stage === "active" && <Button title="Return to paused session" onPress={() => router.push("/session")} />}
    {current?.stage === "post" && <Button title="Finish your State Shift" onPress={() => router.push("/post")} />}
    <FeatureCard featured eyebrow="FOR YOU" title={protocolTitle(recommendation)} description={content.heading}
      detail={`${duration(recommendation.defaultDuration)} · ${countLabel(recommendation.defaultCycles, "cycle")}`}
      icon={content.icon} tone="accent" action="Start practice" onPress={() => router.push({ pathname: "/pre", params: { id: recommendation.id } })} />
    <GuidanceAllowance />
    <View style={{ gap: 12 }}><Label>WHAT DO YOU NEED?</Label><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {(Object.keys(situationGoals) as Goal[]).map(situation => <Chip key={situation} title={situation} selected={content.situation === situation} onPress={() => { setMoment(situationGoals[situation]); controller.analytics.track("situation_selected"); }} />)}
    </ScrollView></View>
    {returning && <Copy>{returning}</Copy>}
    {!primary && <Card style={{ backgroundColor: colors.accentSurface }}><Label>MAKE IT YOURS</Label><Copy>Choose a goal for recommendations that fit your day.</Copy><Button title="Personalize InOut" secondary onPress={() => router.push("/personalize")} /></Card>}
    <Card><Label>BREATHE NOW</Label><ActionRow title="48-second reset" icon="air" onPress={() => router.push("/pre")} /><ActionRow title="Explore protocols" icon="grid-view" onPress={() => router.push("/(tabs)/protocols")} /><ActionRow title="Custom patterns & mixes" icon="tune" onPress={() => router.push("/(tabs)/custom")} /></Card>
    {(favorite || recent) && <Card><Label>YOUR FAMILIAR RHYTHMS</Label>
      {favorite && <Button translate={false} title={message("Start {0}", [favorite.name])} disabled={!!controller.error || (!!current && current.stage !== "result")} onPress={() => { if (isCyclic(favorite.protocol)) router.push({ pathname: "/pre", params: { ritualId: favorite.id } }); else if (controller.startRitual(favorite.id)) router.push("/session"); }} />}
      {recent && <Button title={message("Start {0}", [protocolTitle(protocols.find(p => p.id === recent.protocolId)!)])} secondary onPress={() => router.push({ pathname: "/pre", params: { id: recent.protocolId } })} />}
      <ActionRow title="My rituals" icon="auto-awesome" onPress={() => router.push("/rituals")} />
    </Card>}
    {productConfig.learn && <Disclosure title="Learn about your breath" icon="school" summary="A little understanding before you begin."><Label>{content.title}</Label><Copy>{content.body}</Copy><ActionRow title="Explore this protocol" icon="air" onPress={() => router.push({ pathname: "/protocol", params: { id: recommendation.id } })} /><ActionRow title="Breathing safety" icon="health-and-safety" onPress={() => router.push("/safety")} /></Disclosure>}
    <WeeklyGoal /><Card><ActionRow title="View progress" icon="insights" onPress={() => router.push("/(tabs)/progress")} /></Card><AdSlot placement="today" />
  </Screen>;
}
