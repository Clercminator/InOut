import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "./theme";
export function AchievementMark({ earned = true, size = 88, icon = "workspace-premium" }: { earned?: boolean; size?: number; icon?: keyof typeof MaterialIcons.glyphMap }) {
  const { colors } = useTheme();
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: earned ? colors.reward : colors.border, backgroundColor: earned ? colors.reward + "18" : colors.raised, alignItems: "center", justifyContent: "center", padding: size * .12 }}>
    {earned && Array.from({ length: 8 }, (_, i) => <View key={i} style={{ position: "absolute", width: 2, height: size * .055, backgroundColor: colors.reward, top: size * .03, left: size / 2 - 1, transformOrigin: [1, size * .47, 0], transform: [{ rotate: `${i * 45}deg` }] }} />)}
    <LinearGradient colors={earned ? ["#F9E7A8", "#D5A745", "#F1D37C"] : [colors.card, colors.raised]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "100%", height: "100%", borderRadius: size * .27, transform: [{ rotate: "45deg" }], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: earned ? "#FFF1C4" : colors.border }}>
      <View style={{ transform: [{ rotate: "-45deg" }] }}><MaterialIcons accessible={false} name={earned ? icon : "lock-outline"} size={size * 0.38} color={earned ? "#4B3810" : colors.muted} /></View>
    </LinearGradient>
  </View>;
}
