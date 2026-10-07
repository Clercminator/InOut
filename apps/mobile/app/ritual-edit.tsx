import { useTheme } from "../src/theme";
import { t, protocolTitle, message } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { TextInput } from "../src/localized-native";
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { protocols, planFor, sigh, isCyclic } from "@inout/protocols";
import { totalDuration } from "@inout/breathing-engine";
import { BackScreen, Button, Card, Chip, Copy, Label, useStyles } from "../src/ui";
import { SaveError, useSession } from "../src/provider";
import { experienceFor } from "../src/experience";
import { practiceDuration } from "../src/format";
import { SoundControls } from "../src/sound-controls";

export default function RitualEdit() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const { ritualId, protocolId, cycles: initialCycles } = useLocalSearchParams<{ ritualId?: string; protocolId?: string; cycles?: string }>();
  const e = experienceFor(controller.preferences);
  const existing = e.rituals.find(r => r.id === ritualId);
  const [protocol, setProtocol] = useState(existing?.protocol ?? (protocolId === "custom" ? controller.customProtocol : protocols.find(p => p.id === protocolId)) ?? sigh);
  const [name, setName] = useState(existing?.name ?? t("My daily practice"));
  const [cycles, setCycles] = useState(String(existing?.cycles ?? (Number(initialCycles) || protocol.defaultCycles)));
  const [useCurrent, setUseCurrent] = useState(!existing);
  const validCycles = /^\d+$/.test(cycles) && +cycles >= 1 && +cycles <= (isCyclic(protocol) ? 3 : 100);
  const canSaveProtocol = !!existing || protocols.some(p => p.id === protocol.id) || controller.routines().some(r => r.protocol.id === protocol.id);
  if (ritualId && !existing) return <BackScreen title="RITUAL"><Copy>This ritual is no longer available.</Copy></BackScreen>;
  if (!existing && protocolId && (protocolId === "custom" ? !controller.customProtocol : !protocols.some(p => p.id === protocolId)))
    return <BackScreen title="RITUAL"><Copy>This session draft is no longer available. Choose a protocol again.</Copy><Button title="Choose a protocol" onPress={() => router.replace("/(tabs)/protocols")} /></BackScreen>;
  return <BackScreen title={existing ? "EDIT RITUAL" : "NEW RITUAL"} avoidKeyboard>
    <Label>RITUAL NAME</Label><TextInput accessibilityLabel={t("Ritual name")} maxLength={40} value={name} onChangeText={setName} style={{ ...s.copy, padding: 14, backgroundColor: colors.card, borderRadius: 12 }} />
    <Card><Label>PROTOCOL</Label><Copy translate={false} style={s.subtitle}>{protocolTitle(protocol)}</Copy>
      <View style={s.row}>{[...protocols.filter(p => p.availability === "enabled"), ...controller.routines().map(r => r.protocol)].map(p => <Chip key={p.id} translate={false} title={protocolTitle(p)} selected={protocol.id === p.id} onPress={() => { setProtocol(p); setCycles(String(p.defaultCycles)); }} />)}</View>
      <Label>{isCyclic(protocol) ? "ROUNDS" : protocol.plan ? "REPEATS" : "CYCLES"}</Label><TextInput accessibilityLabel={t("Ritual cycles")} keyboardType="number-pad" value={cycles} onChangeText={setCycles} maxLength={3} style={{ ...s.copy, padding: 14, backgroundColor: colors.background, borderRadius: 12 }} />
      <Copy>{validCycles ? isCyclic(protocol) ? message(+cycles === 1 ? "Up to {0} · 1 round" : "Up to {0} · {1} rounds", [practiceDuration(totalDuration(planFor(protocol, +cycles))), +cycles]) : practiceDuration(totalDuration(planFor(protocol, +cycles))) : isCyclic(protocol) ? "Choose 1–3 rounds." : "Choose 1–100 cycles."}</Copy>
    </Card>
    {existing && <Chip title="Use current sound & appearance" selected={useCurrent} onPress={() => setUseCurrent(!useCurrent)} />}
    {useCurrent ? <Card><SoundControls compact /><Copy>Appearance: {e.palette} · {e.texture} · {e.background}</Copy><Button title="Change appearance" secondary onPress={() => router.push("/personalize")} /></Card>
      : <Copy>Keeping this ritual's saved sound and appearance.</Copy>}
    <Copy>Start in a safe place. Keep each breath comfortable; stop if unwell.</Copy>
    <SaveError />
    {!canSaveProtocol && <Copy>Save this custom pattern in your library before making it a ritual.</Copy>}
    <Button title="Save ritual" disabled={!name.trim() || !validCycles || !canSaveProtocol || !!controller.error} onPress={() => {
      if (existing && !useCurrent) {
        if (controller.updateExperience({ rituals: e.rituals.map(r => r.id === existing.id ? { ...r, name: name.trim(), protocol, cycles: +cycles } : r) })) router.replace("/rituals");
      } else if (controller.saveRitual(name, protocol, +cycles, existing?.id)) router.replace("/rituals");
    }} />
  </BackScreen>;
}
