import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Title, Copy, Label, Card, Chip, ActionRow } from "../src/ui";
import { useSession } from "../src/provider";
import { testDefinition, testCatalog } from "../src/challenge-tests";
import { challengeCatalog, definitionForState } from "../src/challenges";
import { message, t, locale } from "../src/i18n";
import { useLanguage } from "../src/use-language";
export default function ChallengeHistory() {
  useLanguage(); const c = useSession(), [filter, setFilter] = useState("all");
  const attempts = c.testAttempts().filter(a => filter === "all" || a.challengeId === filter).sort((a, b) => b.finishedAt - a.finishedAt);
  return <BackScreen title="Challenge results"><Title>Your own trajectory.</Title><Copy>Personal observations, saved on this phone.</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip title="All" selected={filter === "all"} onPress={() => setFilter("all")} />{testCatalog().map(d => <Chip key={d.id} title={d.title} selected={filter === d.id} onPress={() => setFilter(d.id)} />)}</View>
    {!attempts.length && <Copy>Complete a test to establish your baseline.</Copy>}
    {attempts.map(a => { const d = testDefinition(a.challengeId); return <Card key={a.id}><ActionRow icon="show-chart" title={d?.title ?? a.challengeId} onPress={() => router.push({ pathname: "/challenge-attempt", params: { attempt: a.id } })} /><Copy translate={false}>{a.challengeId === "state-shift-60" ? `${a.before} → ${a.after}` : `${a.value.toFixed(1)} ${t(d?.unit ?? "sec")}`} · {new Date(a.finishedAt).toLocaleDateString(locale())}</Copy><Label>{a.completed ? "CHALLENGE COMPLETE" : "ATTEMPT SAVED"}</Label></Card>; })}
    {filter === "all" && c.challenges().filter(s => s.status === "completed").map(s => { const current = challengeCatalog().find(d => d.id === s.challengeId); if (!current) return null; const d = definitionForState(current, s); return <Card key={s.challengeId}><ActionRow icon="workspace-premium" title={d.title} onPress={() => router.push({ pathname: "/challenge-complete", params: { id: d.id } })} /><Copy>{message("{0} / {1}", [s.progress, d.targetCount])}</Copy></Card>; })}
  </BackScreen>;
}
