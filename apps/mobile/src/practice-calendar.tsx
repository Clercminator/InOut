import { useTheme } from "./theme";
import { t, locale, countLabel, message } from "./i18n";
import { useLanguage } from "./use-language";
import { Pressable } from "./localized-native";
import { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";

import { Button, IconButton, Card, Copy, Label, useStyles } from "./ui";
import { dayKey, type Milestone } from "./progress";

export function PracticeCalendar({ activeDays, milestones, now }: { activeDays: Set<string>; milestones: Milestone[]; now: Date }) {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const [offset, setOffset] = useState(0);
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const gridWidth = Math.max(width, 7 * Math.max(48, 40 * fontScale));
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const title = month.toLocaleDateString(locale(), { month: "long", year: "numeric" });
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const padding = (month.getDay() + 6) % 7;
  const keys = Array.from({ length: days }, (_, i) => dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1)));
  const count = keys.filter(key => activeDays.has(key)).length;
  const elapsed = offset === 0 ? now.getDate() : days;
  const rating = !count ? "Your rhythm starts with one session" : count / elapsed >= 0.8 ? "Excellent consistency" : count / elapsed >= 0.5 ? "Building consistency" : "Every practice counts";
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ flex: 1 }}><Label>{title}</Label></View><IconButton icon="chevron-left" title="Previous month" onPress={() => setOffset(offset - 1)} /><IconButton icon="chevron-right" title="Next month" disabled={offset === 0} onPress={() => setOffset(offset + 1)} /></View><Copy>{message("This month: {0}", [countLabel(count, "practiceDay")])} · {Math.round(count / elapsed * 100)}%</Copy>
    <Copy style={{ color: colors.exhale }}>{rating}</Copy>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView horizontal showsHorizontalScrollIndicator={gridWidth > width}>
    <View style={{ width: gridWidth }}>
    <View style={{ flexDirection: "row" }}>{Array.from({ length: 7 }, (_, i) => new Date(2026, 5, 1 + i).toLocaleDateString(locale(), { weekday: "narrow" })).map((day, i) => <Copy key={i} style={{ width: "14.2857%", textAlign: "center", color: colors.muted }}>{day}</Copy>)}</View>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {Array.from({ length: padding }, (_, i) => <View key={`pad-${i}`} style={{ width: "14.2857%" }} />)}
      {keys.map((key, i) => {
        const active = activeDays.has(key), earned = milestones.filter(m => m.date === key);
        return <Pressable key={key} disabled={!active} accessibilityRole="button"
          accessibilityState={{ disabled: !active }}
          accessibilityLabel={t(`${key}${active ? ", practiced, view sessions" : ", no practice"}${earned.length ? `, ${earned.map(m => m.label).join(", ")}` : ""}`)}
          onPress={() => router.push({ pathname: "/history", params: { date: key } })}
          style={{ width: "14.2857%", minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: active ? colors.exhale : "transparent", borderWidth: key === dayKey(now) ? 1 : 0, borderColor: colors.accent }}>
          <Copy style={{ color: active ? colors.onAccent : colors.muted, fontSize: 13 }}>{i + 1}{earned.length ? "★" : ""}</Copy>
        </Pressable>;
      })}
    </View></View></ScrollView></View><Copy style={s.small}>★ Milestone · Tap a practice day to view its logs.</Copy>
  </Card>;
}
