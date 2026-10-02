import { useTheme } from "../../src/theme";
import { useLanguage } from "../../src/use-language";
import { t } from "../../src/i18n";
import { useWindowDimensions } from "react-native";
import { Copy } from "../../src/ui";
import { Redirect, Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { typography } from "@inout/design-tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../src/provider";
export default function TabLayout() {
  const { colors, mode } = useTheme();
  useLanguage();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const controller = useSession();
  if (!controller.preferences.onboardingComplete) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.lowest,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 36 + 32 * fontScale + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: mode === "light" ? 0.05 : 0,
          shadowRadius: 12,
          elevation: mode === "light" ? 4 : 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarActiveBackgroundColor: colors.accentSurface,
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 3 },
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarLabelPosition: "below-icon",
        tabBarLabel: ({ children, color }) => <Copy translate={false} style={{ color, fontFamily: typography.label, fontSize: 11, lineHeight: 16, textAlign: "center", alignSelf: "stretch" }}>{children}</Copy>,
        tabBarLabelStyle: { fontFamily: typography.label },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Today"),
          tabBarAccessibilityLabel: t("Today"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons accessible={false} name="bolt" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="protocols"
        options={{
          title: t("Protocols"),
          tabBarAccessibilityLabel: t("Protocols"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons accessible={false} name="grid-view" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="custom"
        options={{
          title: t("Custom"),
          tabBarAccessibilityLabel: t("Custom"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons accessible={false} name="tune" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t("Progress"),
          tabBarAccessibilityLabel: t("Progress"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons accessible={false} name="equalizer" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
