import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { protocols, planFor } from "@inout/protocols";
import { totalDuration, validatePlan } from "@inout/breathing-engine";
import type { PhaseType, Protocol, SavedRoutine } from "@inout/shared-types";
import { colors } from "@inout/design-tokens";
import { useSession, SaveError } from "./provider";
import { makeCustomProtocol, makeMixProtocol, customPhase } from "./custom-protocol";
import { BackScreen, Button, Card, Copy, Label, Title, s } from "./ui";
import { duration } from "./format";

function integer(value: string, min: number, max: number, name: string) {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
    throw new Error(`${name} must be a whole number from ${min} to ${max}.`);
  return Number(value);
}
function Field({ label, value, onChange, numeric = false }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean }) {
  return <View style={{ gap: 8 }}><Label>{label}</Label><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    keyboardType={numeric ? "number-pad" : "default"} maxLength={numeric ? 3 : 60} selectTextOnFocus={numeric}
    style={{ ...s.copy, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.lowest }} /></View>;
}
type Row = { protocol?: Protocol; type: PhaseType; value: string };
const phaseTypes: PhaseType[] = ["inhale", "inhaleTopUp", "hold", "exhale", "hum", "freeBreathing"];

export function RoutineEditor({ kind }: { kind: SavedRoutine["kind"] }) {
  const controller = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const saved = id ? controller.routines().find((item) => item.id === id && item.kind === kind) : undefined;
  const [key] = useState(() => id ?? randomUUID());
  const [name, setName] = useState(saved?.protocol.name ?? (kind === "mix" ? "My Mix" : "My Pattern"));
  const [count, setCount] = useState(String(saved?.protocol.defaultCycles ?? (kind === "mix" ? 1 : 6)));
  const [rows, setRows] = useState<Row[]>(() => kind === "pattern"
    ? saved?.protocol.phases.map((p) => ({ type: p.type, value: String(p.durationMs / 1000) })) ?? [{ type: "inhale", value: "4" }, { type: "exhale", value: "6" }]
    : saved?.protocol.plan?.blocks.map((b) => ({ type: "inhale", value: String(b.cycles),
      protocol: makeCustomProtocol(b.protocolId, protocols.find((p) => p.id === b.protocolId)?.name ?? controller.routines().find((p) => p.id === b.protocolId)?.protocol.name ?? "Custom pattern", b.phases, b.cycles),
    })) ?? []);
  const [notice, setNotice] = useState("");
  const access = controller.entitlements.routineAccess(kind, controller.routines(), key);
  const changeRows = (next: Row[]) => { setNotice(""); setRows(next); };
  let draft: Protocol | null = null, validation = "";
  try {
    if (!name.trim()) throw new Error("Give your routine a name.");
    if (rows.some((row) => row.protocol?.id === "high-intensity-cyclic")) throw new Error("Remove the high-intensity block to use this mix in this release.");
    const cycles = integer(count, 1, kind === "mix" ? 5 : 100, kind === "mix" ? "Repeats" : "Cycles");
    draft = kind === "pattern"
      ? makeCustomProtocol(key, name.trim(), rows.map((p) => customPhase(p.type, integer(p.value, p.type === "hold" ? 0 : 1, 60, "Phase seconds"))), cycles)
      : { ...makeMixProtocol(rows.map((b) => ({ ...b.protocol!, defaultCycles: integer(b.value, 1, 100, "Block cycles") }))), id: key, name: name.trim(), defaultCycles: cycles };
    validatePlan(planFor(draft));
    draft.defaultDuration = totalDuration(planFor(draft));
    if (kind === "mix") draft.durationPresets = [draft.defaultDuration];
  } catch (error) { validation = error instanceof Error ? error.message : "Check your routine."; draft = null; }
  if (id && !saved) return <BackScreen title="ROUTINE"><Title>Routine unavailable</Title><Copy>It may have been deleted. Your history is unchanged.</Copy></BackScreen>;
  const actions = (index: number) => {
    const options = [
      { icon: "arrow-upward", label: "Move up", disabled: index === 0, run: () => { const next = [...rows]; [next[index-1], next[index]] = [next[index], next[index-1]]; changeRows(next); } },
      { icon: "arrow-downward", label: "Move down", disabled: index === rows.length-1, run: () => { const next = [...rows]; [next[index+1], next[index]] = [next[index], next[index+1]]; changeRows(next); } },
      { icon: "content-copy", label: "Duplicate", disabled: rows.length >= 20, run: () => changeRows([...rows.slice(0,index+1), { ...rows[index] }, ...rows.slice(index+1)]) },
      { icon: "delete-outline", label: "Remove", disabled: false, run: () => changeRows(rows.filter((_,i) => i !== index)) },
    ] as const;
    return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{options.map((a) => <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={`${a.label} ${index+1}`} accessibilityState={{ disabled: a.disabled }} disabled={a.disabled} onPress={a.run} style={[s.iconButton, { opacity: a.disabled ? 0.3 : 1 }]}><MaterialIcons name={a.icon} size={22} color={colors.accent} /></Pressable>)}</View>;
  };
  return <BackScreen title={kind === "mix" ? "MIX BUILDER" : "PATTERN BUILDER"}>
    <Title>{saved ? "Edit your routine." : "Make it yours."}</Title>
    <Field label="Name" value={name} onChange={(value) => { setNotice(""); setName(value); }} />
    <Card><Field label={kind === "mix" ? "Repeats" : "Cycles"} value={count} numeric onChange={(value) => { setNotice(""); setCount(value); }} />
      <Copy>{draft ? `${duration(draft.defaultDuration)} total` : "Set your cadence below"}</Copy></Card>
    {rows.map((row,index) => <Card key={index}><Label>{kind === "mix" ? `BLOCK ${index+1}` : `PHASE ${index+1}`}</Label>
      <Copy style={s.subtitle}>{row.protocol?.name ?? customPhase(row.type,1).label}</Copy>
      <Field label={`${kind === "mix" ? "Block" : "Phase"} ${index+1} ${kind === "mix" ? "cycles" : "seconds"}`} value={row.value} numeric onChange={(value) => changeRows(rows.map((r,i) => i === index ? { ...r, value } : r))} />{actions(index)}</Card>)}
    <Label>{kind === "pattern" ? "ADD PHASE" : "ADD BLOCK"} · {rows.length}/20</Label>
    {kind === "pattern" ? phaseTypes.map((type) => <Button key={type} title={`Add ${customPhase(type,1).label.toLowerCase()}`} secondary disabled={rows.length >= 20} onPress={() => changeRows([...rows, { type, value: "4" }])} />)
      : [...protocols.filter((p) => p.availability === "enabled"), ...controller.routines().filter((r) => r.kind === "pattern").map((r) => r.protocol)].map((p) => <Button key={p.id} title={`Add ${p.name}`} secondary disabled={rows.length >= 20} onPress={() => changeRows([...rows, { protocol: p, type: "inhale", value: String(p.defaultCycles) }])} />)}
    {!!validation && <Copy accessibilityRole="alert">{validation}</Copy>}
    <Copy>Breathe comfortably. Use easy holds and stop if you feel unwell.</Copy>
    <Button title="Audio & haptics" secondary onPress={() => router.push("/settings")} />
    <SaveError />{!!notice && <Copy accessibilityRole="alert">{notice}</Copy>}
    {!access.allowed && <><Copy accessibilityRole="alert">{access.message}</Copy><Button title="Explore Pro" secondary onPress={() => router.push("/pro")} /></>}
    {!!controller.routineNotice && <Copy accessibilityRole="alert">{controller.routineNotice}</Copy>}
    <Button title="Save routine" disabled={!draft || !!controller.error || !access.allowed} onPress={() => { if (draft && controller.saveRoutine(draft,kind,key)) setNotice("Saved on this phone."); }} />
    <Button title="Use this routine" secondary disabled={!draft || !!controller.error} onPress={() => { if (draft) { controller.setCustomProtocol(draft); router.push({ pathname: "/pre", params: { id: "custom" } }); } }} />
  </BackScreen>;
}
