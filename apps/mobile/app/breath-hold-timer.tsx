import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { BreathHoldTimer, formatHoldTime } from "../src/breath-hold-timer";
import { useSession } from "../src/provider";
import { ActionFooter, Button, Card, Copy, Label, Screen, Title } from "../src/ui";
import { locale, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { useTheme } from "../src/theme";

export default function BreathHoldTimerScreen() {
  const c = useSession();
  useLanguage();
  const { colors } = useTheme();
  const [, redraw] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [visibleHistory, setVisibleHistory] = useState(10);
  const [history, setHistory] = useState(() => c.breathHoldHistory());
  const sequence = useRef(0);
  const [timer] = useState(() => new BreathHoldTimer(() => performance.now(), Date.now,
    () => `hold-${Date.now()}-${++sequence.current}-${Math.random().toString(36).slice(2)}`, event => c.analytics.track(event)));
  const refresh = useCallback(() => redraw(n => n + 1), []);
  const interrupt = useCallback(() => { timer.interrupt(); refresh(); }, [timer, refresh]);
  useFocusEffect(useCallback(() => {
    c.analytics.track("breath_hold_timer_opened");
    setHistory(c.breathHoldHistory());
    return () => { timer.interrupt(); };
  }, [c, timer]));
  useEffect(() => {
    const state = AppState.addEventListener("change", next => { if (next !== "active") interrupt(); });
    // Android also reports loss of interaction (e.g. notification shade) without a state change.
    const blur = AppState.addEventListener("blur", interrupt);
    return () => { state.remove(); blur.remove(); timer.interrupt(); };
  }, [timer, interrupt]);
  const running = timer.status === "running";
  useEffect(() => {
    if (!running) return;
    let disposed = false;
    void activateKeepAwakeAsync("inout-hold-timer").then(() => {
      if (disposed) void deactivateKeepAwake("inout-hold-timer").catch(() => {});
    }).catch(() => {});
    const tick = setInterval(() => {
      if (AppState.currentState !== "active") timer.interrupt(); else timer.sample();
      refresh();
    }, 50);
    return () => { disposed = true; clearInterval(tick); void deactivateKeepAwake("inout-hold-timer").catch(() => {}); };
  }, [running, timer, refresh]);
  const busy = !!c.current && c.current.stage !== "result" || c.hasActiveChallenge();
  const reset = () => { timer.reset(); setSaveError(false); refresh(); };
  return <Screen title="Breath Hold Timer" back={() => { timer.interrupt(); router.back(); }}
    footer={running ? <ActionFooter><Button title="Stop" onPress={() => { timer.stop(); refresh(); }} /></ActionFooter> : undefined}>
    <Title>A comfortable pause.</Title>
    <Copy>Practice seated or lying down. Never in water or while driving. Do not hyperventilate beforehand. Stop immediately if uncomfortable or dizzy.</Copy>
    <Copy>This is a timer, not a medical assessment. There is no target to beat.</Copy>
    <Card>
      <Label>{running ? "Running" : timer.status === "interrupted" ? "Attempt interrupted" : timer.status === "ready" ? "Ready" : "Your result"}</Label>
      <Copy translate={false} adjustsFontSizeToFit numberOfLines={1} accessibilityRole="timer" accessibilityLabel={`${t("Elapsed time")}: ${formatHoldTime(timer.elapsedMs)}`}
        style={{ fontSize: 52, lineHeight: 68, fontWeight: "700", fontVariant: ["tabular-nums"], textAlign: "center", color: colors.accent }}>{formatHoldTime(timer.elapsedMs)}</Copy>
      <View accessible={false} style={{ height: 4, borderRadius: 2, backgroundColor: running ? colors.accent : colors.border }} />
      {timer.status === "interrupted" && <Copy accessibilityRole="alert">The attempt was interrupted and was not saved. Rest and try again when ready.</Copy>}
      {running ? null : timer.status === "ready" ? <>
        {busy && <Copy>Finish your current practice before starting the timer.</Copy>}
        <Button title="Start" disabled={busy} onPress={() => { if (AppState.currentState === "active" && !busy) { timer.start(); refresh(); } }} />
      </> : <>
        {timer.status === "stopped" && <Button title="Save attempt" onPress={() => { const saved = timer.save(attempt => c.saveBreathHold(attempt)); setSaveError(!saved); if (saved) setHistory(c.breathHoldHistory()); refresh(); }} />}
        {timer.status === "saved" && <Copy accessibilityLiveRegion="polite">Attempt saved on this phone.</Copy>}
        {saveError && <Copy accessibilityRole="alert">The attempt could not be saved. Free some storage and try saving again.</Copy>}
        <Button title="Try again" secondary onPress={reset} />
      </>}
    </Card>
    <Button title="Return to Challenges" variant="quiet" onPress={() => { timer.interrupt(); router.replace("/(tabs)/challenges"); }} />
    <Label>SAVED ATTEMPTS</Label>
    <Copy>Only attempts you choose to save appear here. They do not count toward guided practice or streaks.</Copy>
    {!history.length && <Copy>No saved attempts yet.</Copy>}
    {history.slice(0, visibleHistory).map(attempt => <Card key={attempt.id}>
      <Copy translate={false} style={{ fontSize: 28, fontVariant: ["tabular-nums"] }}>{formatHoldTime(attempt.elapsedMs)}</Copy>
      <Copy translate={false}>{new Date(attempt.completedAt).toLocaleString(locale())}</Copy>
    </Card>)}
    {history.length > visibleHistory && <Button title="Show more" secondary onPress={() => setVisibleHistory(n => n + 10)} />}
  </Screen>;
}
