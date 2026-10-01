import { useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { BackScreen, Button, Card, Chip, Copy, Label, Title, ActionFooter } from "../src/ui";
import { Alert, TextInput } from "../src/localized-native";
import { useReminders } from "../src/reminder-context";
import { useSession } from "../src/provider";
import { experienceFor } from "../src/experience";
import { locale, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import type { Reminder } from "../src/reminders";
import { SessionDatePicker } from "../src/session-date-picker";

export default function Reminders() {
  useLanguage();
  const service = useReminders();
  const controller = useSession();
  const rituals = experienceFor(controller.preferences).rituals;
  const [draft, setDraft] = useState<Reminder | null>(null);
  const [notice, setNotice] = useState("");
  if (!service) return <BackScreen title="REMINDERS"><Copy>Reminders are unavailable.</Copy></BackScreen>;
  const time = (r: Reminder) => new Date(2026, 0, 1, r.hour, r.minute);
  const dayName = (day: number, short = false) => new Date(2026, 5, 6 + day).toLocaleDateString(locale(), { weekday: short ? "short" : "long" });
  const valid = draft && draft.label.trim() && draft.weekdays.length && (!draft.ritualId || rituals.some(r => r.id === draft.ritualId));
  return <BackScreen title="REMINDERS" avoidKeyboard footer={draft ? <ActionFooter>
    <Button title={service.busy ? "Saving…" : "Save reminder"} disabled={!valid || service.busy} onPress={() => { void service.save(draft).then(saved => { if (saved) setDraft(null); }); }} />
    <Button title="Cancel" secondary disabled={service.busy} onPress={() => setDraft(null)} />
  </ActionFooter> : undefined}>
    <Title>Make room for your practice.</Title>
    <Copy>Choose your days and local time. Reminders stay on this phone, use a neutral message, and never start a session automatically. Delivery may be delayed by your phone.</Copy>
    {!!service.message && <Copy accessibilityRole="alert">{service.message}</Copy>}
    {!!notice && <Copy accessibilityRole="alert">{notice}</Copy>}
    {draft ? <>
      <Label>REMINDER NAME</Label><TextInput accessibilityLabel={t("Reminder name")} maxLength={40} value={draft.label} onChangeText={label => setDraft({ ...draft, label })} style={{ padding: 12 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {([ ["Morning focus", 8], ["Midday reset", 13], ["Wind down", 21] ] as const).map(([label, hour]) => <Chip key={label} title={label} selected={draft.hour === hour && draft.minute === 0} onPress={() => setDraft({ ...draft, label: t(label), hour, minute: 0 })} />)}
      </View>
      <SessionDatePicker timeOnly value={time(draft)} disabled={service.busy} onChange={date => setDraft({ ...draft, hour: date.getHours(), minute: date.getMinutes() })} />
      <Label>REPEAT ON</Label><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[2,3,4,5,6,7,1].map(day => <Chip key={day} translate={false} title={dayName(day)} selected={draft.weekdays.includes(day)} onPress={() => setDraft({ ...draft, weekdays: draft.weekdays.includes(day) ? draft.weekdays.filter(d => d !== day) : [...draft.weekdays, day].sort() })} />)}</View>
      <Label>PRACTICE</Label><Chip title="Quick breathing practice" selected={!draft.ritualId} onPress={() => setDraft({ ...draft, ritualId: undefined })} />
      {rituals.map(ritual => <Chip key={ritual.id} translate={false} title={ritual.name} selected={draft.ritualId === ritual.id} onPress={() => setDraft({ ...draft, ritualId: ritual.id })} />)}
    </> : <>
      {service.items.map(reminder => <Card key={reminder.id}>
        <Title translate={false}>{reminder.label}</Title>
        <Copy translate={false}>{time(reminder).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })} · {reminder.weekdays.map(d => dayName(d, true)).join(" · ")}</Copy>
        <Copy>{reminder.enabled ? "Enabled" : "Paused"}</Copy>
        {reminder.ritualId && !rituals.some(r => r.id === reminder.ritualId) && <Copy>This ritual was removed. Edit the reminder to choose another practice; it will not be scheduled until then.</Copy>}
        <Button title="Edit reminder" secondary disabled={service.busy} onPress={() => setDraft({ ...reminder, weekdays: [...reminder.weekdays] })} />
        <Button title={reminder.enabled ? "Pause reminder" : "Enable reminder"} secondary disabled={service.busy} onPress={() => { void service.save({ ...reminder, enabled: !reminder.enabled }); }} />
        <Button title="Delete reminder" danger secondary disabled={service.busy} onPress={() => Alert.alert("Delete reminder?", "This removes its scheduled notifications from this phone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { void service.remove(reminder.id); } }])} />
      </Card>)}
      {!service.items.length && <Copy>No reminders yet. Start with a time that fits your day.</Copy>}
      <Button title="Add reminder" disabled={service.busy || service.items.length >= 5} onPress={() => setDraft({ id: randomUUID(), label: t("My daily practice"), hour: 8, minute: 0, weekdays: [1,2,3,4,5,6,7], enabled: true })} />
    </>}
    <Copy>Free includes one reminder. Pro includes up to five. Existing reminders remain available.</Copy>
    <Button title="Explore Pro" secondary onPress={() => router.push("/pro")} />
    <Button title="Retry reminder scheduling" secondary disabled={service.busy} onPress={() => { void service.reconcile(); }} />
    <Button title="Open notification settings" secondary onPress={() => { void Linking.openSettings().catch(() => setNotice("Could not open phone settings.")); }} />
  </BackScreen>;
}
