import { View, useWindowDimensions } from "react-native";
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AchievementMark } from "./achievement-mark";
import { Button, Card, Copy, Label } from "./ui";
import { useTheme } from "./theme";
import { locale, message, t } from "./i18n";

export function AchievementCard({ title, description, icon, earnedDate, progress, target, action, onPress }: {
  title: string; description: string; icon?: keyof typeof MaterialIcons.glyphMap;
  earnedDate?: string; progress: number; target: number; action: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const value = Math.max(0, Math.min(target, progress));
  const date = earnedDate ? new Date(`${earnedDate}T12:00:00`).toLocaleDateString(locale(), { month: "short", day: "numeric", year: "numeric" }) : "";
  return <Card style={{ padding: 20, gap: 16, borderColor: earnedDate ? colors.accent + "60" : colors.border }}>
    <View style={{ flexDirection: stacked ? "column" : "row", alignItems: stacked ? "flex-start" : "center", gap: 16 }}>
      <AchievementMark earned={!!earnedDate} icon={icon} size={72} />
      <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: 6 }}>
        <Label>{earnedDate ? "EARNED" : "IN PROGRESS"}</Label>
        <Copy accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: "700" }}>{title}</Copy>
      </View>
    </View>
    <Copy style={{ color: colors.secondaryText }}>{description}</Copy>
    <Copy>{earnedDate ? message("Earned {0}", [date]) : message("{0} / {1}", [Math.floor(value), target])}</Copy>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t(title)} accessibilityValue={{ min: 0, max: target, now: earnedDate ? target : value }}
      style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
      <View style={{ height: 6, width: `${earnedDate ? 100 : target > 0 ? 100 * value / target : 0}%`, backgroundColor: colors.accent }} />
    </View>
    <Button title={action} secondary onPress={onPress} />
  </Card>;
}
