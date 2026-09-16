import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { useSession } from "../src/provider";
import { duration, shiftText } from "../src/format";
import { stateShift } from "@inout/shared-types";
import { colors } from "@inout/design-tokens";

export default function History() {
  const controller = useSession();
  const [filter, setFilter] = useState("All");
  const records = controller.history().filter((record) => filter === "All" || record.goal === filter);
  const shifts = records.map((record) => stateShift(record.pre, record.post)).filter((value): value is number => value !== null);
  return (
    <BackScreen title="HISTORY">
      <View style={s.row}>
        <Title>Session history</Title>
        <Button title="Progress" secondary onPress={() => router.replace("/(tabs)/progress")} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {["All", "Calm", "Focus", "Perform", "Recover", "Sleep", "Energize"].map((goal) => (
          <Pressable key={goal} accessibilityRole="button" accessibilityState={{ selected: filter === goal }} onPress={() => setFilter(goal)} style={[s.button, { backgroundColor: filter === goal ? colors.text : colors.raised }]}>
            <Copy style={{ color: filter === goal ? colors.background : colors.text }}>{goal}</Copy>
          </Pressable>
        ))}
      </ScrollView>
      <Copy style={s.small}>{records.length} sessions · {shifts.length ? `average shift ${(shifts.reduce((a, b) => a + b, 0) / shifts.length).toFixed(1)}` : "no paired ratings yet"}</Copy>
      {!records.length && <Card><Title>No sessions yet.</Title><Copy>Your completed and ended sessions will appear here.</Copy><Button title="Start a reset" onPress={() => router.push("/pre")} /></Card>}
      {records.map((record) => (
        <Card key={record.id}>
          <Label>{new Date(record.engine.startedAt).toLocaleString()}</Label>
          <Copy style={s.subtitle}>{record.protocolName}</Copy>
          <Copy>{duration(record.engine.elapsedAtAnchor)} · {record.endReason === "completed" ? "Completed" : "Ended early"}</Copy>
          <Copy style={{ color: colors.accent }}>{shiftText(record)}</Copy>
          {record.effect && <Copy>{record.effect}</Copy>}
          <Button title="View session" secondary onPress={() => router.push({ pathname: "/result", params: { id: record.id } })} />
          <Button title="Delete" secondary onPress={() => Alert.alert("Delete this session?", "This removes the local record permanently.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => controller.remove(record.id) }])} />
        </Card>
      ))}
    </BackScreen>
  );
}