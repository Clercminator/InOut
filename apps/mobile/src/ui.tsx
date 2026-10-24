import { emotionalAnchors, emotionFor } from "./wellbeing";
import type { ThemeColors } from "@inout/design-tokens";
import { useTheme, useThemedStyles } from "./theme";
import { Pressable } from "./localized-native";
import { t, protocolTitle, locale, message, countLabel } from "./i18n";
import { isCyclic } from "@inout/protocols";
import { useLanguage } from "./use-language";
import React, { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type TextProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { typography as f, radii, spacing } from "@inout/design-tokens";
import type { Protocol } from "@inout/shared-types";
import { duration } from "./format";
import { useExperience } from "./experience-context";


export function Chip({ title, selected, onPress, translate = true, disabled = false }: { title: string; selected: boolean; onPress: () => void; translate?: boolean; disabled?: boolean }) {
  const { colors: c, palettes } = useTheme();
  const s = useStyles();
  useLanguage();
  const { experience } = useExperience();
  const accent = palettes[experience.palette].accent;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.chip, selected && { backgroundColor: accent, borderColor: accent }, { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}>
    <Copy translate={translate} style={{ color: selected ? c.onAccent : c.secondaryText, fontFamily: f.label, textAlign: "center" }}>{title}</Copy>
  </Pressable>;
}

const protocolIcons = {
  sigh: "air", box: "crop-square", wave: "waves", alternating: "sync-alt", ripple: "graphic-eq", pulse: "bolt",
} as const;

function translatedChildren(children: React.ReactNode): React.ReactNode {
  const nodes = React.Children.toArray(children);
  if (nodes.every(node => typeof node === "string" || typeof node === "number")) {
    const joined = nodes.join("");
    const translated = t(joined);
    return translated !== joined ? translated : nodes.map(node => typeof node === "string" ? t(node) : node);
  }
  return nodes.map(node => typeof node === "string" ? t(node) : node);
}
export function Copy({ style, children, translate = true, ...props }: TextProps & { translate?: boolean }) {
  const s = useStyles();
  useLanguage();
  return <Text {...props} accessibilityLanguage={locale()} accessibilityLabel={props.accessibilityLabel ? t(props.accessibilityLabel) : undefined} style={[s.copy, style]}>{translate ? translatedChildren(children) : children}</Text>;
}
export function Label({ children }: PropsWithChildren) {
  const { palettes } = useTheme();
  const s = useStyles();
  useLanguage();
  const { experience } = useExperience();
  return <Copy style={[s.label, { color: palettes[experience.palette].accent }]}>{children}</Copy>;
}
export function Title({ children, translate = true }: PropsWithChildren<{ translate?: boolean }>) {
  const s = useStyles();
  useLanguage();
  return (
    <Copy translate={translate} accessibilityRole="header" style={s.title}>
      {children}
    </Copy>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  const s = useStyles();
  const { mode, colors } = useTheme();
  useLanguage();
  return <View style={[s.card, mode === "light" && { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }, style]}>{children}</View>;
}

type IconName = keyof typeof MaterialIcons.glyphMap;

export function Disclosure({ title, summary, icon, children, initiallyOpen = false, compact = false }: PropsWithChildren<{
  title: string; summary?: string; icon?: IconName; initiallyOpen?: boolean; compact?: boolean;
}>) {
  const { colors: c, palettes } = useTheme();
  const s = useStyles();
  useLanguage();
  const [open, setOpen] = useState(initiallyOpen);
  const accent = palettes[useExperience().experience.palette].accent;
  return <View style={[s.card, { padding: 0, gap: 0 }, compact && { backgroundColor: "transparent", borderWidth: 0, borderRadius: 0 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t(title)}
      accessibilityHint={!open && summary ? t(summary) : undefined}
      accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}
      style={({ pressed }) => ({ minHeight: compact ? 48 : 64, paddingHorizontal: compact ? 0 : 16, paddingVertical: compact ? 8 : 12,
        flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}>
      {icon && <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: accent + "14", alignItems: "center", justifyContent: "center" }}><MaterialIcons name={icon} size={21} color={accent} accessible={false} /></View>}
      <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontFamily: f.heading }}>{title}</Copy>
        {!open && summary ? <Copy style={s.small}>{summary}</Copy> : null}
      </View>
      <MaterialIcons name={open ? "expand-less" : "expand-more"} size={24} color={c.secondaryText} accessible={false} />
    </Pressable>
    {open && <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12, borderTopWidth: 1, borderTopColor: c.border }}>{children}</View>}
  </View>;
}

export function ActionRow({ title, icon, onPress, danger = false, disabled = false }: {
  title: string; icon: IconName; onPress: () => void; danger?: boolean; disabled?: boolean;
}) {
  const { colors: c } = useTheme();
  useLanguage();
  return <Pressable accessibilityRole="button" accessibilityLabel={t(title)} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12,
      opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
    <MaterialIcons name={icon} size={22} color={danger ? c.danger : c.secondaryText} accessible={false} />
    <Copy style={{ flex: 1, color: danger ? c.danger : c.text }}>{title}</Copy>
    <MaterialIcons name="chevron-right" size={20} color={c.muted} accessible={false} />
  </Pressable>;
}

export function IconButton({ title, icon, onPress, disabled = false }: {
  title: string; icon: IconName; onPress: () => void; disabled?: boolean;
}) {
  const { colors: c } = useTheme();
  const s = useStyles();
  useLanguage();
  return <Pressable accessibilityRole="button" accessibilityLabel={t(title)} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [s.iconButton,
      { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
    <MaterialIcons name={icon} size={23} color={c.secondaryText} accessible={false} />
  </Pressable>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  variant,
  disabled = false,
  danger = false,
  testID,
  translate = true,
  accessibilityLabel,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  variant?: "primary" | "outline" | "quiet" | "premium";
  disabled?: boolean;
  danger?: boolean;
  testID?: string;
  translate?: boolean;
  accessibilityLabel?: string;
  compact?: boolean;
}) {
  const { colors: c, palettes } = useTheme();
  const s = useStyles();
  useLanguage();
  const { experience } = useExperience();
  const accent = variant === "premium" ? c.gold : palettes[experience.palette].accent;
  const outlined = secondary || variant === "outline" || variant === "quiet";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        compact && { minHeight: 44, paddingHorizontal: 8, paddingVertical: 8 },
        { backgroundColor: accent },
        outlined && s.secondaryButton,
        variant === "quiet" && { backgroundColor: "transparent", borderWidth: 0 },
        danger && { backgroundColor: c.dangerSurface },
        { borderColor: danger ? c.danger + "50" : pressed ? c.exhale : outlined ? c.border : accent,
          opacity: disabled ? 0.4 : pressed ? 0.88 : 1,
          transform: [{ translateY: pressed && !disabled ? 1 : 0 }] },
      ]}
    >
      <Copy
        translate={translate}
        style={[
          s.buttonText,
          compact && { fontSize: 14, lineHeight: 20 },
          outlined && { color: c.text },
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
  avoidKeyboard = false,
  tabScreen = false,
  hideHeader = false,
  backLabel = "Go back",
}: PropsWithChildren<{
  back?: () => void;
  title?: string;
  headerAction?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  avoidKeyboard?: boolean;
  tabScreen?: boolean;
  hideHeader?: boolean;
  backLabel?: string;
}>) {
  const { colors: c, backgrounds } = useTheme();
  const s = useStyles();
  useLanguage();
  const { experience } = useExperience();
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: backgrounds[experience.background] }]} edges={tabScreen ? ["top", "left", "right"] : ["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} enabled={avoidKeyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {!hideHeader && <View style={s.header}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(backLabel)}
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
        <View style={{ flex: 1, minWidth: 0, alignItems: back ? "center" : "flex-end" }}>{title ? <Label>{title}</Label> : null}</View>
        {headerAction ?? (back ? <View style={{ width: 48 }} /> : null)}
      </View>}
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={!avoidKeyboard} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>{children}</ScrollView>
      ) : (
        children
      )}
      {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function BackScreen({
  children,
  title,
  footer,
  avoidKeyboard,
}: PropsWithChildren<{ title?: string; footer?: React.ReactNode; avoidKeyboard?: boolean }>) {
  useLanguage();
  return (
    <Screen
      title={title}
      footer={footer}
      avoidKeyboard={avoidKeyboard}
      back={() =>
        router.canGoBack() ? router.back() : router.replace("/(tabs)")
      }
    >
      {children}
    </Screen>
  );
}
export function ActionFooter({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <View style={{ maxHeight: "50%", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
    <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
      {children}
    </ScrollView>
  </View>;
}
export function StateScale({
  value,
  onChange,
  timing = "Before the practice",
  metric = "wellbeing_v2",
}: {
  value: number | null;
  onChange: (n: number) => void;
  timing?: string;
  metric?: import("@inout/shared-types").StateMetric;
}) {
  const { colors: c } = useTheme();
  useLanguage();
  const [width, setWidth] = useState(1);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  const progress = useRef(new Animated.Value(value === null ? 0 : (value - 1) / 9)).current;
  useEffect(() => {
    const target = value === null ? 0 : (value - 1) / 9;
    if (reduced) { progress.setValue(target); return; }
    const animation = Animated.timing(progress, { toValue: target, duration: 120, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [value, progress, reduced]);
  const wellbeing = metric === "wellbeing_v2";
  const emotion = value === null ? null : emotionFor(value);
  const adjust = (direction: number) => onChange(value === null ? 1 : Math.max(1, Math.min(10, value + direction)));
  const select = (x: number) => onChange(Math.max(1, Math.min(10, Math.round(Math.max(0, x - 12) / Math.max(1, width - 24) * 9) + 1)));
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
      <View style={{ flexShrink: 1 }}><Copy>{timing}</Copy>{wellbeing && emotion && <Copy>{emotion.label}</Copy>}</View>
      {wellbeing && <Copy accessible={false} style={{ fontSize: 42, lineHeight: 50 }}>{emotion?.emoji ?? "○"}</Copy>}
      <Copy translate={false} style={{ fontSize: 36, lineHeight: 46, fontWeight: "700", color: c.accent }}>{value === null ? "—" : value}<Copy translate={false}> / 10</Copy></Copy>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <IconButton icon="remove" title={wellbeing ? "Lower well-being rating" : "Lower tension rating"} onPress={() => adjust(-1)} />
      <View accessibilityRole="adjustable" accessible accessibilityLabel={t(wellbeing ? "Well-being rating" : "Tension rating")}
        accessibilityHint={t(wellbeing ? "Choose 1 for feeling very bad or 10 for feeling excellent." : "Choose 1 for very relaxed or 10 for very tense.")}
        accessibilityValue={{ min: 1, max: 10, ...(value === null ? { text: t("Not selected") } : { now: value, text: `${value} / 10${wellbeing && emotion ? ` · ${t(emotion.label)}` : ""}` }) }}
        accessibilityActions={[{ name: "increment", label: t(wellbeing ? "Higher well-being rating" : "Higher tension rating") }, { name: "decrement", label: t(wellbeing ? "Lower well-being rating" : "Lower tension rating") }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === "increment") adjust(1); if (event.nativeEvent.actionName === "decrement") adjust(-1); }}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={event => select(event.nativeEvent.locationX)} onResponderMove={event => select(event.nativeEvent.locationX)}
        style={{ flex: 1, height: 52, justifyContent: "center", paddingHorizontal: 12 }}>
        <View pointerEvents="none" style={{ height: 4, backgroundColor: c.border, borderRadius: 2 }}>
          <Animated.View style={{ height: 4, backgroundColor: c.accent, width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
          {value !== null && <Animated.View style={{ position: "absolute", left: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), marginLeft: -11, top: -9, width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent }} />}
        </View>
      </View>
      <IconButton icon="add" title={wellbeing ? "Higher well-being rating" : "Higher tension rating"} onPress={() => adjust(1)} />
    </View>
    {wellbeing ? <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
      {emotionalAnchors.map(anchor => <Pressable key={anchor.value} accessibilityRole="button"
        accessibilityLabel={`${anchor.value} / 10 · ${t(anchor.label)}`} accessibilityState={{ selected: value === anchor.value }}
        onPress={() => onChange(anchor.value)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: value === anchor.value ? c.accentSurface : "transparent" }}>
        <Copy accessible={false} style={{ fontSize: 24, lineHeight: 32 }}>{anchor.emoji}</Copy><Copy translate={false} style={{ fontSize: 12 }}>{anchor.value}</Copy>
      </Pressable>)}
    </View> : <View style={{ flexDirection: "row", gap: 16, justifyContent: "space-between" }}>
      <Copy style={{ flex: 1, fontSize: 13 }}>1 · Very relaxed</Copy><Copy style={{ flex: 1, fontSize: 13, textAlign: "right" }}>10 · Very tense</Copy>
    </View>}
  </Card>;
}

export function ProtocolRow({
  protocol,
  purpose,
  onPress,
  locked = false,
  favorite = false,
}: {
  protocol: Protocol;
  purpose: string;
  onPress: () => void;
  locked?: boolean;
  favorite?: boolean;
}) {
  const { colors: c } = useTheme();
  const s = useStyles();
  useLanguage();
  const accent = protocol.goalTags.includes("Recover") ? c.gold : protocol.goalTags.includes("Calm") ? c.exhale : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${protocolTitle(protocol)}, ${t(purpose ?? "")}${locked ? `, ${t("Requires Pro")}` : ""}${favorite ? `, ${t("Saved")}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [s.protocolRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[s.protocolIcon, { backgroundColor: accent + "18" }]}>
        <MaterialIcons name={protocolIcons[protocol.animationType]} size={24} color={accent} />
      </View>
      <View style={s.protocolInfo}>
        <Copy translate={false} style={s.protocolName}>{protocolTitle(protocol)}</Copy>
        <Copy style={s.small}>{purpose}</Copy>
        {protocol.safetyCategory !== "general" && <Copy style={s.small}>{t("Read precautions")}</Copy>}
        <Copy style={s.protocolMeta}>
          {isCyclic(protocol) ? message(protocol.defaultCycles === 1 ? "Up to {0} · 1 round" : "Up to {0} · {1} rounds", [duration(protocol.defaultDuration), protocol.defaultCycles]) : `${duration(protocol.defaultDuration)} · ${countLabel(protocol.defaultCycles, "cycle")} · ${protocol.goalTags.map(goal => t(goal)).join(" / ")}${favorite ? " · ★" : ""}`}
        </Copy>
      </View>
      <MaterialIcons accessible={false} name={locked ? "lock-outline" : "chevron-right"} size={22} color={locked ? c.gold : c.secondaryText} />
    </Pressable>
  );
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: spacing.gutter, gap: spacing.lg, flexGrow: 1, paddingBottom: spacing.lg },
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
    lineHeight: 34,
    color: c.text,
    letterSpacing: -1.3,
  },
  copy: { color: c.text, fontFamily: f.body, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  label: {
    color: c.accent,
    fontFamily: f.label,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: f.heading,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.96,
  },
  subtitle: { fontFamily: f.heading, fontSize: 18, lineHeight: 23 },
  small: { color: c.secondaryText, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: c.card, borderRadius: radii.card, padding: 20, gap: 12, borderWidth: 1, borderColor: c.border },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  button: {
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: c.accent + "35",
    minHeight: 52,
    borderRadius: radii.button,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  input: { color: c.text, fontFamily: f.body, fontSize: 16, lineHeight: 24, minHeight: 56, padding: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: radii.button },
  secondaryButton: { backgroundColor: c.card },
  buttonText: {
    maxWidth: "100%",
    color: c.onAccent,
    fontFamily: f.heading,
    textAlign: "center",
  },
  iconButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.raised,
    borderRadius: 12,
  },
  rating: {
    fontFamily: f.metric,
    fontSize: 64,
    lineHeight: 76,
    fontVariant: ["tabular-nums"],
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
  proHero: { backgroundColor: c.lowest, borderRadius: 14, padding: 18, gap: 8, borderWidth: 1, borderColor: c.accent + "40" },
  proFeature: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 7 },
  planRow: { flexDirection: "row", gap: 8 },
  plan: { flex: 1, minHeight: 66, padding: 12, borderRadius: 12, backgroundColor: c.raised, gap: 4 },
  planActive: { backgroundColor: c.accent },
  customPhase: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  customOptions: { gap: 8 },
  mixOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border },
  mixOptionActive: { backgroundColor: c.accent + "18" },
  mixNumber: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.raised, alignItems: "center", justifyContent: "center" },
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
    borderColor: c.accent + "40",
    backgroundColor: c.raised,
    shadowColor: c.blue,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  protocolRow: {
    minHeight: 96,
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  protocolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  protocolInfo: { flex: 1, gap: 2 },
  protocolName: { fontFamily: f.heading, fontSize: 16, lineHeight: 20 },
  protocolMeta: { color: c.secondaryText, fontSize: 12, lineHeight: 18 },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChoice: {
    flexBasis: "auto",
    minWidth: 96,
    maxWidth: "100%",
    flexGrow: 1,
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: c.raised,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
  },
  goalChoiceSelected: { backgroundColor: c.accent },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { flexBasis: "46%", flexGrow: 1, padding: 16, gap: 10 },
  chip: { flexShrink: 0, minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: c.raised, borderWidth: 1, borderColor: c.border, justifyContent: "center", alignItems: "center" },
  chipSelected: { backgroundColor: c.accent, borderColor: c.accent },
  hero: { padding: 22, borderRadius: 24, borderWidth: 1, borderColor: c.sessionBorder, gap: 16, overflow: "hidden" },
  heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  heatCell: { width: "10%", aspectRatio: 1, borderRadius: 3, backgroundColor: c.raised },
  heatCellActive: { backgroundColor: c.accent },
});
export function useStyles() { return useThemedStyles(createStyles); }
