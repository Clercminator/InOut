import { AchievementCard } from "./achievement-card";
import { View } from "react-native";
import { AchievementMark } from "./achievement-mark";
import { router } from "expo-router";
import { useSession } from "./provider";
import { achievementProgress } from "./achievements";
import { Card, Copy, Label, Button } from "./ui";
import { useTheme } from "./theme";
import { message } from "./i18n";
import { definitionForState, challengeCatalog } from "./challenges";
import { ChallengeProgress } from "./challenge-ui";
export function AchievementGallery() {
  const controller = useSession(), { colors } = useTheme();
  const ledger = controller.rewards();
  const definitions = achievementProgress(controller.history());
  const challenges = controller.challenges();
  return <View style={{ gap: 16 }}><Label>CHALLENGE BADGES</Label>{challengeCatalog().map(current => {
    const d = definitionForState(current, challenges.find(s => s.challengeId === current.id));
    const state = challenges.find(s => s.challengeId === d.id), earned = ledger.badges.some(b => b.id === `challenge-${d.id}`);
    return <AchievementCard key={d.id} title={d.title} description={d.description}
      earnedDate={ledger.badges.find(b => b.id === `challenge-${d.id}`)?.date} progress={state?.progress ?? 0} target={d.targetCount}
      action={earned ? "View achievement" : "View challenge"}
      onPress={() => router.push({ pathname: earned ? "/challenge-complete" : "/challenge", params: { id: d.id } })} />;
  })}<Label>PRACTICE BADGES</Label>{definitions.map(badge => {
    const earned = ledger.badges.find(b => b.id === badge.id);
    return <AchievementCard key={badge.id} title={badge.title} description={badge.description} icon={badge.icon}
      earnedDate={earned?.date} progress={badge.progress} target={badge.conditionValue}
      action={earned ? "Share achievement" : "Start practice"}
      onPress={() => earned ? router.push({ pathname: "/milestone", params: { badge: badge.id } }) : router.push("/protocols")} />;
  })}{ledger.badges.filter(b => !definitions.some(d => d.id === b.id) && !challengeCatalog().some(d => b.id === `challenge-${d.id}`)).map(b => <Card key={b.id}><Label>{b.label}</Label><Copy>{b.date}</Copy><Button title="Share achievement" secondary onPress={() => router.push({ pathname: "/milestone", params: { badge: b.id } })} /></Card>)}</View>;
}
