import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { AccessibilityInfo, Easing, useWindowDimensions } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useLanguage } from "../../src/use-language";
import { t } from "../../src/i18n";
import { useSession } from "../../src/provider";
import { SwipeSurface } from "../../src/swipe-surface";
import { adjacentTab } from "../../src/swipe-navigation";
import { BottomTabs } from "../../src/bottom-tabs";
import { useTheme } from "../../src/theme";
export default function TabLayout() {
  useLanguage();
  const lastSwipe = useRef(-Infinity);
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  const screenLayout = useCallback<NonNullable<ComponentProps<typeof Tabs>["screenLayout"]>>(({ children, route, navigation }) =>
    <SwipeSurface feedback={false} canSwipe={direction => navigation.isFocused() && !!adjacentTab(route.name, direction)} onSwipe={direction => {
      if (!navigation.isFocused() || Date.now() - lastSwipe.current < 260) return;
      const target = adjacentTab(route.name, direction);
      if (target) { lastSwipe.current = Date.now(); navigation.navigate(target); }
    }}>{children}</SwipeSurface>, []);
  const controller = useSession();
  if (!controller.preferences.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Tabs initialRouteName="index" backBehavior="initialRoute" tabBar={props => <BottomTabs {...props} />}
    screenLayout={screenLayout}
    screenOptions={{ headerShown: false, animation: reduced ? "none" : "shift", freezeOnBlur: true,
      sceneStyle: { backgroundColor: colors.background, overflow: "hidden" },
      transitionSpec: { animation: "timing", config: { duration: reduced ? 0 : 220, easing: Easing.out(Easing.cubic) } },
      sceneStyleInterpolator: ({ current }) => ({ sceneStyle: { transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] }) }] } }),
    }}>
    <Tabs.Screen name="progress" options={{ title: t("Results"), tabBarAccessibilityLabel: t("Results") }} />
    <Tabs.Screen name="index" options={{ title: t("Home"), tabBarAccessibilityLabel: t("Home") }} />
    <Tabs.Screen name="challenges" options={{ title: t("Challenges"), tabBarAccessibilityLabel: t("Challenges") }} />
    <Tabs.Screen name="protocols" options={{ href: null }} />
    <Tabs.Screen name="custom" options={{ href: null }} />
  </Tabs>;
}
