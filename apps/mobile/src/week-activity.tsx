import { View } from "react-native";
import { Card, Copy, Label } from "./ui";
import { useTheme } from "./theme";
import { countLabel, locale } from "./i18n";
import type { StatsBucket } from "./progress";
/** Glanceable seven-day summary; detailed chart controls remain in All stats. */
export function WeekActivity({ buckets }: { buckets: StatsBucket[] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...buckets.map(b => b.records.length));
  return <Card style={{ padding: 16, gap: 14 }}><Label>THIS WEEK</Label>
    <View style={{ flexDirection: "row", gap: 12 }}>{buckets.map(b => <View key={b.key} accessible accessibilityLabel={`${new Date(b.key + "T12:00:00").toLocaleDateString(locale(), { weekday: "long" })}: ${countLabel(b.records.length, "session")}`} style={{ flex: 1, alignItems: "center", gap: 7 }}>
      <Copy style={{ fontSize: 11, lineHeight: 18, minHeight: 18, color: colors.secondaryText }}>{b.records.length || ""}</Copy>
      <View style={{ height: 62, justifyContent: "flex-end", width: "100%", alignItems: "center" }}><View style={{ height: b.records.length ? Math.max(8, b.records.length / max * 62) : 3, width: "76%", maxWidth: 28, borderRadius: 7, backgroundColor: b.records.length ? colors.accent : colors.border }} /></View>
      <Copy style={{ fontSize: 12, color: colors.secondaryText }}>{b.label}</Copy>
    </View>)}</View>
  </Card>;
}
