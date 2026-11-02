import { useMemo } from "react";
import { router } from "expo-router";
import { BackScreen, Button, Card, Copy, Label, Title } from "../src/ui";
import { useSession } from "../src/provider";
import { practiceInsights } from "../src/insights";
import { recordTitle, message, decimal, countLabel } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { useProgressDate } from "../src/progress-ui";
import { practiceDuration } from "../src/format";
export default function Insights() {
  useLanguage();
  const controller = useSession();
  const now = useProgressDate();
  const records = controller.history();
  const pro = controller.entitlements.has("advancedInsights");
  const insights = useMemo(() => pro ? practiceInsights(records, now) : null, [records, now, pro]);
  return <BackScreen title="PRACTICE INSIGHTS">
    <Title>Notice your own patterns.</Title>
    <Copy>Private on this phone. These observations describe your practice and voluntary ratings; they do not show cause, predict results, or measure medical benefit.</Copy>
    {!insights ? <Card>
      <Label>IN/OUT PRO</Label><Copy>Compare your recent practice rhythm and see which completed patterns you return to. Tension summaries appear only after enough paired check-ins.</Copy>
      <Button title="Explore Pro" onPress={() => router.push("/pro")} />
      <Button title="View history & progress" secondary onPress={() => router.replace("/(tabs)/progress")} />
    </Card> : <>
      <Card><Label>YOUR RECENT RHYTHM</Label>
        <Copy>{message("Last 7 days: {0} · {1}", [countLabel(insights.currentWeek.count, "session"), practiceDuration(insights.currentWeek.totalMs)])}</Copy>
        <Copy>{message("Previous 7 days: {0} · {1}", [countLabel(insights.previousWeek.count, "session"), practiceDuration(insights.previousWeek.totalMs)])}</Copy>
        <Copy>Includes saved practice and manual logs. Today is still in progress. Rest days are part of a sustainable routine.</Copy>
      </Card>
      <Card><Label>MOST PRACTICED · LAST 30 DAYS</Label>
        {insights.mostUsed ? <><Title translate={false}>{recordTitle(insights.mostUsed.record)}</Title><Copy>{countLabel(insights.mostUsed.sessions, "session")}</Copy></>
          : <Copy>Complete the same pattern at least three times to see the one you return to most.</Copy>}
      </Card>
      <Label>YOUR CHECK-INS · LAST 30 DAYS</Label>
      <Copy>Each summary needs at least 5 completed sessions with both ratings across 3 different days. Different cadences and session lengths are counted separately. Manual and early-ended sessions are excluded here.</Copy>
      {!insights.patterns.length && <Card><Copy>Your first practice starts here.</Copy><Button title="Start a practice" onPress={() => router.push("/pre")} /></Card>}
      {insights.patterns.map(pattern => <Card key={pattern.key}>
        <Title translate={false}>{recordTitle(pattern.record)}</Title>
        <Copy>{pattern.record.stateMetric === "wellbeing_v2" ? "Self-reported well-being · 1–10" : "Self-reported tension · 1–10"}</Copy>
        <Copy>{practiceDuration(pattern.record.engine.elapsedAtAnchor)} · {message("{0} across {1}", [countLabel(pattern.pairs, "pairedRating"), countLabel(pattern.days, "day")])}</Copy>
        {pattern.median === null ? <Copy>Not enough check-ins yet. Rating your practice is always optional.</Copy> : <>
          <Copy>{message("Median State Shift: {0}", [decimal(pattern.median, 1)])}</Copy>
          <Copy>{message("Improved: {0} · Unchanged: {1} · Declined: {2}", [pattern.lower, pattern.same, pattern.higher])}</Copy>
          <Copy>{pattern.record.stateMetric === "wellbeing_v2" ? "Positive means improved well-being." : "Positive means lower reported tension. Your circumstances and the sessions you chose to rate can affect this pattern."}</Copy>
        </>}
      </Card>)}
    </>}
  </BackScreen>;
}
