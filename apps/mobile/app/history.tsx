import { useTheme } from "../src/theme";
import { t, locale, recordTitle, message, decimal, countLabel } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Alert, Pressable } from "../src/localized-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState, useEffect } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, Chip, useStyles } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { practiceDuration as duration, shiftText } from "../src/format";
import { stateShift } from "@inout/shared-types";

import { productConfig } from "../src/product-config";
import { dayKey } from "../src/progress";

export default function History() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const [filter, setFilter] = useState("All");
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [filter, date]);
  const records = controller.history().filter((record) => (filter === "All" || record.goal === filter) && (!date || dayKey(new Date(record.engine.startedAt)) === date));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(records.length / 30) - 1));
  const shifts = records.map((record) => stateShift(record.pre, record.post)).filter((value): value is number => value !== null);
  return (
    <BackScreen title="HISTORY">
      <View style={s.row}>
        <Title>Session history</Title>
        <Button title="Progress" secondary onPress={() => router.replace("/(tabs)/progress")} />
      </View>
      {productConfig.manualLogging && <Button title="Add session" secondary onPress={() => router.push("/add-session")} />}
      <SaveError />
      {date && <View><Copy>Sessions on {date}</Copy><Button title="Show all dates" secondary onPress={() => router.replace("/history")} /></View>}
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
        {["All", "Calm", "Focus", "Perform", "Recover", "Sleep", "Energize"].map((goal) => (
          <Chip key={goal} title={goal} selected={filter === goal} onPress={() => setFilter(goal)} />
        ))}
      </ScrollView>
      <Copy style={s.small}>{countLabel(records.length, "session")} · {shifts.length ? `average shift ${decimal((shifts.reduce((a, b) => a + b, 0) / shifts.length), 1)}` : "no paired ratings yet"}</Copy>
      {!records.length && <Card><Title>{date ? "No matching sessions on this day." : filter === "All" ? "Your first practice starts here." : `No ${filter.toLowerCase()} sessions yet.`}</Title><Copy>Each session adds to your personal practice history.</Copy><Button title="Start a practice" onPress={() => router.push("/pre")} /></Card>}
      {records.slice(currentPage * 30, (currentPage + 1) * 30).map((record) => (
        <Card key={record.id}>
          <View style={s.row}>
            <Label>{record.goal.toUpperCase()} · {new Date(record.engine.startedAt).toLocaleDateString(locale(), { month: "short", day: "numeric" })}</Label>
            <Copy style={s.small}>{new Date(record.engine.startedAt).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</Copy>
          </View>
          <Copy translate={false} style={s.subtitle}>{recordTitle(record)}</Copy>
          <Copy style={s.small}>{duration(record.engine.elapsedAtAnchor)} · {record.source === "manual" ? "Manually logged" : record.endReason === "completed" ? "Completed" : "Ended early"}</Copy>
          <Copy style={{ color: stateShift(record.pre, record.post) !== null && stateShift(record.pre, record.post)! > 0 ? colors.exhale : colors.accent }}>{shiftText(record)}</Copy>
          {record.note && <Copy translate={false}>{record.note}</Copy>}
          {record.effect && <Copy style={s.small}>{record.effect}</Copy>}
          <View style={s.row}>
            <Button title="View session" secondary onPress={() => router.push({ pathname: "/result", params: { id: record.id } })} />
            <Pressable accessibilityRole="button" accessibilityLabel={message("Delete {0} session", [recordTitle(record)])} style={s.iconButton} onPress={() => Alert.alert("Delete this session?", "This removes the local record permanently.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => controller.remove(record.id) }])}>
              <MaterialIcons name="delete-outline" size={22} color={colors.muted} />
            </Pressable>
          </View>
        </Card>
      ))}
      {records.length > 30 && <View style={s.row}><Button title="Newer sessions" secondary disabled={currentPage === 0} onPress={() => setPage(currentPage - 1)} /><Button title="Older sessions" secondary disabled={(currentPage + 1) * 30 >= records.length} onPress={() => setPage(currentPage + 1)} /></View>}
    </BackScreen>
  );
}
