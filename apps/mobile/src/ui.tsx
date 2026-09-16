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
import type { Protocol } from "@inout/shared-types";

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
  headerAction,
  scroll = true,
  footer,
}: PropsWithChildren<{
  back?: () => void;
  title?: string;
  headerAction?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
}>) {
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
        {title ? <Label>{title}</Label> : <View />}
        {headerAction}
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
      ) : (
        children
      )}
      {footer}
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
  timing = "Before the practice",
}: {
  value: number | null;
  onChange: (n: number) => void;
  timing?: string;
}) {
  return (
    <Card style={s.stateCard}>
      <View style={s.row}>
        <View>
          <Label>CURRENT STATE</Label>
          <Copy style={s.subtitle}>{timing}</Copy>
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
      <Copy style={s.stateHint}>A quick self-report. There is no right answer.</Copy>
    </Card>
  );
}
export function ProtocolRow({
  protocol,
  purpose,
  onPress,
}: {
  protocol: Protocol;
  purpose: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${protocol.name}, ${purpose}`}
      onPress={onPress}
      style={({ pressed }) => [s.protocolRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={s.protocolIcon}>
        <MaterialIcons name="air" size={20} color={c.accent} />
      </View>
      <View style={s.protocolInfo}>
        <Copy style={s.protocolName}>{protocol.name}</Copy>
        <Copy style={s.small}>{purpose}</Copy>
        <Copy style={s.protocolMeta}>
          {protocol.phases.map((phase) => `${phase.durationMs / 1000}s`).join(" · ")} · {Math.round(protocol.defaultDuration / 1000)} sec
        </Copy>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={c.secondaryText} />
    </Pressable>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, gap: 14, flexGrow: 1, paddingBottom: 24 },
  header: {
    minHeight: 56,
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
  copy: { color: c.text, fontFamily: f.body, fontSize: 14, lineHeight: 20 },
  label: {
    color: c.accent,
    fontFamily: f.label,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: f.heading,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.96,
  },
  subtitle: { fontFamily: f.heading, fontSize: 18, lineHeight: 23 },
  small: { color: c.secondaryText, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 16, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: c.text,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  stateCard: {
    borderWidth: 1,
    borderColor: "#adc6ff2e",
    shadowColor: c.blue,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  onboardingTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  onboardingBody: { flex: 1, justifyContent: "center", gap: 14 },
  onboardingIcon: { width: 76, height: 76, borderRadius: 22, backgroundColor: c.raised, alignItems: "center", justifyContent: "center" },
  onboardingCopy: { fontSize: 18, lineHeight: 27, color: c.secondaryText, maxWidth: 320 },
  onboardingCard: { gap: 12 },
  onboardingDots: { flexDirection: "row", gap: 6 },
  onboardingDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: c.border },
  onboardingDotActive: { backgroundColor: c.accent },
  profileIdentity: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileAvatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  profileStats: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  proHero: { backgroundColor: c.lowest, borderRadius: 14, padding: 18, gap: 8, borderWidth: 1, borderColor: "#adc6ff40" },
  proFeature: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 7 },
  planRow: { flexDirection: "row", gap: 8 },
  plan: { flex: 1, minHeight: 66, padding: 12, borderRadius: 12, backgroundColor: c.raised, gap: 4 },
  planActive: { backgroundColor: c.accent },
  customPhase: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  customOptions: { gap: 8 },
  mixOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border },
  mixOptionActive: { backgroundColor: "#adc6ff18" },
  mixNumber: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.raised, alignItems: "center", justifyContent: "center" },
  stateHint: { color: c.secondaryText, textAlign: "center", fontSize: 12 },
  flowHeader: {
    backgroundColor: c.lowest,
    borderLeftWidth: 3,
    borderLeftColor: c.accent,
    paddingLeft: 12,
    gap: 4,
  },
  resultHeader: { gap: 8 },
  inlineLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultMeta: { color: c.secondaryText, fontFamily: f.label, fontSize: 12 },
  resultHero: {
    borderWidth: 1,
    borderColor: "#adc6ff40",
    backgroundColor: c.raised,
    shadowColor: c.blue,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  protocolRow: {
    minHeight: 82,
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  protocolIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  protocolInfo: { flex: 1, gap: 2 },
  protocolName: { fontFamily: f.heading, fontSize: 16, lineHeight: 20 },
  protocolMeta: { color: c.secondaryText, fontSize: 11, lineHeight: 15 },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChoice: {
    width: "31%",
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: c.raised,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  goalChoiceSelected: { backgroundColor: c.accent },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { width: "48%", padding: 12, gap: 6 },
  heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  heatCell: { width: "10%", aspectRatio: 1, borderRadius: 3, backgroundColor: c.raised },
  heatCellActive: { backgroundColor: c.accent },
});
