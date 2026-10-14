import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Title, Label, Copy, Card, Button, Chip, Disclosure, ActionRow } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { programs, programFor, coachProtocol, coachProtocolIds, weeklyReview } from "../src/coach";
import { dayKey } from "../src/progress";
import { useProgressDate } from "../src/progress-ui";
import { protocolTitle, message, locale } from "../src/i18n";
import { practiceDuration } from "../src/format";
import { experienceFor } from "../src/experience";
import { useTheme } from "../src/theme";

export default function Coach() {
  const controller = useSession(), { colors } = useTheme();
  const now = useProgressDate(), today = dayKey(now);
  const state = controller.coachState();
  const [editDate, setEditDate] = useState<string | null>(null);
  const enrollment = state.enrollments.find(e => e.id === state.activeEnrollmentId);
  const current = enrollment && programFor(enrollment.programId);
  const review = weeklyReview(controller.history(), now.getTime());
  const canPlan = controller.entitlements.has("continuingPlans");
  const busy = !!controller.error || !!controller.current && controller.current.stage !== "result";
  const openProgram = (step: number, repeat = false) => {
    if (!enrollment || !current) return;
    router.push({ pathname: "/pre", params: { id: current.steps[step].protocolId, coachRun: enrollment.id, coachStep: String(step), coachRepeat: repeat ? "1" : "0" } });
  };
  const offer = () => router.push({ pathname: "/pro", params: { source: "coach" } });
  return <BackScreen title="Coach & programs">
    <Title>Your next small step.</Title>
    <Copy>Approved practices, at your pace. Programs count practice days, not deadlines. Missed days never erase progress.</Copy>
    {busy && <Copy>Finish your current session before changing your plan.</Copy>}
    {controller.current?.stage === "active" && <Button title="Return to session" onPress={() => router.push("/session")} />}
    {controller.current?.stage === "post" && <Button title="Finish your State Shift" onPress={() => router.push("/post")} />}
    <Disclosure title="Make time for practice" icon="tune">
      <Label>AVAILABLE MINUTES</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[1, 2, 3, 5, 10].map(minutes => <Chip key={minutes} title={String(minutes)} selected={state.availableMinutes === minutes} onPress={() => controller.configureCoach({ availableMinutes: minutes })} />)}</View>
      <Copy>Duration changes only. Breathing rhythms and holds stay unchanged.</Copy>
      <Label>PRACTICE DAYS PER WEEK</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[2, 3, 4, 5, 7].map(weeklyGoal => <Chip key={weeklyGoal} title={String(weeklyGoal)} selected={experienceFor(controller.preferences).weeklyGoal === weeklyGoal} onPress={() => { if (!busy) controller.updateExperience({ weeklyGoal }); }} />)}</View>
      <Copy>Frequency applies to your next weekly plan. You can edit individual days below.</Copy>
      <Chip title="Use my check-ins for local recommendations" selected={state.useFeedback} onPress={() => controller.configureCoach({ useFeedback: !state.useFeedback })} />
      <Copy>Check-ins stay on this phone. They can suggest a shorter practice, never stronger breathing or longer holds.</Copy>
    </Disclosure>
    {current && enrollment && <Card>
      <Label>CURRENT PROGRAM</Label><Title>{current.title}</Title>
      <Copy>{message("{0} of {1} practice days complete", [enrollment.completed.length, current.days])}</Copy>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={current.title} accessibilityValue={{ min: 0, max: current.days, now: enrollment.completed.length }} style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}>
        <View style={{ height: 6, borderRadius: 3, width: `${100 * enrollment.completed.length / current.days}%`, backgroundColor: colors.accent }} />
      </View>
      {!controller.entitlements.programAccess(current.id).allowed ? <><Copy>Your progress is saved. Pro access is needed to continue this program.</Copy><Button title="Explore InOut Pro" onPress={offer} /></> : <>
        {enrollment.status === "completed" ? <Copy>Program complete. Keep the rhythms you enjoyed, or repeat at your own pace.</Copy>
          : enrollment.status === "paused" ? <Button title="Resume program" disabled={busy} onPress={() => controller.pauseProgram(false)} />
            : <>
              {controller.coachSession({ enrollmentId: enrollment.id, step: enrollment.completed.length }) ? <>
                <Copy>{message("Day {0} of {1}", [enrollment.completed.length + 1, current.days])} · {protocolTitle(coachProtocol(current.steps[enrollment.completed.length].protocolId)!)}</Copy>
                <Copy>{current.steps[enrollment.completed.length].explanation}</Copy>
                <Button title="Start today's session" disabled={busy} onPress={() => openProgram(enrollment.completed.length)} />
                <Button title="Skip today" secondary disabled={busy} onPress={() => controller.skipProgramDay()} />
              </> : <Copy>Your progress is saved. Come back on your next practice day.</Copy>}
              <Button title="Pause program" secondary disabled={busy} onPress={() => controller.pauseProgram(true)} />
            </>}
        {enrollment.completed.length > 0 && enrollment.status !== "paused" && <><Button title="Repeat last practice" secondary disabled={busy} onPress={() => openProgram(enrollment.completed.length - 1, true)} /><Copy>Repeating is optional. It does not advance another program day.</Copy></>}
      </>}
      <Disclosure title="Upcoming practices" icon="calendar-today">{current.steps.slice(enrollment.completed.length, enrollment.completed.length + 3).map((step, i) => <Copy key={i}>{message("Day {0}", [enrollment.completed.length + i + 1])} · {protocolTitle(coachProtocol(step.protocolId)!)} · {practiceDuration(Math.min(step.seconds, state.availableMinutes * 60) * 1000)}</Copy>)}</Disclosure>
    </Card>}
    <Label>GUIDED PROGRAMS</Label>
    {programs.map(program => {
      const allowed = controller.entitlements.programAccess(program.id).allowed;
      const saved = state.enrollments.find(e => e.programId === program.id && e.status !== "completed");
      return <Card key={program.id}>
        <Label>{program.id === "find-your-rhythm" ? "FREE" : "IN/OUT PRO"}</Label><Title>{program.title}</Title><Copy>{program.description}</Copy>
        <Copy>{message("{0} practice days", [program.days])}</Copy>
        <Disclosure title="Preview program" icon="visibility">{program.steps.slice(0, 3).map((step, i) => <Copy key={i}>{message("Day {0}", [i + 1])} · {protocolTitle(coachProtocol(step.protocolId)!)} · {practiceDuration(step.seconds * 1000)}</Copy>)}<Copy>{program.steps[0].explanation}</Copy></Disclosure>
        {!(saved?.id === state.activeEnrollmentId && saved?.status === "active") && <Button title={allowed ? saved ? "Continue program" : "Start program" : "Explore InOut Pro"} disabled={busy} secondary={!allowed} onPress={() => allowed ? controller.enrollProgram(program.id) : offer()} />}
      </Card>;
    })}
    <Card><Label>CONTINUING WEEKLY PLAN</Label><Copy>A week of familiar practices shaped by your goal, available time, and preferred frequency.</Copy>
      {!canPlan ? <Button title="Explore InOut Pro" onPress={offer} /> : !state.week || state.week.entries[6].date < today ? <Button title="Create my week" disabled={busy} onPress={() => controller.createCoachWeek()} /> : <>
        <Button title={state.week.paused ? "Resume weekly plan" : "Pause weekly plan"} secondary disabled={busy} onPress={() => controller.pauseCoachWeek(!state.week!.paused)} />
        {state.week.entries.map(entry => <View key={entry.date} style={{ gap: 8, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border }}>
          <Copy translate={false}>{new Date(entry.date + "T12:00:00").toLocaleDateString(locale(), { weekday: "short", month: "short", day: "numeric" })}</Copy>
          <Copy>{entry.status === "rest" ? "Rest day" : entry.status === "skipped" ? "Skipped" : entry.status === "completed" ? "Completed" : entry.date < today ? "Missed day. No catch-up needed." : "Planned"}</Copy>
          {entry.status !== "rest" && <Copy>{protocolTitle(coachProtocol(entry.protocolId)!)}</Copy>}
          {entry.date === today && !state.week!.paused && (entry.status === "planned" || entry.status === "completed") && <Button title={entry.status === "completed" ? "Repeat practice" : "Start planned practice"} disabled={busy} onPress={() => router.push({ pathname: "/pre", params: { id: entry.protocolId, coachWeek: state.week!.start, coachDate: entry.date, coachRepeat: entry.status === "completed" ? "1" : "0" } })} />}
          {entry.date >= today && entry.status !== "completed" && <Button title="Modify this day" secondary disabled={busy} onPress={() => setEditDate(editDate === entry.date ? null : entry.date)} />}
          {editDate === entry.date && <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{coachProtocolIds.map(id => <Chip key={id} title={protocolTitle(coachProtocol(id)!)} selected={entry.protocolId === id} onPress={() => controller.editCoachDay(entry.date, id)} />)}</View>
            <Label>AVAILABLE MINUTES</Label><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[1, 2, 3, 5].map(minutes => <Chip key={minutes} title={String(minutes)} selected={entry.cycles === Math.max(1, Math.floor(minutes * 60000 / coachProtocol(entry.protocolId)!.phases.reduce((sum, p) => sum + p.durationMs, 0)))} onPress={() => controller.editCoachDay(entry.date, undefined, minutes)} />)}</View>
            <Button title="Skip this day" secondary onPress={() => { controller.editCoachDay(entry.date, undefined, undefined, true); setEditDate(null); }} />
          </>}
        </View>)}
      </>}
    </Card>
    <Card><Label>YOUR WEEKLY REVIEW</Label><Copy>{message("{0} sessions · {1} minutes · {2} practice days", [review.sessions, review.minutes, review.days])}</Copy><Copy>A missed day is a chance to return, not a debt to catch up on.</Copy>
      {controller.entitlements.has("advancedInsights") && <ActionRow title="Practice insights" icon="insights" onPress={() => router.push("/insights")} />}
    </Card>
    <Disclosure title="About your coach" icon="info-outline"><Copy>Your coach works offline, without an account. Recommendations use approved protocols and never increase breathing intensity.</Copy><Copy>AI-assisted coaching is not enabled in this build. Your goals and check-ins are not sent to an AI service.</Copy></Disclosure>
    <SaveError />
  </BackScreen>;
}
