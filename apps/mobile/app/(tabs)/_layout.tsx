import { Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { colors, typography } from "@inout/design-tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect } from "react";
import { router } from "expo-router";
import { useSession } from "../../src/provider";
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const controller = useSession();
  useEffect(() => {
    if (!controller.preferences.onboardingComplete) router.replace("/onboarding");
  }, [controller.preferences.onboardingComplete]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.lowest,
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarLabelStyle: { fontFamily: typography.label },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bolt" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="protocols"
        options={{
          title: "Protocols",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="grid-view" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="custom"
        options={{
          title: "Custom",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="tune" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="equalizer" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
