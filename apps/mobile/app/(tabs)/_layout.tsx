import { Redirect, Tabs } from "expo-router";
import { useLanguage } from "../../src/use-language";
import { t } from "../../src/i18n";
import { useSession } from "../../src/provider";
import { BottomTabs } from "../../src/bottom-tabs";
export default function TabLayout() {
  useLanguage();
  const controller = useSession();
  if (!controller.preferences.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Tabs initialRouteName="index" backBehavior="history" tabBar={props => <BottomTabs {...props} />}
    screenOptions={{ headerShown: false, animation: "none", freezeOnBlur: true }}>
    <Tabs.Screen name="progress" options={{ title: t("Results"), tabBarAccessibilityLabel: t("Results") }} />
    <Tabs.Screen name="index" options={{ title: t("Home"), tabBarAccessibilityLabel: t("Home") }} />
    <Tabs.Screen name="challenges" options={{ title: t("Challenges"), tabBarAccessibilityLabel: t("Challenges") }} />
    <Tabs.Screen name="protocols" options={{ href: null }} />
    <Tabs.Screen name="custom" options={{ href: null }} />
  </Tabs>;
}
