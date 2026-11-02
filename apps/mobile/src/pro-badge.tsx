import { StyleSheet, Text, View } from "react-native";
import { proBadge as badge, typography } from "@inout/design-tokens";
import { useTheme } from "./theme";
import { t } from "./i18n";
import { useLanguage } from "./use-language";

/** Brand wordmark stays unchanged across locales; colors follow the active theme. */
export function ProBadge() {
  const { colors } = useTheme();
  useLanguage();
  return <View accessible accessibilityRole="text" accessibilityLabel={t("Pro is active.")}
    style={[styles.badge, { backgroundColor: colors.accentSurface, borderColor: colors.accent + "45" }]}>
    <Text style={[styles.brand, { color: colors.text }]}>IN/OUT</Text>
    <View style={{ width: 1, alignSelf: "stretch", backgroundColor: colors.accent + "45" }} />
    <Text style={[styles.tier, { color: colors.accent }]}>PRO</Text>
  </View>;
}
const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: badge.gap,
    borderRadius: badge.radius, borderWidth: 1, paddingHorizontal: badge.paddingX, paddingVertical: badge.paddingY },
  brand: { fontFamily: typography.label, fontSize: badge.brandSize, letterSpacing: .6 },
  tier: { fontFamily: typography.heading, fontSize: badge.tierSize, letterSpacing: badge.tracking },
});
