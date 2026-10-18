import { router } from "expo-router";
import { Card, Label, Title, Copy, Button, ActionRow } from "./ui";
import { useSession } from "./provider";
import { dailyResetChallenge, dailyResetProtocol, dailyResetStats } from "./daily-reset";
import { dayKey } from "./progress";
import { useProgressDate } from "./progress-ui";
import { message } from "./i18n";
import type { SessionController } from "./session-controller";

export function openDailyReset(c: SessionController, trackOpen = true) {
  if (trackOpen) c.analytics.track("daily_reset_opened");
  if (c.current?.stage === "active") { router.push("/session"); return; }
  if (c.current?.stage === "post") { router.push("/post"); return; }
  if (c.pendingTest()) { router.push({ pathname: "/challenge-test", params: { id: c.pendingTest()!.challengeId } }); return; }
  if (c.pendingFitness()) { router.push({ pathname: "/fitness-challenge", params: { id: c.pendingFitness()!.challengeId } }); return; }
  c.requestSafety(() => c.startDailyReset(), dailyResetProtocol());
  router.push("/practice-safety");
}
export function DailyResetCard({ detail = false }: { detail?: boolean }) {
  const c = useSession(), now = useProgressDate();
  const stats = dailyResetStats(c.dailyReset(), dayKey(now));
  return <Card><Label>FREE · DAILY RESET</Label><Title>{dailyResetChallenge.title}</Title>
    <Copy>{dailyResetChallenge.instructions}</Copy>
    <Copy>{message("{0} day streak · {1} of the last 7 days", [stats.current, stats.week])}</Copy>
    {stats.todayComplete && <Copy>Today is complete. Repeat whenever you like; one daily award is saved.</Copy>}
    <Button title={stats.todayComplete ? "Repeat the reset" : "Start my 60-second reset"} disabled={!!c.error} onPress={() => openDailyReset(c, !detail)} />
    {!detail && <ActionRow title="Daily Reset progress" icon="show-chart" onPress={() => router.push("/daily-reset")} />}
  </Card>;
}
