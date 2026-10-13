import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { BackScreen, Title, Label, Copy, Card, Button, Chip, StateScale, ActionRow } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { testCatalog, personalBest } from "../src/challenge-tests";
import { ChallengeArt } from "../src/challenge-art";
import { useTheme } from "../src/theme";
import { useLanguage } from "../src/use-language";
import { message } from "../src/i18n";

export default function ChallengeTest() {
  useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>(), c = useSession(), { colors } = useTheme();
  const d = testCatalog().find(d => d.id === id), pending = c.testState().pending;
  const p = pending?.challengeId === id ? pending : null;
  const [confirmed, setConfirmed] = useState(false), [rating, setRating] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0), [notice, setNotice] = useState("");
  const timing = useRef<{ mono: number; wall: number } | null>(null), midpoint = useRef(false);
  const savedPending = useRef<string | null>(null);
  if (p) savedPending.current = p.id;
  useEffect(() => {
    if (!p && savedPending.current && c.testAttempts().some(a => a.id === savedPending.current)) {
      const attempt = savedPending.current; savedPending.current = null;
      router.replace({ pathname: "/challenge-attempt", params: { attempt, fresh: "1" } });
    }
  }, [c, p]);
  const running = !!p && p.finishedAt === undefined;
  const locked = !!d && !c.entitlements.challengeAccess(d.id).allowed;
  const excluded = !!d && c.testState().excluded.includes(d.id);
  const history = c.testAttempts().filter(a => a.challengeId === id && a.completed);
  const best = d ? personalBest(history.map(a => ({ value: a.value, timestamp: a.finishedAt })), { metricId: d.id, direction: d.direction, unit: d.unit, challengeType: d.type }) : null;
  useEffect(() => { c.analytics.track("challenge_viewed"); }, [c, id]);
  useFocusEffect(useCallback(() => {
    // A breath test must never resume an unseen hold after navigation or a cold start.
    if (p && p.challengeId !== "nasal-10" && p.finishedAt === undefined && !timing.current) {
      c.abandonTest(); setNotice("Interrupted test. Breathe normally and start again when ready.");
    }
    return () => {
      if (timing.current && c.testState().pending?.challengeId !== "nasal-10" && c.testState().pending?.finishedAt === undefined) c.abandonTest();
      timing.current = null;
    };
  }, [c, id]));
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state !== "active" && timing.current && p?.challengeId !== "nasal-10" && running) {
        timing.current = null; c.abandonTest(); setNotice("Interrupted test. Breathe normally and start again when ready.");
      }
    });
    return () => sub.remove();
  }, [c, running, p?.challengeId]);
  useEffect(() => {
    if (!running || !p) return;
    if (p.challengeId !== "nasal-10" && !timing.current) {
      if (c.pendingTest()?.id === p.id) c.abandonTest();
      setNotice("Interrupted test. Breathe normally and start again when ready."); return;
    }
    const tick = () => {
      const ms = p.challengeId === "nasal-10" ? Date.now() - p.startedAt : timing.current ? performance.now() - timing.current.mono : 0;
      if (ms < 0 || (timing.current && Math.abs((Date.now() - timing.current.wall) - (performance.now() - timing.current.mono)) > 2000)) {
        timing.current = null; c.abandonTest(); setNotice("The device clock changed. Please start a new attempt."); return;
      }
      setElapsed(ms);
      if (p.challengeId === "nasal-10") {
        if (ms >= 300000 && ms < 600000 && !midpoint.current && AppState.currentState === "active") { midpoint.current = true; if (c.preferences.haptics) void Haptics.selectionAsync().catch(() => {}); }
        if (ms >= 600000) c.finishTest(600000);
      } else if (ms >= 180000) {
        timing.current = null; c.abandonTest(); setNotice("Timer ended. Resume normal breathing. No result was saved.");
      }
    };
    tick(); const timer = setInterval(tick, 100); return () => clearInterval(timer);
  }, [c, running, p?.id]);
  if (!d) return <BackScreen title="Challenges"><Copy>Challenge unavailable</Copy></BackScreen>;
  const start = () => {
    if (locked) { router.push({ pathname: "/pro", params: { source: "challenges" } }); return; }
    setNotice("");
    if (d.id === "state-shift-60") {
      if (rating === null) return;
      c.startStateShift(rating, confirmed);
      if (c.current?.stage === "active") router.push("/session");
    } else {
      midpoint.current = false;
      timing.current = c.beginTest(d.id, confirmed) ? { mono: performance.now(), wall: Date.now() } : null;
    }
  };
  const save = (completed: boolean) => {
    const attempt = c.saveTest(completed);
    if (attempt) { savedPending.current = null; router.replace({ pathname: "/challenge-attempt", params: { attempt, fresh: "1" } }); }
  };
  const remaining = Math.max(0, Math.ceil((600000 - elapsed) / 1000));
  return <BackScreen title={d.title}>
    {running ? <>
      <Label>{d.id === "nasal-10" ? "EASY WALK · TIME REMAINING" : "STAY COMFORTABLE"}</Label>
      <View style={{ minHeight: 240, borderRadius: 120, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" }}>
        <Copy translate={false} accessibilityLabel={d.id === "nasal-10" ? message("{0} seconds remaining", [remaining]) : message("{0} seconds", [(elapsed / 1000).toFixed(1)])} style={{ fontSize: 64, lineHeight: 80, color: colors.accent, fontVariant: ["tabular-nums"] }}>{d.id === "nasal-10" ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : (elapsed / 1000).toFixed(1)}</Copy>
      </View>
      <Copy>{d.id === "comfort-hold" ? "Finish at the first desire to breathe. Resume normal breathing." : d.id === "nasal-10" ? "Keep the walk easy. Return to normal breathing whenever needed." : "Finish as soon as your comfortable exhale ends."}</Copy>
      {d.id !== "nasal-10" && <Button title="Finish" onPress={() => c.finishTest(timing.current ? performance.now() - timing.current.mono : 0)} />}
      <Button title="Stop without a result" secondary onPress={() => { timing.current = null; c.abandonTest(); setNotice("Resume normal breathing. Try again only when comfortable."); }} />
    </> : p?.finishedAt !== undefined ? <>
      <ChallengeArt art={d.art} height={180} /><Title>{d.id === "nasal-10" ? "How did your walk go?" : "Your result"}</Title>
      <Copy translate={false} style={{ fontSize: 56, lineHeight: 68, color: colors.accent }}>{p.value?.toFixed(1)} {d.unit}</Copy>
      <Copy>{d.id === "nasal-10" ? "Did you complete all 10 minutes breathing only through your nose?" : "Resume calm normal breathing. Save this attempt to your personal history."}</Copy>
      <Button title={d.id === "nasal-10" ? "Yes, all 10 minutes" : "Save result"} disabled={!!c.error || locked} onPress={() => save(true)} />
      {d.id === "nasal-10" && <Button title="Not this time" secondary disabled={!!c.error || locked} onPress={() => save(false)} />}
      {locked && <Button title="Unlock with InOut Pro" onPress={start} />}
      <Button title="Discard attempt" secondary onPress={() => c.abandonTest()} />
    </> : <>
      <ChallengeArt art={d.art} height={190} /><Title>{d.title}</Title><Copy>{d.description}</Copy><Label>{d.duration}</Label>
      {d.type === "benchmark" && <Card><Label>PERSONAL HISTORY</Label><Title>{best ? message("Best: {0} sec", [best.value.toFixed(1)]) : "Establish your baseline"}</Title><Copy>{message("Attempts: {0}", [history.length])}</Copy></Card>}
      <Card><Label>HOW IT WORKS</Label><Copy>{d.instructions}</Copy></Card>
      <Card><Label>STAY SAFE</Label><Copy>{d.safety}</Copy><ActionRow title="Breathing safety" icon="health-and-safety" onPress={() => router.push("/safety")} /></Card>
      {excluded ? <><Copy>You marked this test as unsuitable. Choose another practice.</Copy><Button title="Review my eligibility" secondary onPress={() => { c.excludeTest(d.id, false); setConfirmed(false); }} /></> : <>
        <Chip title={d.id === "nasal-10" ? "I am somewhere safe for an easy walk" : "I have read the precautions and I am in a safe place"} selected={confirmed} onPress={() => setConfirmed(!confirmed)} />
        {d.id === "state-shift-60" && <><Title>How tense are you right now?</Title><StateScale value={rating} onChange={setRating} /></>}
        {pending && !p && <Button title="Resume unfinished challenge" secondary onPress={() => router.replace({ pathname: "/challenge-test", params: { id: pending.challengeId } })} />}
        {c.current && c.current.stage !== "result" && <Button title="Resume practice" secondary onPress={() => router.push(c.current?.stage === "post" ? "/post" : "/session")} />}
        <Button title={locked ? "Unlock with InOut Pro" : "Ready · Start"} disabled={!locked && (!confirmed || (d.id === "state-shift-60" && rating === null) || !!pending || !!c.error || (!!c.current && c.current.stage !== "result"))} onPress={start} />
        <Button title="This test is not suitable for me" secondary onPress={() => c.excludeTest(d.id, true)} />
      </>}
      <Copy>Complete this challenge to earn its badge. Your personal history stays on this phone.</Copy>
    </>}
    {!!notice && <Copy accessibilityRole="alert">{notice}</Copy>}<SaveError />
  </BackScreen>;
}
