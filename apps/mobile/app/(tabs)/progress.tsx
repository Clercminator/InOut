import { useEffect, useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Title, Label, Card, Copy, Button, Chip, Disclosure, ActionRow, IconButton } from "../../src/ui";
import { addDays, dayKey, practiceStats } from "../../src/progress";
import { useSession, SaveError } from "../../src/provider";
import { AdSlot } from "../../src/ad-slot";
import { PracticeCalendar } from "../../src/practice-calendar";
import { useProgressDate } from "../../src/progress-ui";
import { AchievementGallery } from "../../src/achievement-gallery";
import { WeekActivity } from "../../src/week-activity";
import { productConfig } from "../../src/product-config";
import { countLabel, locale, message, t } from "../../src/i18n";
import { useTheme } from "../../src/theme";
import { useLanguage } from "../../src/use-language";
export default function Progress() {
  const controller = useSession(), { colors } = useTheme();
  useLanguage();
  const now = useProgressDate();
  const { width } = useWindowDimensions();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [section, setSection] = useState(view === "Badges" ? "Badges" : view === "Calendar" ? "Calendar" : "Overview"), [notice, setNotice] = useState("");
  useEffect(() => { if (view && ["Badges", "Calendar", "Overview"].includes(view)) setSection(view); }, [view]);
  useEffect(() => { controller.analytics.track("progress_viewed"); }, [controller]);
  useEffect(() => { if (section === "Calendar") controller.analytics.track("calendar_viewed"); }, [controller, section]);
  const records = controller.history();
  const stats = useMemo(() => practiceStats(records, now), [records, now]);
  const paired = stats.records.filter(r => r.endReason === "completed" && r.pre !== null && r.post !== null);
  const weekStart = addDays(now, -((now.getDay() + 6) % 7));
  const weekRecords = stats.records.filter(r => r.engine.startedAt >= weekStart.getTime());
  const weekMinutes = Math.floor(weekRecords.reduce((sum, r) => sum + r.engine.elapsedAtAnchor, 0) / 60000);
  const shift = paired.length ? `${(paired.reduce((n, r) => n + r.pre!, 0) / paired.length).toFixed(1)} → ${(paired.reduce((n, r) => n + r.post!, 0) / paired.length).toFixed(1)}` : "—";
  const daily = Array.from({ length: 7 }, (_, i) => { const date = addDays(weekStart, i); return { key: dayKey(date), label: date.toLocaleDateString(locale(), { weekday: "narrow" }), records: weekRecords.filter(r => dayKey(new Date(r.engine.startedAt)) === dayKey(date)) }; });
  return <Screen tabScreen hideHeader>
    <View style={{ gap: 6 }}><Title>Results</Title><Copy>Your practice, taking shape.</Copy></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{[
      [String(stats.current), "DAY STREAK"], [String(weekMinutes), "MINUTES THIS WEEK"], [String(stats.count), "SESSIONS"], [shift, "AVERAGE STATE SHIFT"],
    ].map(([value, label]) => <Card key={label} style={{ flexBasis: "46%", flexGrow: 1, padding: 16, backgroundColor: colors.accentSurface, gap: 8 }}><Copy translate={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: label === "AVERAGE STATE SHIFT" ? width < 360 ? 20 : 24 : 34, lineHeight: 40, fontWeight: "700", color: colors.accent }}>{value}</Copy><Label>{label}</Label></Card>)}</View>
    <Copy style={{ fontSize: 12, lineHeight: 18, color: colors.secondaryText }}>{paired.length ? message("{0} paired check-ins · Self-reported tension, 1–10", [paired.length]) : "Complete optional before-and-after check-ins to see your State Shift here."}</Copy>
    <WeekActivity buckets={daily} />
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
      <Card><ActionRow icon="emoji-events" title="Challenge results" onPress={() => router.push("/challenge-history")} /><ActionRow icon="bar-chart" title="See all stats" onPress={() => router.push("/stats")} /><ActionRow icon="insights" title="Practice insights" onPress={() => router.push("/insights")} /><ActionRow icon="history" title="View session history" onPress={() => router.push("/history")} /><ActionRow title="My practice profile" icon="person-outline" onPress={() => router.push("/profile")} /><ActionRow title="My rituals" icon="auto-awesome" onPress={() => router.push("/rituals")} /></Card>
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
