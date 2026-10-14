import { router } from "expo-router";
import type { PracticeGoal } from "@inout/shared-types";
import { useSession } from "./provider";
import { dailyRecommendation, programFor } from "./coach";
import { Card, Label, Copy, Button, ActionRow } from "./ui";
import { protocolTitle, message } from "./i18n";
import { protocols } from "@inout/protocols";
import { practiceDuration } from "./format";
import { useProgressDate } from "./progress-ui";

export function DailyCoachCard({ goal }: { goal?: PracticeGoal }) {
  const controller = useSession();
  const now = useProgressDate();
  const state = controller.coachState();
  const enrollment = state.enrollments.find(e => e.id === state.activeEnrollmentId);
  const program = enrollment && programFor(enrollment.programId);
  const active = !goal && enrollment?.status === "active" && !!program && controller.entitlements.programAccess(program.id).allowed;
  const step = enrollment?.completed.length ?? 0;
  const planned = active ? controller.coachSession({ enrollmentId: enrollment.id, step }) : null;
  const basic = dailyRecommendation(controller.preferences, controller.history(), state, now.getTime(), goal);
  const choice = planned ?? basic;
  return <Card style={{ gap: 10 }}>
    <Label>{active ? program.title : "TODAY'S PRACTICE"}</Label>
    {active && !planned ? <Copy>Your progress is saved. Come back on your next practice day.</Copy> : <>
      <Copy accessibilityRole="header" style={{ fontSize: 22, lineHeight: 29, fontWeight: "700" }}>{protocolTitle(protocols.find(p => p.id === choice.protocolId)!)}</Copy>
      <Copy translate={false}>{practiceDuration(choice.seconds * 1000)}{active ? ` · ${message("Day {0} of {1}", [step + 1, program.days])}` : ""}</Copy>
      <Copy>{planned?.explanation ?? basic.reason}</Copy>
      <Button title="Start practice" onPress={() => router.push({ pathname: "/pre", params: planned && enrollment
        ? { id: choice.protocolId, coachRun: enrollment.id, coachStep: String(step) }
        : { id: choice.protocolId, coachSeconds: String(choice.seconds) } })} />
    </>}
    <ActionRow title="Coach & programs" icon="auto-awesome" onPress={() => router.push("/coach")} />
  </Card>;
}
