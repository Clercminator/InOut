import { useMemo, useState } from "react";
import { View } from "react-native";
import { BackScreen, Title, Label, Card, Copy, Chip, s } from "../src/ui";
import { breakdown, periodStats, statsDuration, summarize, type StatsPeriod } from "../src/progress";
import { useSession } from "../src/provider";
import { PracticeChart, StateShiftChart } from "../src/progress-charts";
import { StatRow, useProgressDate } from "../src/progress-ui";

export default function Stats() {
  const controller = useSession();
  const now = useProgressDate();
  const [period, setPeriod] = useState<StatsPeriod>("Days");
  const [chartBy, setChartBy] = useState<"goal" | "source">("goal");
  const records = controller.history();
  const selected = useMemo(() => periodStats(records, period, now), [records, period, now]);
  const currentBucket = summarize(selected.buckets.at(-1)?.records ?? []);
  const unit = selected.unit;
  const groups = breakdown(selected.records, "goal");
  return <BackScreen title="MY STATS">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["Days", "Weeks", "Months", "All time"] as StatsPeriod[]).map(value => <Chip key={value} title={value} selected={period === value} onPress={() => setPeriod(value)} />)}</View>
      <Copy>{period === "Days" ? "Last 14 days" : period === "Weeks" ? "Last 12 weeks" : period === "Months" ? "Last 12 months" : "All time"} · Since {selected.start.toLocaleDateString()}</Copy>
      <Copy style={s.small}>Averages include days without practice and the current partial period. Sessions count on their local start date; only saved sessions with breathing time count.</Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip title="By goal" selected={chartBy === "goal"} onPress={() => setChartBy("goal")} /><Chip title="In-app / manual" selected={chartBy === "source"} onPress={() => setChartBy("source")} /></View>
      <PracticeChart title={`TIME PER ${unit.toUpperCase()}`} subtitle={`${statsDuration(currentBucket.totalMs)} this ${unit} · Average ${statsDuration(selected.averagePerBucket)}`} buckets={selected.buckets} metric="time" by={chartBy} />
      <PracticeChart title={`SESSIONS PER ${unit.toUpperCase()}`} subtitle={`${currentBucket.count} this ${unit} · Average ${selected.averageSessionsPerBucket.toFixed(1)}`} buckets={selected.buckets} metric="sessions" by={chartBy} />
      <Card><Label>TIME</Label><StatRow label="Period total" value={statsDuration(selected.totalMs)} />
        {groups.map(group => <StatRow key={group.label} label={group.label} value={statsDuration(group.totalMs)} />)}
        <StatRow label="Daily average" value={statsDuration(selected.totalMs / selected.calendarDays)} />
        <StatRow label="Average session duration" value={statsDuration(selected.averageSession)} />
        <StatRow label="Longest session duration" value={statsDuration(selected.longestSession)} />
      </Card>
      <Card><Label>SESSIONS</Label><StatRow label="Period total" value={selected.count} />
        {groups.map(group => <StatRow key={group.label} label={group.label} value={group.count} />)}
        <StatRow label="Daily average" value={(selected.count / selected.calendarDays).toFixed(1)} />
        <StatRow label="Practice days" value={selected.activeDays} />
        <StatRow label="Completed" value={selected.records.filter(r => r.endReason === "completed").length} />
        <StatRow label="Ended early" value={selected.records.filter(r => r.endReason !== "completed").length} />
      </Card>
      <Card><Label>PROTOCOLS</Label>{breakdown(selected.records, "protocolName").map(group => <StatRow key={group.label} label={group.label} value={`${group.count} · ${statsDuration(group.totalMs)}`} />)}{!selected.count && <Copy>No protocols logged in this period.</Copy>}</Card>
      <Card><Label>STATE SHIFT · SELF-REPORTED</Label><Title>{selected.averageShift === null ? "—" : `${selected.averageShift > 0 ? "+" : ""}${selected.averageShift.toFixed(1)}`}</Title>
        <Copy style={s.small}>Average from {selected.shifts} completed sessions with paired ratings. Positive values mean lower tension. These are your observations, not a measure of clinical benefit.</Copy>
        {groups.filter(group => group.shifts > 0).map(group => <StatRow key={group.label} label={`${group.label} (${group.shifts} pairs)`} value={group.averageShift!.toFixed(1)} />)}
      </Card>
      <StateShiftChart buckets={selected.buckets} />

  </BackScreen>;
}
