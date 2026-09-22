import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Share, View } from "react-native";
import { Screen, Title, Label, Card, Copy, Button, s } from "../../src/ui";
import { addDays, dayKey, periodStats, practiceStats, statsDuration, summarize } from "../../src/progress";
import { useSession, SaveError } from "../../src/provider";
import { AdSlot } from "../../src/ad-slot";
import { PracticeCalendar } from "../../src/practice-calendar";
import { StatRow, useProgressDate } from "../../src/progress-ui";
import { colors } from "@inout/design-tokens";

export default function Progress() {
  const controller = useSession();
  const now = useProgressDate();
  const [allMilestones, setAllMilestones] = useState(false);
  const [notice, setNotice] = useState("");
  const records = controller.history();
  const stats = useMemo(() => practiceStats(records, now), [records, now]);
  const weekly = useMemo(() => periodStats(stats.records, "Weeks", now), [stats, now]);
  const week = summarize(weekly.buckets.at(-1)?.records ?? []);
  const share = () => { void Share.share({ message: `My IN/OUT practice\n${stats.current} consecutive days · best ${stats.best}\n${stats.activeDays.size} total practice days · ${statsDuration(stats.totalMs)} total time\n${stats.milestones.length} milestones` }).catch(() => Alert.alert("Sharing unavailable", "Please try again.")); };
  return <Screen title="PROGRESS">
    <Card>
      <Label>CURRENT STREAK</Label><Title>{stats.current} consecutive {stats.current === 1 ? "day" : "days"}</Title>
      <View style={{ flexDirection: "row", gap: 4 }}>{Array.from({ length: 7 }, (_, i) => {
        const date = addDays(now, i - 6), active = stats.activeDays.has(dayKey(date));
        return <View key={i} accessible accessibilityLabel={`${dayKey(date)}: ${active ? "practiced" : "no practice"}`} style={{ flex: 1, alignItems: "center", gap: 8 }}><Copy style={s.small}>{date.toLocaleDateString(undefined, { weekday: "narrow" })}</Copy><View style={{ height: 8, width: "100%", borderRadius: 4, backgroundColor: active ? colors.exhale : colors.border }} /></View>;
      })}</View>
      <Copy>{stats.activeDays.has(dayKey(now)) ? "Great work. You kept your streak." : stats.current ? "Practice today to keep your streak going." : "Start your next streak with a breathing session."}</Copy>
      <Copy style={s.small}>Best: {stats.best} days · Next milestone: {stats.nextMilestone} days ({stats.nextMilestone - stats.current} to go).</Copy>
      <Copy style={s.small}>Saved breathing counts, including manual and early-ended sessions. Days follow local time.</Copy>
    </Card>
    <Card><Label>THIS WEEK · MONDAY–TODAY</Label><Title>{statsDuration(week.totalMs)}</Title><Copy>{week.count} sessions · {week.activeDays} practice days</Copy><Copy style={s.small}>Weekly average: {statsDuration(weekly.averagePerBucket)} over the last 12 weeks.</Copy></Card>
    <PracticeCalendar activeDays={stats.activeDays} milestones={stats.milestones} now={now} />
    <Card><Label>LIFETIME TOTALS</Label><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>TOTAL DAYS</Label><Title>{stats.activeDays.size}</Title></View>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>TOTAL TIME</Label><Title>{statsDuration(stats.totalMs)}</Title></View>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>SESSIONS</Label><Title>{stats.count}</Title></View>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>MILESTONES</Label><Title>{stats.milestones.length}</Title></View>
    </View></Card>
    <Button title="See all stats" onPress={() => router.push("/stats")} />
    <Button title="View session history" secondary onPress={() => router.push("/history")} />
    <Card><Title>{stats.milestones.length} milestones</Title>
      {(allMilestones ? stats.milestones : stats.milestones.slice(0, 3)).map(m => <StatRow key={m.id} label={`★ ${m.label}`} value={m.date} />)}
      {!stats.milestones.length && <Copy>Your first practice day is your first milestone.</Copy>}
      {stats.milestones.length > 3 && <Button title={allMilestones ? "Show recent milestones" : "View all milestones"} secondary onPress={() => setAllMilestones(!allMilestones)} />}
    </Card>
    <Button title="Add session" onPress={() => router.push("/add-session")} />
    <Button title="Share progress" secondary onPress={share} />
    <Button title="Refresh data" secondary onPress={() => { setNotice(controller.refreshHistory() ? "Local session data refreshed." : "Refresh failed. Please retry."); }} />
    {!!notice && <Copy accessibilityLiveRegion="polite">{notice}</Copy>}<SaveError />
    <AdSlot placement="progress" />
  </Screen>;
}
