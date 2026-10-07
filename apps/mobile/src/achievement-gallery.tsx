import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useSession } from "./provider";
import { achievementProgress } from "./achievements";
import { Card, Copy, Label, Button } from "./ui";
import { useTheme } from "./theme";
import { message } from "./i18n";
export function AchievementGallery() {
  const controller = useSession(), { colors } = useTheme();
  const ledger = controller.rewards();
  const definitions = achievementProgress(controller.history());
  return <View style={{ gap: 16 }}>{definitions.map(badge => {
    const earned = ledger.badges.find(b => b.id === badge.id);
    return <Card key={badge.id} style={{ backgroundColor: earned ? colors.gold + "0C" : colors.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><MaterialIcons accessible={false} name={earned ? badge.icon : "lock-outline"} size={30} color={earned ? colors.gold : colors.muted} /><View style={{ flex: 1, gap: 4 }}><Label>{badge.title}</Label><Copy>{badge.description}</Copy></View></View>
      <Copy>{earned ? message("Earned {0}", [earned.date]) : message("{0} / {1}", [Math.floor(badge.progress), badge.conditionValue])}</Copy>
      {!earned && <View accessibilityRole="progressbar" accessibilityLabel={badge.title} accessibilityValue={{ min: 0, max: badge.conditionValue, now: badge.progress }} style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}><View style={{ height: 6, borderRadius: 3, width: `${100 * badge.progress / badge.conditionValue}%`, backgroundColor: colors.accent }} /></View>}
      {earned && <Button title="Share achievement" secondary onPress={() => router.push({ pathname: "/milestone", params: { badge: badge.id } })} />}
    </Card>;
  })}{ledger.badges.filter(b => !definitions.some(d => d.id === b.id)).map(b => <Card key={b.id}><Label>{b.label}</Label><Copy>{b.date}</Copy><Button title="Share achievement" secondary onPress={() => router.push({ pathname: "/milestone", params: { badge: b.id } })} /></Card>)}</View>;
}
