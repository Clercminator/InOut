import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Copy, Label, Card, Button } from "../src/ui";
import { Alert, TextInput } from "../src/localized-native";
import { SaveError, useSession } from "../src/provider";
import { fitnessDefinition, isFitnessBest } from "../src/personal-challenges";
import { Celebration } from "../src/celebration";
import { useLanguage } from "../src/use-language";
import { locale, message, t } from "../src/i18n";
export default function FitnessResultScreen() {
  useLanguage(); const c = useSession(), { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const results = c.fitnessState().results, result = results.find(r => r.id === id);
  const [editing, setEditing] = useState(false), [value, setValue] = useState(String(result?.value ?? "")), [note, setNote] = useState(result?.note ?? "");
  if (!result) return <BackScreen title="Challenges"><Copy>Result unavailable</Copy></BackScreen>;
  const best = isFitnessBest(result, results);
  return <BackScreen title={fitnessDefinition(result.challengeId)!.title}>
    {fresh === "1" && !editing && <Celebration variant="saved" title="Result saved" message="A personal practice. A moment worth keeping." />}
    <Label>{best ? "PERSONAL BEST" : "ATTEMPT SAVED"}</Label><Title>{message("{0} {1}", [result.value, t(result.unit)])}</Title>
    <Copy>Self-reported fitness record</Copy><Copy>Manually entered or timed by you. This is not verified athletic performance.</Copy>
    <Copy translate={false}>{result.localDay} · {new Date(result.finishedAt).toLocaleTimeString(locale())}</Copy>
    {!!result.note && <Card><Label>Private note (optional)</Label><Copy translate={false}>{result.note}</Copy></Card>}
    {editing ? <Card><Label>Completed repetitions</Label><TextInput accessibilityLabel="Completed repetitions" keyboardType="number-pad" maxLength={5} value={value} onChangeText={setValue} style={{ padding: 14 }} />
      <TextInput accessibilityLabel="Private note (optional)" multiline maxLength={500} value={note} onChangeText={setNote} style={{ padding: 14 }} />
      <Button title="Save changes" disabled={!/^\d+$/.test(value) || Number(value) < 1 || !!c.error} onPress={() => { if (c.editFitnessResult(id, Number(value), note)) setEditing(false); }} />
      <Button title="Discard changes" secondary onPress={() => { setValue(String(result.value)); setNote(result.note ?? ""); setEditing(false); }} />
    </Card> : <>
      <Button title="Share my result" onPress={() => router.push({ pathname: "/challenge-share", params: { fitness: id } })} />
      {result.unit === "repetitions" && <Button title="Edit result" secondary onPress={() => setEditing(true)} />}
      <Button title="Try again" secondary onPress={() => router.replace({ pathname: "/fitness-challenge", params: { id: result.challengeId } })} />
    </>}
    <Button title="Delete result" secondary disabled={!!c.error} onPress={() => Alert.alert("Delete result?", "This removes the result and recalculates your personal best.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { if (c.deleteFitnessResult(id)) router.replace("/challenge-history"); } }])} />
    <Button title="Return to Home" secondary onPress={() => router.replace("/(tabs)")} /><SaveError />
  </BackScreen>;
}
