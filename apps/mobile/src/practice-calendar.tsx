import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { colors } from "@inout/design-tokens";
import { Button, Card, Copy, Label, s } from "./ui";
import { dayKey, type Milestone } from "./progress";

export function PracticeCalendar({ activeDays, milestones, now }: { activeDays: Set<string>; milestones: Milestone[]; now: Date }) {
  const [offset, setOffset] = useState(0);
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const title = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const padding = (month.getDay() + 6) % 7;
  const keys = Array.from({ length: days }, (_, i) => dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1)));
  const count = keys.filter(key => activeDays.has(key)).length;
  const elapsed = offset === 0 ? now.getDate() : days;
  const rating = !count ? "Your rhythm starts with one session" : count / elapsed >= 0.8 ? "Excellent consistency" : count / elapsed >= 0.5 ? "Building consistency" : "Every practice counts";
  return <Card>
    <Label>{title}</Label><Copy>{count} practice {count === 1 ? "day" : "days"} this month · {Math.round(count / elapsed * 100)}%</Copy>
    <Copy style={{ color: colors.exhale }}>{rating}</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Button title="Previous month" secondary onPress={() => setOffset(offset - 1)} /><Button title="Next month" secondary disabled={offset === 0} onPress={() => setOffset(offset + 1)} /></View>
    <View style={{ flexDirection: "row" }}>{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <Copy key={i} style={{ width: "14.2857%", textAlign: "center", color: colors.muted }}>{day}</Copy>)}</View>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {Array.from({ length: padding }, (_, i) => <View key={`pad-${i}`} style={{ width: "14.2857%" }} />)}
      {keys.map((key, i) => {
        const active = activeDays.has(key), earned = milestones.filter(m => m.date === key);
        return <Pressable key={key} disabled={!active} accessibilityRole="button"
          accessibilityLabel={`${key}${active ? ", practiced, view sessions" : ", no practice"}${earned.length ? `, ${earned.map(m => m.label).join(", ")}` : ""}`}
          onPress={() => router.push({ pathname: "/history", params: { date: key } })}
          style={{ width: "14.2857%", minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: active ? colors.exhale : "transparent", borderWidth: key === dayKey(now) ? 1 : 0, borderColor: colors.accent }}>
          <Copy style={{ color: active ? colors.background : colors.muted, fontSize: 13 }}>{i + 1}{earned.length ? "★" : ""}</Copy>
        </Pressable>;
      })}
    </View><Copy style={s.small}>★ Milestone · Tap a practice day to view its logs.</Copy>
  </Card>;
}
