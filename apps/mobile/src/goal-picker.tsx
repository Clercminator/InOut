import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable } from "./localized-native";
import { Copy } from "./ui";
import { useSession } from "./provider";
import { goalContent, journeyFor, practiceGoals } from "./personalization";
import { useTheme } from "./theme";
import { t } from "./i18n";
export function GoalPicker() {
  const controller = useSession();
  const { colors } = useTheme();
  const journey = journeyFor(controller.preferences);
  return <View style={{ gap: 10 }}>{practiceGoals.map(goal => {
    const content = goalContent[goal], selected = journey.primaryGoal === goal;
    return <Pressable key={goal} accessibilityRole="radio" accessibilityLabel={t(content.title)} accessibilityState={{ checked: selected }}
      onPress={() => controller.setPreferences({ ...controller.preferences, journey: { ...journey, primaryGoal: goal } })}
      style={{ flexDirection: "row", gap: 14, alignItems: "center", minHeight: 64, padding: 16, borderRadius: 20, backgroundColor: selected ? colors.accentSurface : colors.card, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.accent : colors.border }}>
      <MaterialIcons accessible={false} name={content.icon} size={24} color={colors.accent} /><Copy style={{ flex: 1 }}>{content.title}</Copy>
      <MaterialIcons accessible={false} name={selected ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={colors.accent} />
    </Pressable>;
  })}</View>;
}
