import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable } from "./localized-native";
import { Copy, Chip, Label } from "./ui";
import { useSession } from "./provider";
import { goalContent, journeyFor, practiceGoals, selectedGoals, toggleGoal } from "./personalization";
import { useTheme } from "./theme";
import { GoalMark } from "./onboarding-art";
import { t } from "./i18n";
export function GoalPicker() {
  const controller = useSession();
  const { colors } = useTheme();
  const journey = journeyFor(controller.preferences);
  const goals = selectedGoals(controller.preferences);
  return <View style={{ gap: 10 }}><Copy>Select all that matter to you.</Copy>{practiceGoals.map(goal => {
    const content = goalContent[goal], selected = goals.includes(goal);
    return <Pressable key={goal} accessibilityRole="checkbox" accessibilityLabel={t(content.title)} accessibilityState={{ checked: selected }}
      onPress={() => controller.setPreferences({ ...controller.preferences, journey: toggleGoal(controller.preferences, goal) })}
      style={{ flexDirection: "row", gap: 14, alignItems: "center", minHeight: 64, padding: 16, borderRadius: 20, backgroundColor: selected ? colors.accentSurface : colors.card, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.accent : colors.border }}>
      <GoalMark goal={goal} /><Copy style={{ flex: 1, fontWeight: "600" }}>{content.title}</Copy>
      <MaterialIcons accessible={false} name={selected ? "check-box" : "check-box-outline-blank"} size={22} color={colors.accent} />
    </Pressable>;
  })}{goals.length > 0 && <><Label>PRIMARY GOAL · OPTIONAL</Label>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {goals.map(goal => <Chip key={goal} title={goalContent[goal].title} selected={journey.primaryGoal === goal} onPress={() => {
        const primaryGoal = journey.primaryGoal === goal ? undefined : goal;
        controller.setPreferences({ ...controller.preferences, journey: { ...journey, primaryGoal, secondaryGoals: goals.filter(g => g !== primaryGoal) } });
      }} />)}
    </View></>}</View>;
}
