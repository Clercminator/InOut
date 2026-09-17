import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@inout/design-tokens";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, View } from "react-native";
import { Screen, Title, Label, Copy, Button, ProtocolRow, s } from "../../src/ui";
import { useSession } from "../../src/provider";
import { protocols } from "@inout/protocols";
import type { Goal } from "@inout/shared-types";
import { AdSlot } from "../../src/ad-slot";

const goals: { name: Goal; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { name: "Calm", icon: "spa" },
  { name: "Focus", icon: "center-focus-strong" },
  { name: "Perform", icon: "bolt" },
  { name: "Recover", icon: "replay" },
  { name: "Sleep", icon: "bedtime" },
  { name: "Energize", icon: "wb-sunny" },
];
const purposes: Record<Goal, string> = {
  Calm: "Find a calmer rhythm",
  Focus: "Clear the mental noise",
  Perform: "Find steady composure",
  Recover: "Return to an easy rhythm",
  Sleep: "Wind down for rest",
  Energize: "Wake up with intention",
};
export default function Today() {
  const { current } = useSession();
  const [goal, setGoal] = useState<Goal>("Calm");
  const recommendation = protocols.find((protocol) => protocol.availability === "enabled" && protocol.goalTags.includes(goal)) ?? protocols[0];
  return (
    <Screen
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => router.push("/settings")}
          style={s.iconButton}
        >
          <MaterialIcons name="settings" size={21} color="#e2e2e8" />
        </Pressable>
      }
    >
      <Label>TODAY</Label>
      <Title>Breathe for what's next.</Title>
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
      <LinearGradient colors={[colors.sessionSurface, colors.card]} style={s.hero}>
        <Label>QUICK RESET · 48 SEC</Label>
        <Title>Make room for a reset.</Title>
        <Copy style={s.subtitle}>Physiological Sigh</Copy>
        <Copy>3 guided cycles. No account needed.</Copy>
        <Button
          title="Start reset"
          onPress={() => router.push("/pre")}
        />
      </LinearGradient>
      <Label>WHAT DO YOU NEED?</Label>
      <View style={s.goalGrid}>
        {goals.filter((item) => protocols.some((p) => p.availability === "enabled" && p.goalTags.includes(item.name))).map((item) => (
          <Pressable
            key={item.name}
            accessibilityRole="button"
            accessibilityState={{ selected: goal === item.name }}
            onPress={() => setGoal(item.name)}
            style={[s.goalChoice, goal === item.name && s.goalChoiceSelected]}
          >
            <MaterialIcons name={item.icon} size={18} color={goal === item.name ? "#111317" : "#adc6ff"} />
            <Copy style={goal === item.name ? { color: "#111317" } : undefined}>{item.name}</Copy>
          </Pressable>
        ))}
      </View>
      <View style={s.row}>
        <View>
          <Label>RECOMMENDED FOR {goal.toUpperCase()}</Label>
          <Copy style={s.subtitle}>{purposes[goal]}</Copy>
        </View>
      </View>
      <ProtocolRow
        protocol={recommendation}
        purpose={recommendation.name === "Physiological Sigh" ? "Two inhales, one long exhale" : purposes[goal]}
        onPress={() => router.push({ pathname: "/protocol", params: { id: recommendation.id } })}
      />
      <AdSlot placement="today" />
    </Screen>
  );
}
