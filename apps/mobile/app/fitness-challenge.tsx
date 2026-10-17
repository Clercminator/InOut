import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, Copy, Card, Button, Chip, ActionRow } from "../src/ui";
import { TextInput } from "../src/localized-native";
import { SaveError, useSession } from "../src/provider";
import { fitnessDefinition, fitnessSafety, fitnessClock, fitnessBest } from "../src/personal-challenges";
import { useLanguage } from "../src/use-language";
import { useTheme } from "../src/theme";
import { message, t } from "../src/i18n";
export default function FitnessChallenge() {
  useLanguage(); const c = useSession(), { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>(), d = fitnessDefinition(id);
  const p = c.pendingFitness();
  const [confirmed, setConfirmed] = useState(false), [elapsed, setElapsed] = useState(() => c.fitnessElapsed());
  useFocusEffect(useCallback(() => {
    c.analytics.track("challenge_viewed", d ? { challengeType: d.id } : undefined);
    setElapsed(c.fitnessElapsed());
    const display = setInterval(() => setElapsed(c.fitnessElapsed()), 100);
    const checkpoint = setInterval(() => { if (c.pendingFitness()?.status === "running") c.checkpointFitness(); }, 1000);
    const appState = AppState.addEventListener("change", state => { if (state !== "active" && c.pendingFitness()?.status === "running") c.checkpointFitness("paused"); });
    return () => { clearInterval(display); clearInterval(checkpoint); appState.remove(); if (c.pendingFitness()?.status === "running") c.checkpointFitness("paused"); };
  }, [c, d?.id]));
  if (!d) return <BackScreen title="Challenges"><Copy>Result unavailable</Copy></BackScreen>;
  if (p && p.challengeId !== d.id) return <BackScreen title={d.title}><Copy>Finish or discard your current attempt first.</Copy><Button title="Resume unfinished challenge" onPress={() => router.replace({ pathname: "/fitness-challenge", params: { id: p.challengeId } })} /></BackScreen>;
  const best = fitnessBest(c.fitnessState().results, d.id);
  const busy = !!c.error || !!c.current && c.current.stage !== "result" || !!c.pendingTest();
  const save = () => { const resultId = c.saveFitness(); if (resultId) router.replace({ pathname: "/fitness-result", params: { id: resultId, fresh: "1" } }); };
  return <BackScreen title={d.title}>
    <Label>FREE · PERSONAL BEST</Label><Title>{d.title}</Title><Copy>Self-reported fitness record</Copy>
    <Card><Copy>{d.instructions}</Copy><Copy>{fitnessSafety}</Copy></Card>
    {!p ? <>
      <Chip title="I am ready to exercise safely and stop whenever needed" selected={confirmed} onPress={() => setConfirmed(!confirmed)} />
      <Button title={d.type === "manual" ? "Enter repetitions" : "Start stopwatch"} disabled={!confirmed || busy} onPress={() => c.beginFitness(d.id, confirmed)} />
      {busy && <Copy>Finish your current session before starting another activity.</Copy>}
      {c.current?.stage === "active" && <Button title="Return to session" onPress={() => router.push("/session")} />}
      {c.current?.stage === "post" && <Button title="Finish your State Shift" onPress={() => router.push("/post")} />}
    </> : <>
      {d.type === "stopwatch" && <>
        <Copy translate={false} accessibilityRole="timer" accessibilityLabel={message("Elapsed time: {0}", [fitnessClock(elapsed)])} style={{ fontSize: 56, lineHeight: 72, fontWeight: "700", fontVariant: ["tabular-nums"], color: colors.accent }}>{fitnessClock(elapsed)}</Copy>
        <Label>{p.status === "running" ? "Stopwatch running" : p.status === "paused" ? "Paused" : "Ready to save"}</Label>
        {p.status === "running" && <Button title="Pause" onPress={() => c.checkpointFitness("paused")} />}
        {p.status === "paused" && <Button title="Resume" disabled={busy} onPress={() => c.resumeFitness()} />}
        {p.status !== "finished" && <Button title="Finish" onPress={() => c.checkpointFitness("finished")} />}
        <Copy>Leaving this screen pauses the timer. After a restart, only the last saved time is kept.</Copy>
      </>}
      {(d.type === "manual" || p.status === "finished") && <Card>
        {d.type === "manual" && <><Label>Completed repetitions</Label><TextInput accessibilityLabel="Completed repetitions" keyboardType="number-pad" maxLength={5} value={p.repetitions === undefined ? "" : String(p.repetitions)} onChangeText={value => { if (/^\d*$/.test(value)) c.editFitnessDraft(p.note ?? "", Number(value)); }} style={{ padding: 14, fontSize: 30 }} /><Copy>Manually entered. No camera or sensor verification.</Copy></>}
        <Label>Private note (optional)</Label><TextInput accessibilityLabel="Private note (optional)" multiline maxLength={500} value={p.note ?? ""} onChangeText={note => c.editFitnessDraft(note, p.repetitions)} style={{ padding: 14 }} />
        <Button title="Save result" disabled={busy || (d.type === "manual" ? !p.repetitions : p.elapsedMs < 100)} onPress={() => { if (p.status === "finished" || c.checkpointFitness("finished")) save(); }} />
      </Card>}
      <Button title="Discard attempt" secondary disabled={!!c.error} onPress={() => c.discardFitness()} />
    </>}
    <SaveError />
    <Card><Label>PERSONAL HISTORY</Label><Copy>{best ? message("Personal best: {0} {1}", [best.value, t(best.unit)]) : "Your first saved result will establish your baseline."}</Copy>
      <ActionRow title="Challenge results" icon="show-chart" onPress={() => router.push({ pathname: "/challenge-history", params: { activity: d.id } })} />
    </Card>
  </BackScreen>;
}
