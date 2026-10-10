import { View, useWindowDimensions } from "react-native";
import { Redirect, Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme";
import { useLanguage } from "../../src/use-language";
import { t } from "../../src/i18n";
import { Copy } from "../../src/ui";
import { useSession } from "../../src/provider";
export default function TabLayout() {
  const { colors, mode } = useTheme();
  useLanguage();
  const insets = useSafeAreaInsets(), { fontScale } = useWindowDimensions();
  const controller = useSession();
  if (!controller.preferences.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Tabs initialRouteName="index" screenOptions={{ headerShown: false,
    tabBarStyle: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, height: 50 + 24 * fontScale + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 8, elevation: 0 },
    tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarLabelPosition: "below-icon", tabBarLabel: ({ children, color }) => <Copy translate={false} style={{ color, fontSize: 11, lineHeight: 16, fontWeight: "600", textAlign: "center" }}>{children}</Copy>,
  }}>
    <Tabs.Screen name="progress" options={{ title: t("Results"), tabBarAccessibilityLabel: t("Results"), tabBarIcon: ({ color }) => <MaterialIcons accessible={false} name="bar-chart" color={color} size={25} /> }} />
    <Tabs.Screen name="index" options={{ title: t("Home"), tabBarAccessibilityLabel: t("Home"), tabBarIcon: ({ focused }) => <View style={{ width: 54, height: 54, borderRadius: 20, marginTop: -24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", shadowColor: colors.shadow, shadowOpacity: mode === "light" ? .12 : .3, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}><MaterialIcons accessible={false} name={focused ? "home" : "home"} color={colors.accent} size={28} /></View> }} />
    <Tabs.Screen name="challenges" options={{ title: t("Challenges"), tabBarAccessibilityLabel: t("Challenges"), tabBarIcon: ({ color }) => <MaterialIcons accessible={false} name="emoji-events" color={color} size={25} /> }} />
    <Tabs.Screen name="protocols" options={{ href: null }} />
    <Tabs.Screen name="custom" options={{ href: null }} />
  </Tabs>;
}
