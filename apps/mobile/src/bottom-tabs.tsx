import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, View, useWindowDimensions } from "react-native";
import type { ComponentProps } from "react";
import type { Tabs } from "expo-router";
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "./theme";
import { useLanguage } from "./use-language";
import { Copy } from "./ui";
import { t } from "./i18n";

const tabs = [
  { name: "progress", label: "Results", icon: "bar-chart" },
  { name: "index", label: "Home", icon: "home" },
  { name: "challenges", label: "Challenges", icon: "emoji-events" },
] as const;
function TabButton({ tab, selected, reduced, onPress, onLongPress }: {
  tab: typeof tabs[number]; selected: boolean; reduced: boolean; onPress(): void; onLongPress(): void;
}) {
  const { colors, mode } = useTheme();
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) { progress.setValue(selected ? 1 : 0); return; }
    const animation = Animated.timing(progress, { toValue: selected ? 1 : 0, duration: 180,
      easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false });
    animation.start(); return () => animation.stop();
  }, [selected, reduced, progress]);
  const home = tab.name === "index";
  return <Pressable testID={`tab-${tab.name}`} accessibilityRole="tab" accessibilityLabel={t(tab.label)}
    accessibilityState={{ selected }} onPress={onPress} onLongPress={onLongPress}
    style={{ flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", borderRadius: 16, paddingVertical: 6 }}>
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 3, right: 3,
      borderRadius: 16, backgroundColor: colors.accentSurface, opacity: progress }} />
    <Animated.View pointerEvents="none" style={{ alignItems: "center", justifyContent: "center",
      width: home ? 54 : 40, height: home ? 54 : 32, marginTop: home ? -22 : 0,
      borderRadius: 20, backgroundColor: home ? colors.card : "transparent",
      borderWidth: home ? 1 : 0, borderColor: selected ? colors.accent : colors.border,
      shadowColor: colors.shadow, shadowOpacity: home ? mode === "light" ? .12 : .3 : 0,
      shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: home ? 5 : 0,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
      <MaterialIcons accessible={false} name={tab.icon} size={home ? 28 : 25} color={selected ? colors.accent : colors.muted} />
    </Animated.View>
    <Copy style={{ color: selected ? colors.accent : colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "600", textAlign: "center" }}>{tab.label}</Copy>
  </Pressable>;
}
export function BottomTabs({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme(); useLanguage();
  const insets = useSafeAreaInsets(), { fontScale } = useWindowDimensions();
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReduced(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { active = false; sub.remove(); };
  }, []);
  const active = state.routes[state.index]?.name;
  const selected = tabs.some(t => t.name === active) ? active : "index";
  return <View style={{ flexDirection: "row", backgroundColor: colors.card, borderTopWidth: 1,
    borderTopColor: colors.border, paddingTop: 8, paddingBottom: insets.bottom + 6,
    paddingHorizontal: 8, minHeight: 50 + 24 * fontScale + insets.bottom }}>
    {tabs.map(tab => {
      const route = state.routes.find(r => r.name === tab.name);
      if (!route) return null;
      return <TabButton key={route.key} tab={tab} selected={selected === tab.name} reduced={reduced}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        onPress={() => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!event.defaultPrevented && active !== route.name) navigation.navigate(route.name, route.params);
        }} />;
    })}
  </View>;
}
