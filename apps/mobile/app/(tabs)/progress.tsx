import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Title, Label, Card, Copy, Button, Chip, Disclosure, ActionRow, IconButton } from "../../src/ui";
import { addDays, dayKey, periodStats, practiceStats, statsDuration } from "../../src/progress";
import { useSession, SaveError } from "../../src/provider";
import { AdSlot } from "../../src/ad-slot";
import { PracticeCalendar } from "../../src/practice-calendar";
import { useProgressDate } from "../../src/progress-ui";
import { AchievementGallery } from "../../src/achievement-gallery";
import { PracticeChart } from "../../src/progress-charts";
import { productConfig } from "../../src/product-config";
import { countLabel, locale, message, t } from "../../src/i18n";
import { useTheme } from "../../src/theme";
import { useLanguage } from "../../src/use-language";
export default function Progress() {
  const controller = useSession(), { colors } = useTheme();
  const language = useLanguage();
  const now = useProgressDate();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [section, setSection] = useState(view === "Badges" ? "Badges" : "Overview"), [notice, setNotice] = useState("");
  useEffect(() => { controller.analytics.track("progress_viewed"); }, [controller]);
  useEffect(() => { if (section === "Calendar") controller.analytics.track("calendar_viewed"); }, [controller, section]);
  const records = controller.history();
  const stats = useMemo(() => practiceStats(records, now), [records, now]);
  const weekly = useMemo(() => periodStats(records, "Weeks", now), [records, now, language]);
  const paired = stats.records.filter(r => r.endReason === "completed" && r.pre !== null && r.post !== null);
  const completed = stats.records.filter(r => r.endReason === "completed" && r.source !== "manual");
  const usage = new Map<string, number>(); completed.forEach(r => usage.set(r.protocolName, (usage.get(r.protocolName) ?? 0) + 1));
  const mostUsed = [...usage].sort((a, b) => b[1] - a[1])[0];
  return <Screen tabScreen title="PROGRESS">
    <Title>Your practice, taking shape.</Title>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["Overview", "Calendar", "Badges"].map(name => <Chip key={name} title={name} selected={section === name} onPress={() => setSection(name)} />)}</View>
    {section === "Badges" && <AchievementGallery />}
    {section === "Calendar" && <><PracticeCalendar activeDays={stats.activeDays} milestones={stats.milestones} now={now} /><ActionRow title="View session history" icon="history" onPress={() => router.push("/history")} /></>}
    {section === "Overview" && <>
      {!stats.count && <Card><Title>Your first practice starts here.</Title><Copy>Each session adds to your personal practice history.</Copy><Button title="Start a practice" onPress={() => router.push("/pre")} /></Card>}
      <Card style={{ backgroundColor: colors.accentSurface }}><Label>CURRENT STREAK</Label><Title>{countLabel(stats.current, "consecutiveDay")}</Title>
        <View style={{ flexDirection: "row", gap: 4 }}>{Array.from({ length: 7 }, (_, i) => {
          const date = addDays(now, i - ((now.getDay() + 6) % 7)), active = stats.activeDays.has(dayKey(date));
          return <View key={i} accessible accessibilityLabel={t(`${dayKey(date)}: ${active ? "practiced" : "no practice"}`)} style={{ flex: 1, alignItems: "center", gap: 8 }}><Copy>{date.toLocaleDateString(locale(), { weekday: "narrow" })}</Copy><View style={{ height: 8, width: "100%", borderRadius: 4, backgroundColor: active ? colors.exhale : colors.border }} /></View>;
        })}</View>
        <Copy>{stats.activeDays.has(dayKey(now)) ? "You made time for yourself today." : "Every return is a fresh start."}</Copy>
        <Copy>{message("Best streak: {0}", [countLabel(stats.best, "day")])} · {message("Next milestone: {0}", [countLabel(stats.nextMilestone, "day")])}</Copy>
        {stats.current >= 3 && <Button title="Share streak" secondary onPress={() => router.push("/milestone")} />}
      </Card>
      <Card><Label>LIFETIME PRACTICE</Label><Title>{countLabel(stats.count, "session")}</Title><Copy>{statsDuration(stats.totalMs)}</Copy><Copy>{message("{0} protocols tried", [new Set(completed.map(r => r.protocolId)).size])}</Copy>{mostUsed && <Copy>{message("Most used: {0}", [mostUsed[0]])}</Copy>}</Card>
      <Card><Label>AVERAGE STATE SHIFT</Label>{paired.length ? <><Title>{(paired.reduce((n, r) => n + r.pre!, 0) / paired.length).toFixed(1)} → {(paired.reduce((n, r) => n + r.post!, 0) / paired.length).toFixed(1)}</Title><Copy>{message("{0} paired check-ins · Self-reported tension, 1–10", [paired.length])}</Copy></> : <Copy>Complete optional before-and-after check-ins to see your State Shift here.</Copy>}</Card>
      <PracticeChart title="WEEKLY ACTIVITY" buckets={weekly.buckets} metric="sessions" by="source" />
      <Card><ActionRow icon="bar-chart" title="See all stats" onPress={() => router.push("/stats")} /><ActionRow icon="insights" title="Practice insights" onPress={() => router.push("/insights")} /><ActionRow icon="history" title="View session history" onPress={() => router.push("/history")} /><ActionRow title="My practice profile" icon="person-outline" onPress={() => router.push("/profile")} /><ActionRow title="My rituals" icon="auto-awesome" onPress={() => router.push("/rituals")} /></Card>
      <Disclosure title="Milestones" icon="emoji-events" summary={countLabel(controller.rewards().badges.length, "milestone")}>
        {controller.rewards().badges.slice(0, 3).map(b => <Copy key={b.id}>{b.label} · {b.date}</Copy>)}
        <Button title="View all badges" secondary onPress={() => setSection("Badges")} />
      </Disclosure>
      <AdSlot placement="progress" />
    </>}
    {productConfig.manualLogging && <Button title="Add session" onPress={() => router.push("/add-session")} />}
    <IconButton icon="refresh" title="Refresh data" onPress={() => setNotice(controller.refreshHistory() ? "Local session data refreshed." : "Refresh failed. Please retry.")} />
    <Disclosure title="How progress is counted" icon="info-outline"><Copy>All saved breathing contributes to time. Streaks and badges require completed sessions, including manual entries. Days follow local time; a missed day never removes earned badges.</Copy></Disclosure>
    {!!notice && <Copy accessibilityLiveRegion="polite">{notice}</Copy>}<SaveError />
  </Screen>;
}
