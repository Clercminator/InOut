import { FeatureCard } from "../../src/feature-card";
import { duration } from "../../src/format";
import { useTheme } from "../../src/theme";
import { t, protocolTitle, message, countLabel } from "../../src/i18n";
import { useLanguage } from "../../src/use-language";
import { Pressable } from "../../src/localized-native";
import { router } from "expo-router";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { View } from "react-native";
import { Screen, Title, Label, Copy, Button, Card, ActionRow, useStyles } from "../../src/ui";
import { useSession } from "../../src/provider";
import { protocols, cyclic, isCyclic } from "@inout/protocols";
import type { Goal } from "@inout/shared-types";
import { AdSlot } from "../../src/ad-slot";
import { experienceFor } from "../../src/experience";
import { WeeklyGoal } from "../../src/practice-rewards";

const goals: { name: Goal; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { name: "Calm", icon: "spa" },
  { name: "Focus", icon: "center-focus-strong" },
  { name: "Perform", icon: "bolt" },
  { name: "Recover", icon: "replay" },
  { name: "Sleep", icon: "bedtime" },
];
const purposes: Record<Goal, string> = {
  Calm: "Find a calmer rhythm",
  Focus: "Clear the mental noise",
  Perform: "Cyclic hyperventilation with retention",
  Recover: "Return to an easy rhythm",
  Sleep: "Wind down for rest",
  Energize: "Wake up with intention",
};
export default function Today() {
  const { colors, chartColors, mode } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const { current } = controller;
  const experience = experienceFor(controller.preferences);
  const favorite = experience.rituals.find(r => r.id === experience.favoriteRitualId);
  const [goal, setGoal] = useState<Goal>("Calm");
  const recommendation = goal === "Perform" ? cyclic : protocols.find((protocol) => protocol.availability === "enabled" && protocol.goalTags.includes(goal)) ?? protocols[0];
  return (
    <Screen tabScreen
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Open settings")}
          onPress={() => router.push("/settings")}
          style={s.iconButton}
        >
          <MaterialIcons name="settings" size={21} color={colors.text} />
        </Pressable>
      }
    >
      <View style={{ gap: 8 }}>
        <Label>TODAY</Label>
        <Title>Breathe for what's next.</Title>
        <Copy translate={false} style={{ color: colors.secondaryText }}>{controller.preferences.experience?.intention ?? t(experience.intention)}</Copy>
      </View>
      {current?.stage === "active" && (
        <Button
          title="Return to paused session"
          onPress={() => router.push("/session")}
        />
      )}
      {current?.stage === "post" && (
        <Button
          title="Finish your State Shift"
          onPress={() => router.push("/post")}
        />
      )}
      <View style={{ gap: 10 }}>
      <Label>WHAT DO YOU NEED?</Label>
      <View style={s.goalGrid}>
        {goals.filter((item) => protocols.some((p) => p.availability === "enabled" && p.goalTags.includes(item.name))).map((item) => (
          <Pressable
            key={item.name}
            accessibilityLabel={t(item.name)}
            accessibilityRole="button"
            accessibilityState={{ selected: goal === item.name }}
            onPress={() => { setGoal(item.name); controller.analytics.track("situation_selected"); }}
            style={[s.goalChoice, { backgroundColor: mode === "light" ? goal === item.name ? chartColors[item.name] + "18" : colors.card : goal === item.name ? chartColors[item.name] : chartColors[item.name] + "12", borderWidth: 1, borderColor: mode === "light" ? goal === item.name ? chartColors[item.name] : colors.border : chartColors[item.name] + "55" }]}
          >
            <MaterialIcons accessible={false} name={item.icon} size={18} color={goal === item.name && mode === "dark" ? colors.onAccent : chartColors[item.name]} />
            <Copy style={{ textAlign: "center", color: goal === item.name && mode === "dark" ? colors.onAccent : colors.text }}>{item.name}</Copy>
          </Pressable>
        ))}
      </View>
      </View>
      <FeatureCard featured
        eyebrow={t(`RECOMMENDED FOR ${goal.toUpperCase()}`)}
        title={protocolTitle(recommendation)} description={purposes[goal]}
        detail={isCyclic(recommendation) ? message("Up to {0} · {1} rounds", [duration(recommendation.defaultDuration), recommendation.defaultCycles]) : `${duration(recommendation.defaultDuration)} · ${countLabel(recommendation.defaultCycles, "cycle")}`}
        icon={goals.find(item => item.name === goal)?.icon ?? "air"}
        tone={goal === "Calm" ? "exhale" : goal === "Recover" ? "gold" : "accent"}
        action="Start practice" onPress={() => router.push({ pathname: "/pre", params: { id: recommendation.id } })} />
      {favorite && <Button translate={false} title={message("Start {0}", [favorite.name])} disabled={!!controller.error || (!!current && current.stage !== "result")} onPress={() => { if (isCyclic(favorite.protocol)) router.push({ pathname: "/pre", params: { ritualId: favorite.id } }); else if (controller.startRitual(favorite.id)) router.push("/session"); }} />}
      <Card style={{ paddingVertical: 8, gap: 0 }}>
        <ActionRow title="My practice profile" icon="person-outline" onPress={() => router.push("/profile")} />
        <ActionRow title="My rituals" icon="auto-awesome" onPress={() => router.push("/rituals")} />
      </Card>
      <AdSlot placement="today" />
      <WeeklyGoal />
    </Screen>
  );
}
