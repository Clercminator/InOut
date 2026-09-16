import { router } from "expo-router";
import { View } from "react-native";
import { Screen, Title, Label, Card, Copy, Button, s } from "../../src/ui";
import { useSession } from "../../src/provider";
import { duration } from "../../src/format";
import { stateShift } from "@inout/shared-types";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export default function Progress() {
  const controller = useSession();
  const records = controller.history();
  const completed = records.filter((record) => record.endReason === "completed");
  const shifts = completed
    .map((record) => stateShift(record.pre, record.post))
    .filter((value): value is number => value !== null);
  const activeDays = new Set(records.map((record) => dayKey(new Date(record.engine.startedAt))));
  const totalMs = records.reduce((sum, record) => sum + record.engine.elapsedAtAnchor, 0);
  let streak = 0;
  const cursor = new Date();
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const average = shifts.length
    ? (shifts.reduce((a, b) => a + b, 0) / shifts.length).toFixed(1)
    : "—";
  const heatmap = Array.from({ length: 28 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - index));
    return activeDays.has(dayKey(date));
  });
  const bestGoal = completed.length
    ? [...new Set(completed.map((record) => record.goal))].sort(
        (a, b) =>
          completed.filter((record) => record.goal === b).length -
          completed.filter((record) => record.goal === a).length,
      )[0]
    : null;

  return (
    <Screen title="PROGRESS">
      <Title>Your practice, at a glance.</Title>
      <View style={s.metricGrid}>
        <Card style={s.metricCard}><Label>SESSIONS</Label><Title>{records.length}</Title></Card>
        <Card style={s.metricCard}><Label>TOTAL TIME</Label><Title>{duration(totalMs)}</Title></Card>
        <Card style={s.metricCard}><Label>STREAK</Label><Title>{streak}d</Title></Card>
        <Card style={s.metricCard}><Label>AVG STATE SHIFT</Label><Title>{average}</Title></Card>
      </View>
      <Card>
        <View style={s.row}><Label>ACTIVITY · 28 DAYS</Label><Copy style={s.small}>{records.length ? `${heatmap.filter(Boolean).length} active days` : "Your rhythm will appear here"}</Copy></View>
        <View style={s.heatmap}>{heatmap.map((active, index) => <View key={index} style={[s.heatCell, active && s.heatCellActive]} />)}</View>
      </Card>
      <Card>
        <Label>WHAT WORKS FOR YOU</Label>
        {bestGoal ? <Copy>Most of your completed sessions are for {bestGoal}. Keep noticing which practices create a State Shift.</Copy> : <Copy>Complete a session and add a before-and-after rating to discover which practices create your State Shift.</Copy>}
      </Card>
      <Button title="View session history" secondary onPress={() => router.push("/history")} />
    </Screen>
  );
}
