import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Copy } from "./ui";
import { useTheme } from "./theme";

/** Lives beside the root navigator, so tab changes cannot restart the welcome. */
export function WelcomeToast({ eligible }: { eligible: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const claimed = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!eligible || claimed.current || !foreground) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    const dismiss = () => { setVisible(false); animation?.stop(); if (timer) clearTimeout(timer); };
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then(reduced => {
      if (cancelled) return;
      claimed.current = true;
      setVisible(true);
      opacity.setValue(reduced ? 1 : 0);
      if (!reduced) {
        animation = Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true });
        animation.start();
      }
      timer = setTimeout(() => {
        if (reduced) { dismiss(); return; }
        animation = Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true });
        animation.start(({ finished }) => { if (finished) setVisible(false); });
      }, 4000);
    });
    return () => { cancelled = true; dismiss(); };
  }, [eligible, foreground, opacity]);
  if (!visible || !eligible || !foreground) return null;
  return <Animated.View pointerEvents="none" testID="welcome-toast" accessibilityLiveRegion="polite"
    style={{ position: "absolute", top: insets.top + 12, left: 20, right: 20, alignSelf: "center", paddingHorizontal: 18, paddingVertical: 14,
      borderRadius: 20, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.accentBorder, opacity,
      transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }}>
    <Copy style={{ textAlign: "center" }}>Great to have you back 🥳🫂</Copy>
  </Animated.View>;
}
