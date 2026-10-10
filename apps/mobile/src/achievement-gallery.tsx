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
    return <Card key={d.id} style={{ backgroundColor: earned ? colors.reward + "0C" : colors.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><AchievementMark earned={earned} size={64} /><View style={{ flex: 1, gap: 4 }}><Label>{d.title}</Label><Copy>{d.description}</Copy></View></View>
      <ChallengeProgress definition={d} state={state} />
      <Button title={earned ? "View achievement" : "View challenge"} secondary onPress={() => router.push({ pathname: earned ? "/challenge-complete" : "/challenge", params: { id: d.id } })} />
    </Card>;
  })}<Label>PRACTICE BADGES</Label>{definitions.map(badge => {
    const earned = ledger.badges.find(b => b.id === badge.id);
    return <Card key={badge.id} style={{ backgroundColor: earned ? colors.reward + "0C" : colors.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><AchievementMark earned={!!earned} icon={badge.icon} size={64} /><View style={{ flex: 1, gap: 4 }}><Label>{badge.title}</Label><Copy>{badge.description}</Copy></View></View>
      <Copy>{earned ? message("Earned {0}", [earned.date]) : message("{0} / {1}", [Math.floor(badge.progress), badge.conditionValue])}</Copy>
      {!earned && <View accessibilityRole="progressbar" accessibilityLabel={badge.title} accessibilityValue={{ min: 0, max: badge.conditionValue, now: badge.progress }} style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}><View style={{ height: 6, borderRadius: 3, width: `${100 * badge.progress / badge.conditionValue}%`, backgroundColor: colors.accent }} /></View>}
      {earned && <Button title="Share achievement" secondary onPress={() => router.push({ pathname: "/milestone", params: { badge: badge.id } })} />}
    </Card>;
  })}{ledger.badges.filter(b => !definitions.some(d => d.id === b.id) && !challengeCatalog().some(d => b.id === `challenge-${d.id}`)).map(b => <Card key={b.id}><Label>{b.label}</Label><Copy>{b.date}</Copy><Button title="Share achievement" secondary onPress={() => router.push({ pathname: "/milestone", params: { badge: b.id } })} /></Card>)}</View>;
}
