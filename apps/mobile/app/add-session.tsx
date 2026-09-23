import { useEffect, useRef, useState } from "react";
import { Keyboard, TextInput, View } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import type { Goal } from "@inout/shared-types";
import { colors } from "@inout/design-tokens";
import { BackScreen, Button, Card, Chip, Copy, Label, Title, s } from "../src/ui";
import { useSession } from "../src/provider";
import { practiceGoals } from "../src/manual-session";
import { SessionDatePicker } from "../src/session-date-picker";
import { practiceDuration } from "../src/format";

export default function AddSession() {
  const controller = useSession();
  const [id] = useState(() => randomUUID());
  useEffect(() => () => controller.cancelManualSave(id), [controller, id]);
  const [goal, setGoal] = useState<Goal>("Calm");
  const [startedAt, setStartedAt] = useState(() => { const date = new Date(Date.now() - 60000); date.setSeconds(0, 0); return date; });
  const [hours, setHours] = useState("0"), [minutes, setMinutes] = useState("1"), [seconds, setSeconds] = useState("0");
  const [submitted, setSubmitted] = useState(false), [pending, setPending] = useState(false), [editing, setEditing] = useState(false);
  const saving = useRef(false);
  const [, refresh] = useState(0);
  const record = controller.history().find(r => r.id === id);
  const durationMs = (+hours * 3600 + +minutes * 60 + +seconds) * 1000;
  const durationError = ![hours, minutes, seconds].every(value => /^\d+$/.test(value)) || +minutes > 59 || +seconds > 59
    ? "Use whole numbers; minutes and seconds must be 0–59." : durationMs < 1000 || durationMs > 86400000 ? "Enter a duration between 1 second and 24 hours." : "";
  const dateError = startedAt.getTime() + durationMs > Date.now() ? "The session must start and finish in the past." : "";
  const field = (label: string, value: string, change: (value: string) => void) => <View style={{ flexGrow: 1, flexBasis: 80, gap: 8 }}>
    <Copy>{label}</Copy><TextInput accessibilityLabel={label} value={value} onChangeText={change} keyboardType="number-pad" editable={!pending}
      onFocus={() => setEditing(true)} selectTextOnFocus maxLength={2}
      style={{ ...s.copy, backgroundColor: colors.raised, borderWidth: 1, borderColor: submitted && durationError ? colors.danger : colors.border, borderRadius: 8, padding: 14, minHeight: 48 }} />
  </View>;
  if (record) return <BackScreen title="ADD SESSION">
    <Title>Session saved</Title><Copy accessibilityLiveRegion="polite">Saved on this phone.</Copy>
    <Card><Label>{record.goal.toUpperCase()}</Label><Title>{practiceDuration(record.engine.elapsedAtAnchor)}</Title><Copy>{new Date(record.engine.startedAt).toLocaleString()}</Copy></Card>
    <Button title="View session history" onPress={() => router.replace("/history")} />
    <Button title="View progress" secondary onPress={() => router.replace("/(tabs)/progress")} />
  </BackScreen>;
  return <BackScreen title="ADD SESSION" avoidKeyboard footer={editing ? <View style={{ padding: 12 }}><Button title="Done editing" secondary onPress={() => { Keyboard.dismiss(); setEditing(false); }} /></View> : undefined}>
    <Title>Log your breathing practice.</Title><Copy style={s.small}>Manual entries count toward your time, streaks and milestones.</Copy>
    <Card><Label>GOAL</Label><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{practiceGoals.map(value => <Chip key={value} title={value} selected={goal === value} onPress={() => { if (!pending) setGoal(value); }} />)}</View></Card>
    <Card><Label>DURATION</Label><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{field("Hours", hours, setHours)}{field("Minutes", minutes, setMinutes)}{field("Seconds", seconds, setSeconds)}</View>
      {submitted && !!durationError && <Copy accessibilityRole="alert" style={{ color: colors.danger }}>{durationError}</Copy>}
    </Card>
    <Card><SessionDatePicker value={startedAt} onChange={setStartedAt} disabled={pending} /><Copy style={s.small}>Your phone’s local time.</Copy>
      {submitted && !durationError && !!dateError && <Copy accessibilityRole="alert" style={{ color: colors.danger }}>{dateError}</Copy>}
    </Card>
    {controller.error && <Card><Copy accessibilityRole="alert">{controller.error}</Copy><Button title="Retry saving" onPress={() => { controller.retry(); refresh(value => value + 1); }} /></Card>}
    <Button title={pending ? "Waiting to save" : "Save session"} disabled={pending || !!controller.error} onPress={() => {
      Keyboard.dismiss(); setEditing(false); setSubmitted(true);
      if (durationError || dateError || saving.current) return;
      saving.current = true;
      try {
        controller.addManualSession({ goal, startedAt: startedAt.getTime(), durationMs }, id);
        setPending(true);
      } finally { saving.current = false; }
    }} />
    <Button title="Cancel" secondary onPress={() => {
      controller.cancelManualSave(id);
      router.canGoBack() ? router.back() : router.replace("/(tabs)/progress");
    }} />
  </BackScreen>;
}
