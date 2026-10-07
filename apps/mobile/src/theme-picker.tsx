import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { darkColors, lightColors, type ThemePreference } from "@inout/design-tokens";
import { Pressable } from "./localized-native";
import { Card, Copy, Label, useStyles } from "./ui";
import { useTheme } from "./theme";
import { t } from "./i18n";

const choices = [
  { id: "system", label: "System", description: "Automatically match your phone", icon: "brightness-auto" },
  { id: "light", label: "Light", description: "Warm ivory, crisp white & soft color", icon: "light-mode" },
  { id: "dark", label: "Dark", description: "Deep navy with vivid color", icon: "dark-mode" },
] as const;

export function ThemePicker({ value, onChange }: { value: ThemePreference; onChange: (value: ThemePreference) => void }) {
  const { colors } = useTheme();
  const s = useStyles();
  return <Card>
    <Label>APPEARANCE</Label>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("Appearance")} style={{ gap: 10 }}>
      {choices.map(choice => {
        const selected = value === choice.id;
        const preview = choice.id === "light" ? lightColors : choice.id === "dark" ? darkColors : colors;
        return <Pressable key={choice.id} accessibilityRole="radio" accessibilityLabel={t(choice.label)}
          accessibilityHint={t(choice.description)} accessibilityState={{ selected }} onPress={() => onChange(choice.id)}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 76,
            borderRadius: 14, borderWidth: 2, borderColor: selected ? colors.accent : colors.border,
            backgroundColor: selected ? colors.accent + "0C" : colors.card, opacity: pressed ? 0.7 : 1 })}>
          <View accessible={false} style={{ width: 54, height: 50, backgroundColor: preview.background, borderColor: preview.border,
            borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 5 }}>
            <MaterialIcons name={choice.icon} size={20} color={preview.accent} />
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[preview.exhale, preview.accent, preview.gold].map(color => <View key={color} style={{ width: 9, height: 4, borderRadius: 2, backgroundColor: color }} />)}
            </View>
          </View>
          <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontWeight: "600" }}>{choice.label}</Copy><Copy style={s.small}>{choice.description}</Copy></View>
          <MaterialIcons name={selected ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={selected ? colors.accent : colors.muted} />
        </Pressable>;
      })}
    </View>
  </Card>;
}
