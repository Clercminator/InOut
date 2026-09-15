import React, { type PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { colors as c, typography as f } from "@inout/design-tokens";

export function Copy({ style, ...props }: TextProps) {
  return <Text {...props} style={[s.copy, style]} />;
}
export function Label({ children }: PropsWithChildren) {
  return <Copy style={s.label}>{children}</Copy>;
}
export function Title({ children }: PropsWithChildren) {
  return (
    <Copy accessibilityRole="header" style={s.title}>
      {children}
    </Copy>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  danger = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondaryButton,
        danger && { backgroundColor: c.dangerSurface },
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Copy
        style={[
          s.buttonText,
          secondary && { color: c.text },
          danger && { color: c.danger },
        ]}
      >
        {title}
      </Copy>
    </Pressable>
  );
}
export function Screen({
  children,
  back,
  title,
  scroll = true,
}: PropsWithChildren<{ back?: () => void; title?: string; scroll?: boolean }>) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={s.header}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={back}
            style={s.iconButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={c.text} />
          </Pressable>
        ) : (
          <Copy style={s.brand}>
            IN<Copy style={[s.brand, { color: c.accent }]}>/</Copy>OUT
          </Copy>
        )}
        {title ? <Label>{title}</Label> : <Label>● ON THIS PHONE</Label>}
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
export function BackScreen({
  children,
  title,
}: PropsWithChildren<{ title?: string }>) {
  return (
    <Screen
      title={title}
      back={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    >
      {children}
    </Screen>
  );
}
export function StateScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <Card>
      <View style={s.row}>
        <View>
          <Label>CURRENT RATING</Label>
          <Copy style={s.subtitle}>Level</Copy>
        </View>
        <Copy style={s.rating}>
          {value === null ? "—" : String(value).padStart(2, "0")}
          <Copy> / 10</Copy>
        </Copy>
      </View>
      <View style={s.scale}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={`${n} of 10${n === 1 ? ", very relaxed" : n === 10 ? ", very tense" : ""}`}
            accessibilityState={{ selected: value === n }}
            onPress={() => onChange(n)}
            style={[s.scaleCell, value === n && { backgroundColor: c.blue }]}
          >
            <Copy style={{ fontFamily: f.heading }}>{n}</Copy>
          </Pressable>
        ))}
      </View>
      <View style={s.row}>
        <Copy style={s.small}>1 · Very relaxed</Copy>
        <Copy style={s.small}>10 · Very tense</Copy>
      </View>
    </Card>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, gap: 24, flexGrow: 1, paddingBottom: 32 },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    fontFamily: f.display,
    fontSize: 26,
    color: c.text,
    letterSpacing: -1.3,
  },
  copy: { color: c.text, fontFamily: f.body, fontSize: 16, lineHeight: 24 },
  label: {
    color: c.accent,
    fontFamily: f.label,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: f.heading,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.96,
  },
  subtitle: { fontFamily: f.heading, fontSize: 22, lineHeight: 28 },
  small: { color: c.secondaryText, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: c.card, borderRadius: 16, padding: 24, gap: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  button: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: c.text,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButton: { backgroundColor: c.raised },
  buttonText: {
    color: c.background,
    fontFamily: f.heading,
    textAlign: "center",
  },
  iconButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.card,
    borderRadius: 12,
  },
  rating: {
    fontFamily: f.metric,
    fontSize: 64,
    lineHeight: 76,
    fontVariant: ["tabular-nums"],
  },
  scale: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scaleCell: {
    flexGrow: 1,
    flexBasis: "16%",
    minWidth: 44,
    minHeight: 48,
    backgroundColor: c.raised,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
