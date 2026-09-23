import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, Chip, s } from "../src/ui";
import { useSession } from "../src/provider";
import { practiceDuration as duration, shiftText } from "../src/format";
import { stateShift } from "@inout/shared-types";
import { colors } from "@inout/design-tokens";
import { dayKey } from "../src/progress";

export default function History() {
  const controller = useSession();
  const [filter, setFilter] = useState("All");
  const { date } = useLocalSearchParams<{ date?: string }>();
  const records = controller.history().filter((record) => (filter === "All" || record.goal === filter) && (!date || dayKey(new Date(record.engine.startedAt)) === date));
  const shifts = records.map((record) => stateShift(record.pre, record.post)).filter((value): value is number => value !== null);
  return (
    <BackScreen title="HISTORY">
      <View style={s.row}>
        <Title>Session history</Title>
        <Button title="Progress" secondary onPress={() => router.replace("/(tabs)/progress")} />
      </View>
      <Button title="Add session" secondary onPress={() => router.push("/add-session")} />
      {date && <View><Copy>Sessions on {date}</Copy><Button title="Show all dates" secondary onPress={() => router.replace("/history")} /></View>}
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
        {["All", "Calm", "Focus", "Perform", "Recover", "Sleep", "Energize"].map((goal) => (
          <Chip key={goal} title={goal} selected={filter === goal} onPress={() => setFilter(goal)} />
        ))}
      </ScrollView>
      <Copy style={s.small}>{records.length} sessions · {shifts.length ? `average shift ${(shifts.reduce((a, b) => a + b, 0) / shifts.length).toFixed(1)}` : "no paired ratings yet"}</Copy>
      {!records.length && <Card><Title>{date ? "No matching sessions on this day." : filter === "All" ? "Your first reset starts here." : `No ${filter.toLowerCase()} sessions yet.`}</Title><Copy>Each session adds to your personal practice history.</Copy><Button title="Start a reset" onPress={() => router.push("/pre")} /></Card>}
      {records.map((record) => (
        <Card key={record.id}>
          <View style={s.row}>
            <Label>{record.goal.toUpperCase()} · {new Date(record.engine.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Label>
            <Copy style={s.small}>{new Date(record.engine.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</Copy>
          </View>
          <Copy style={s.subtitle}>{record.protocolName}</Copy>
          <Copy style={s.small}>{duration(record.engine.elapsedAtAnchor)} · {record.source === "manual" ? "Manually logged" : record.endReason === "completed" ? "Completed" : "Ended early"}</Copy>
          <Copy style={{ color: stateShift(record.pre, record.post) !== null && stateShift(record.pre, record.post)! > 0 ? colors.exhale : colors.accent }}>{shiftText(record)}</Copy>
          {record.effect && <Copy style={s.small}>{record.effect}</Copy>}
          <View style={s.row}>
            <Button title="View session" secondary onPress={() => router.push({ pathname: "/result", params: { id: record.id } })} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${record.protocolName} session`} style={s.iconButton} onPress={() => Alert.alert("Delete this session?", "This removes the local record permanently.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => controller.remove(record.id) }])}>
              <MaterialIcons name="delete-outline" size={22} color={colors.muted} />
            </Pressable>
          </View>
        </Card>
      ))}
    </BackScreen>
  );
}
