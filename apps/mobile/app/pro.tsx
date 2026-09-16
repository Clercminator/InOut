import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { colors } from "@inout/design-tokens";

const features = [
  ["Core protocol library", "10 protocols"],
  ["Custom Pattern + Mix Mode", "Planned"],
  ["Saved presets and mixes", "Planned"],
  ["Progress insights", "Planned"],
] as const;

export default function Pro() {
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  return (
    <BackScreen title="IN/OUT PRO">
      <View style={s.proHero}>
        <Label>GO FURTHER</Label>
        <Title>More room to make it yours.</Title>
        <Copy>Explore the planned membership. Current preview features are available without a subscription.</Copy>
      </View>
      <Card>
        <Label>PLANNED PRO FEATURES</Label>
        {features.map(([name, value]) => <View key={name} style={s.proFeature}><Copy>{name}</Copy><Copy style={{ color: colors.accent }}>{value}</Copy></View>)}
      </Card>
      <View style={s.planRow}>
        {(["annual", "monthly"] as const).map((value) => <Pressable key={value} onPress={() => setPlan(value)} accessibilityRole="button" accessibilityState={{ selected: plan === value }} style={[s.plan, plan === value && s.planActive]}><Label>{value === "annual" ? "ANNUAL" : "MONTHLY"}</Label><Copy style={plan === value ? { color: "#111317" } : undefined}>{value === "annual" ? "Yearly" : "Flexible"}</Copy></Pressable>)}
      </View>
      <Button title="Subscriptions coming later" disabled onPress={() => {}} />
      <Copy style={s.small}>Purchases are not available yet. No payment or subscription is created on this screen.</Copy>
      <Button title="Back to Profile" secondary onPress={() => router.replace("/profile")} />
    </BackScreen>
  );
}
