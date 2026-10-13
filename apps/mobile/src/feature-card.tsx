import { useLanguage } from "./use-language";
import { View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable } from "./localized-native";
import { Copy, Label, useStyles } from "./ui";
import { useTheme } from "./theme";
import { t } from "./i18n";

/** One clear action, with room for translated copy and larger system text. */
export function FeatureCard({ title, description, icon, action, onPress, eyebrow, detail, tone = "accent", featured = false }: {
  title: string; description: string; icon: keyof typeof MaterialIcons.glyphMap;
  action: string; onPress: () => void; eyebrow?: string; detail?: string;
  tone?: "accent" | "exhale" | "gold"; featured?: boolean;
}) {
  useLanguage();
  const { colors, mode } = useTheme();
  const s = useStyles();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const accent = colors[tone];
  return <Pressable accessibilityRole="button" accessibilityLabel={t(action)} accessibilityHint={`${t(title)}. ${t(description)}`}
    onPress={onPress} style={({ pressed }) => ({ borderRadius: 22, overflow: "hidden", borderWidth: 1,
      borderColor: mode === "light" ? colors.accentBorder : accent + "55", opacity: pressed ? 0.85 : 1 })}>
    <LinearGradient colors={mode === "light" ? [colors.card, colors.accentSurface] : [accent + "1C", colors.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ padding: 20, gap: 14, backgroundColor: colors.card }}>
      <View style={{ flexDirection: stacked ? "column" : "row", alignItems: stacked ? "flex-start" : "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: accent + "18", alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name={icon} color={accent} size={25} accessible={false} />
        </View>
        <View style={{ flex: stacked ? undefined : 1, alignSelf: stacked ? "stretch" : undefined, gap: 5 }}>
          {eyebrow && <Label>{eyebrow}</Label>}
          <Copy style={featured ? s.title : s.subtitle}>{title}</Copy>
        </View>
        {!featured && <MaterialIcons name="arrow-forward" color={accent} size={21} accessible={false} />}
      </View>
      <Copy style={{ color: colors.secondaryText }}>{description}</Copy>
      {detail && <Copy style={[s.small, { color: accent }]}>{detail}</Copy>}
      {featured && <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
        borderRadius: 12, backgroundColor: accent }}>
        <Copy style={[s.buttonText, { flex: 1, textAlign: "left", color: colors.onAccent }]}>{action}</Copy>
        <MaterialIcons name="arrow-forward" color={colors.onAccent} size={21} accessible={false} />
      </View>}
    </LinearGradient>
  </Pressable>;
}
