import { useTheme } from "../../src/theme";
import { t, locale, countLabel, message } from "../../src/i18n";
import { useLanguage } from "../../src/use-language";
import { Alert } from "../../src/localized-native";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Share, View } from "react-native";
import { Screen, Title, Label, Card, Copy, Button, Disclosure, ActionRow, IconButton, useStyles } from "../../src/ui";
import { addDays, dayKey, periodStats, practiceStats, statsDuration, summarize } from "../../src/progress";
import { useSession, SaveError } from "../../src/provider";
import { AdSlot } from "../../src/ad-slot";
import { PracticeCalendar } from "../../src/practice-calendar";
import { StatRow, useProgressDate } from "../../src/progress-ui";


export default function Progress() {
  const { colors } = useTheme();
  const s = useStyles();
  const language = useLanguage();
  const controller = useSession();
  const now = useProgressDate();
  const [allMilestones, setAllMilestones] = useState(false);
  const [notice, setNotice] = useState("");
  const records = controller.history();
  const stats = useMemo(() => practiceStats(records, now), [records, now]);
  const weekly = useMemo(() => periodStats(stats.records, "Weeks", now), [stats, now, language]);
  const week = summarize(weekly.buckets.at(-1)?.records ?? []);
  const share = () => { void Share.share({ message: `${t("My IN/OUT practice")}\n${t(`${stats.current} consecutive days`)} · ${t("best")} ${stats.best}\n${t(`${stats.activeDays.size} total practice days`)} · ${t(`${statsDuration(stats.totalMs)} total time`)}\n${t(`${stats.milestones.length} milestones`)}` }).catch(() => Alert.alert("Sharing unavailable", "Please try again.")); };
  return <Screen tabScreen title="PROGRESS">
    {!stats.count && <Card>
      <Title>Your first practice starts here.</Title>
      <Copy>Each session adds to your personal practice history.</Copy>
      <Button title="Start a practice" onPress={() => router.push("/pre")} />
    </Card>}
    <Card style={{ borderColor: colors.exhale + "55", backgroundColor: colors.exhale + "0C" }}>
      <Label>CURRENT STREAK</Label><Title>{countLabel(stats.current, "consecutiveDay")}</Title>
      <View style={{ flexDirection: "row", gap: 4 }}>{Array.from({ length: 7 }, (_, i) => {
        const date = addDays(now, i - ((now.getDay() + 6) % 7)), active = stats.activeDays.has(dayKey(date));
        return <View key={i} accessible accessibilityLabel={t(`${dayKey(date)}: ${active ? "practiced" : "no practice"}`)} style={{ flex: 1, alignItems: "center", gap: 8 }}><Copy style={s.small}>{date.toLocaleDateString(locale(), { weekday: "narrow" })}</Copy><View style={{ height: 8, width: "100%", borderRadius: 4, backgroundColor: active ? colors.exhale : colors.border }} /></View>;
      })}</View>
      <Copy>{stats.activeDays.has(dayKey(now)) ? "Great work. You kept your streak." : stats.current ? "Practice today to keep your streak going." : "Start your next streak with a breathing session."}</Copy>
      <Copy style={s.small}>{message("Best streak: {0}", [countLabel(stats.best, "day")])} · {message("Next milestone: {0}", [countLabel(stats.nextMilestone, "day")])}</Copy>
    </Card>
    <Card style={{ borderColor: colors.gold + "55" }}><Label>THIS WEEK · MONDAY–TODAY</Label><Title>{statsDuration(week.totalMs)}</Title><Copy>{countLabel(week.count, "session")} · {countLabel(week.activeDays, "practiceDay")}</Copy><Copy style={s.small}>Weekly average: {statsDuration(weekly.averagePerBucket)} over the last 12 weeks.</Copy></Card>
    <PracticeCalendar activeDays={stats.activeDays} milestones={stats.milestones} now={now} />
    <Disclosure title="Lifetime totals" icon="bar-chart"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>TOTAL DAYS</Label><Title>{stats.activeDays.size}</Title></View>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>TOTAL TIME</Label><Title>{statsDuration(stats.totalMs)}</Title></View>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>SESSIONS</Label><Title>{stats.count}</Title></View>
      <View style={{ flexGrow: 1, flexBasis: "40%", gap: 4 }}><Label>MILESTONES</Label><Title>{stats.milestones.length}</Title></View>
    </View></Disclosure>
    <Card style={{ paddingVertical: 8, gap: 0 }}>
    <ActionRow icon="bar-chart" title="See all stats" onPress={() => router.push("/stats")} />
    <ActionRow icon="insights" title="Practice insights" onPress={() => router.push("/insights")} />
    <ActionRow icon="history" title="View session history" onPress={() => router.push("/history")} />
    <ActionRow title="My practice profile" icon="person-outline" onPress={() => router.push("/profile")} />
    <ActionRow title="My rituals" icon="auto-awesome" onPress={() => router.push("/rituals")} />
    </Card>
    <Disclosure title="Milestones" icon="emoji-events" summary={countLabel(stats.milestones.length, "milestone")}>
      {(allMilestones ? stats.milestones : stats.milestones.slice(0, 3)).map(m => <StatRow key={m.id} label={`★ ${m.label}`} value={m.date} />)}
      {!stats.milestones.length && <Copy>Your first practice day is your first milestone.</Copy>}
      {stats.milestones.length > 3 && <Button title={allMilestones ? "Show recent milestones" : "View all milestones"} secondary onPress={() => setAllMilestones(!allMilestones)} />}
    </Disclosure>
    <View style={s.row}>
    <View style={{ flex: 1 }}><Button title="Add session" onPress={() => router.push("/add-session")} /></View>
    <IconButton icon="share" title="Share progress" onPress={share} />
    <IconButton icon="refresh" title="Refresh data" onPress={() => { setNotice(controller.refreshHistory() ? "Local session data refreshed." : "Refresh failed. Please retry."); }} />
    </View>
    <Disclosure title="How progress is counted" icon="info-outline">
      <Copy style={s.small}>Saved breathing counts, including manual and early-ended sessions. Days follow local time.</Copy>
    </Disclosure>
    {!!notice && <Copy accessibilityLiveRegion="polite">{notice}</Copy>}<SaveError />
    <AdSlot placement="progress" />
  </Screen>;
}
