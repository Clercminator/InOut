import { useCallback, useState } from "react";
import { AppState, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors } from "@inout/design-tokens";
import { Copy } from "./ui";

export function useProgressDate() {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") setNow(new Date()); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []));
  return now;
}

export function StatRow({ label, value }: { label: string; value: string | number }) {
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.3 || width < 360;
  return <View style={{ flexDirection: stacked ? "column" : "row", justifyContent: "space-between", gap: 6, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 8 }}>
    <Copy style={{ flex: stacked ? undefined : 1, color: colors.secondaryText }}>{label}</Copy>
    <Copy style={{ flexShrink: 1, fontVariant: ["tabular-nums"] }}>{value}</Copy>
  </View>;
}
