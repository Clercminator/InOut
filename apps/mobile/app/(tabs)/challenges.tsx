import { useCallback, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen, Title, Copy, Label, Card, Button, ActionRow } from "../../src/ui";
import { useSession } from "../../src/provider";
import { challengeCatalog, challengeExpired } from "../../src/challenges";
import { testCatalog } from "../../src/challenge-tests";
import { ChallengeCard } from "../../src/challenge-ui";
import { ChallengeArt } from "../../src/challenge-art";
import { useLanguage } from "../../src/use-language";
import { useTheme } from "../../src/theme";
import { dayKey } from "../../src/progress";
export default function Challenges() {
  useLanguage(); const c = useSession(), { colors } = useTheme();
  const states = c.challenges(), catalog = challengeCatalog(), tests = testCatalog();
  const [daily, setDaily] = useState<string | null>(null);
  const pro = c.entitlements.state.pro;
  useFocusEffect(useCallback(() => {
    const refresh = () => setDaily(c.dailyChallenge()); refresh();
    c.analytics.track("challenge_list_viewed");
    const timer = setInterval(refresh, 60000); return () => clearInterval(timer);
  }, [c, pro]));
  const active = catalog.filter(d => states.some(s => s.challengeId === d.id && s.status === "active" && !challengeExpired(d, s)));
  const todayTest = tests.find(d => d.id === daily), todayProgram = catalog.find(d => d.id === daily);
  const practiced = todayTest ? c.testAttempts().some(a => a.challengeId === daily && a.completed && a.localDay === dayKey(new Date())) : states.find(s => s.challengeId === daily)?.completedSteps.some(s => s.localDay === dayKey(new Date()));
  const open = (id: string) => router.push({ pathname: tests.some(d => d.id === id) ? "/challenge-test" : "/challenge", params: { id } });
  return <Screen tabScreen hideHeader><View style={{ gap: 8 }}><Label>YOUR PRACTICE. YOUR PROGRESS.</Label><Title>Challenges</Title><Copy>Test yourself. Build a habit. Take it into your day.</Copy></View>
    {(todayTest || todayProgram) && <Card style={{ backgroundColor: colors.accentSurface }}><Label>TODAY’S CHALLENGE</Label><ChallengeArt art={todayTest?.art ?? todayProgram!.artKey} height={155} /><Title>{todayTest?.title ?? todayProgram!.title}</Title><Copy>{todayTest?.description ?? todayProgram!.description}</Copy><Copy>{todayTest?.duration ?? todayProgram!.time}</Copy><Button title={practiced ? "Today is complete · View" : "Start"} onPress={() => open(daily!)} /></Card>}
    {c.testState().pending && <ActionRow title="Resume unfinished challenge" icon="timer" onPress={() => open(c.testState().pending!.challengeId)} />}
    {!!active.length && <Label>CONTINUE YOUR PRACTICE</Label>}
    {active.map(d => <ChallengeCard compact key={d.id} definition={d} state={states.find(s => s.challengeId === d.id)} pro={pro} />)}
    <Label>TEST YOURSELF</Label>
    {tests.filter(d => d.type !== "real_world").map(d => <Card key={d.id}><View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><View style={{ width: 86 }}><ChallengeArt art={d.art} height={86} /></View><View style={{ flex: 1, gap: 6 }}><Label>{d.title}</Label><Copy>{d.description}</Copy></View></View><Copy>{d.duration}</Copy>{c.testState().excluded.includes(d.id) && <Copy>Marked unsuitable</Copy>}<Button title={c.entitlements.challengeAccess(d.id).allowed ? "View test" : "View Pro test"} secondary onPress={() => open(d.id)} /></Card>)}
    <Label>BUILD A HABIT</Label>
    {catalog.filter(d => d.id !== "breath-explorer" && !active.includes(d)).map(d => <ChallengeCard compact key={d.id} definition={d} state={states.find(s => s.challengeId === d.id)} pro={pro} />)}
    <Label>PERSONAL GOALS</Label><Card><ActionRow title="Beat Your Best" icon="trending-up" onPress={() => router.push("/challenge-best")} /><Copy>Your next target comes from your own history.</Copy></Card>
    {catalog.filter(d => d.id === "breath-explorer" && !active.includes(d)).map(d => <ChallengeCard compact key={d.id} definition={d} state={states.find(s => s.challengeId === d.id)} pro={pro} />)}
    {tests.filter(d => d.type === "real_world").map(d => <Card key={d.id}><ChallengeArt art={d.art} height={130} /><Title>{d.title}</Title><Copy>{d.description}</Copy><Copy>{d.duration}</Copy><Button title="View challenge" secondary onPress={() => open(d.id)} /></Card>)}
    <Card><Label>RECENT ACHIEVEMENTS</Label>{c.rewards().badges.filter(b => b.id.startsWith("challenge-") || b.id.startsWith("test-")).slice(0, 3).map(b => <Copy key={b.id}>{b.label}</Copy>)}<ActionRow title="View all badges" icon="workspace-premium" onPress={() => router.push({ pathname: "/(tabs)/progress", params: { section: "Badges" } })} /><ActionRow title="Challenge results" icon="show-chart" onPress={() => router.push("/challenge-history")} /></Card>
  </Screen>;
}
