import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "./theme";
export function AchievementMark({ earned = true, size = 88, icon = "workspace-premium" }: { earned?: boolean; size?: number; icon?: keyof typeof MaterialIcons.glyphMap }) {
  const { colors } = useTheme();
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: earned ? colors.reward : colors.border, backgroundColor: earned ? colors.reward + "22" : colors.raised, alignItems: "center", justifyContent: "center", padding: 8 }}>
    <View style={{ width: "100%", height: "100%", borderRadius: size / 2, backgroundColor: earned ? colors.reward : colors.card, alignItems: "center", justifyContent: "center" }}><MaterialIcons accessible={false} name={earned ? icon : "lock-outline"} size={size * 0.43} color={earned ? colors.onReward : colors.muted} /></View>
  </View>;
}
