import { AppDialog } from "./app-dialog";
import { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { darkColors, lightColors, type ThemePreference } from "@inout/design-tokens";
import { Pressable } from "./localized-native";
import { Button, Card, Copy, Label, useStyles } from "./ui";
import { useTheme } from "./theme";
import { message, t } from "./i18n";
import { pacerThemes, type PacerThemeId, type PacerThemeProgress } from "./pacer-theme";
import { useLanguage } from "./use-language";

const choices = [
  { id: "system", label: "System", description: "Automatically match your phone", icon: "brightness-auto" },
  { id: "light", label: "Light", description: "Warm ivory, crisp white & soft color", icon: "light-mode" },
  { id: "dark", label: "Dark", description: "Charcoal with luminous violet", icon: "dark-mode" },
] as const;

export function ThemePicker({ value, onChange }: { value: ThemePreference; onChange: (value: ThemePreference) => void }) {
  const { colors } = useTheme();
  const s = useStyles();
  return <Card>
    <Label>APPEARANCE</Label>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("Appearance")} style={{ gap: 10 }}>
      {choices.map(choice => {
        const selected = value === choice.id;
        const preview = choice.id === "light" ? lightColors : choice.id === "dark" ? darkColors : colors;
        return <Pressable key={choice.id} accessibilityRole="radio" accessibilityLabel={t(choice.label)}
          accessibilityHint={t(choice.description)} accessibilityState={{ selected }} onPress={() => onChange(choice.id)}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 76,
            borderRadius: 14, borderWidth: 2, borderColor: selected ? colors.accent : colors.border,
            backgroundColor: selected ? colors.accent + "0C" : colors.card, opacity: pressed ? 0.7 : 1 })}>
          <View accessible={false} style={{ width: 54, height: 50, backgroundColor: preview.background, borderColor: preview.border,
            borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 5 }}>
            <MaterialIcons name={choice.icon} size={20} color={preview.accent} />
            <View style={{ flexDirection: "row", gap: 3 }}>
              {[preview.exhale, preview.accent, preview.gold].map(color => <View key={color} style={{ width: 9, height: 4, borderRadius: 2, backgroundColor: color }} />)}
            </View>
          </View>
          <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontWeight: "600" }}>{choice.label}</Copy><Copy style={s.small}>{choice.description}</Copy></View>
          <MaterialIcons name={selected ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={selected ? colors.accent : colors.muted} />
        </Pressable>;
      })}
    </View>
  </Card>;
}

export function PacerThemePicker({ value, progress, noticeThemeIds, pro, onApply, onUpgrade, onLockedTap, onPreview, onGalleryOpened, onDismissNotice }: {
  value: PacerThemeId;
  progress: PacerThemeProgress;
  noticeThemeIds: readonly PacerThemeId[];
  pro: boolean;
  onApply: (value: PacerThemeId) => void;
  onUpgrade: () => void;
  onLockedTap: () => void;
  onPreview: () => void;
  onGalleryOpened: () => void;
  onDismissNotice: () => void;
}) {
  useLanguage();
  useEffect(() => { onGalleryOpened(); }, []);
  const { colors } = useTheme();
  const s = useStyles();
  const [previewId, setPreviewId] = useState<PacerThemeId | null>(null);
  const [lockedId, setLockedId] = useState<PacerThemeId | null>(null);
  const { width, fontScale } = useWindowDimensions();
  const [galleryWidth, setGalleryWidth] = useState(0);
  const availableWidth = galleryWidth || Math.max(0, width - 76);
  const columns = fontScale > 1.3 || availableWidth < 264 * fontScale + 12 ? 1 : 2;
  const cardWidth = columns === 1 ? availableWidth : (availableWidth - 12) / 2;
  const preview = pacerThemes.find(theme => theme.id === previewId) ?? null;
  const locked = pacerThemes.find(theme => theme.id === lockedId) ?? null;
  const previewColors = preview?.preview ?? null;
  const accessible = (days: number, id: PacerThemeId) => pro || days === 0 || progress.earnedThemeIds.includes(id);
  return <>
    <Copy>{message("Earn new pacer themes through completed practice days, or unlock every theme instantly with IN/OUT Pro. Your completed days: {0}.", [progress.practiceDays])}</Copy>
    {!!noticeThemeIds.length && <Card style={{ borderColor: colors.accent }}>
      <Copy accessibilityRole="alert">{message("New pacer theme available: {0}.", [t(pacerThemes.find(theme => theme.id === noticeThemeIds[0])?.name ?? "Default")])}</Copy>
      <Button title="Dismiss" secondary onPress={onDismissNotice} />
    </Card>}
    <View testID="pacer-theme-grid" onLayout={event => setGalleryWidth(event.nativeEvent.layout.width)}
      style={{ width: "100%", alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
    {pacerThemes.map(theme => {
      const selected = value === theme.id;
      const available = accessible(theme.unlockDays, theme.id);
      const preview = theme.preview;
      return <View testID={`pacer-theme-card-${theme.id}`} key={theme.id} style={{ width: cardWidth, borderRadius: 16, borderWidth: 2, borderColor: selected ? colors.accent : colors.border, backgroundColor: colors.card, padding: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t(theme.name)}
          accessibilityHint={t(available ? "Theme details and selection" : "View unlock choices")}
          accessibilityState={{ selected, disabled: false }}
          onPress={() => {
            if (available) {
              onApply(theme.id);
              return;
            }
            onLockedTap();
            setLockedId(theme.id);
          }}
          style={({ pressed }) => ({ flexGrow: 1, opacity: pressed ? 0.8 : 1 })}>
          <View style={{ height: 112, borderRadius: 12, backgroundColor: preview.background, justifyContent: "center", alignItems: "center", marginBottom: 10, overflow: "hidden" }}>
            <View style={{ width: 78, height: 78, borderRadius: 999, borderWidth: 6, borderColor: preview.ring, backgroundColor: preview.surface, shadowColor: preview.glow, shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 6, alignItems: "center", justifyContent: "center" }}>
              <Copy translate={false} style={{ color: preview.text, fontWeight: "700", fontSize: 17 }}>4</Copy>
              <Copy style={{ color: preview.secondaryText, fontSize: 10 }}>{t("Inhale")}</Copy>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Copy style={{ flex: 1, fontWeight: "600" }}>{t(theme.name)}</Copy>
            {selected && <MaterialIcons name="check-circle" size={20} color={colors.accent} accessible={false} />}
            {!available && <MaterialIcons name="lock-outline" size={18} color={colors.secondaryText} accessible={false} />}
          </View>
          {!available
            ? <><Copy style={s.small}>{t("Locked")}</Copy><Copy style={s.small}>{message("{0} of {1} practice days", [progress.practiceDays, theme.unlockDays])}</Copy></>
            : <Copy style={s.small}>{pro ? t("Included with IN/OUT Pro") : theme.unlockDays === 0 ? t("Included") : t("Unlocked through practice")}</Copy>}
        </Pressable>
        <View style={{ gap: 6, marginTop: 8 }}>
          <Button compact title="Preview" accessibilityLabel={message("Preview {0}", [t(theme.name)])} secondary onPress={() => { onPreview(); setPreviewId(theme.id); }} />
          {available ? <Button compact title={selected ? "Selected" : "Apply"} accessibilityLabel={message(selected ? "Selected {0}" : "Apply {0}", [t(theme.name)])} disabled={selected} onPress={() => onApply(theme.id)} />
            : <Button compact title="View unlock choices" secondary onPress={() => { onLockedTap(); setLockedId(theme.id); }} />}
        </View>
      </View>;
    })}
    </View>
    {preview && previewColors && <AppDialog title="Pacer theme preview" onRequestClose={() => setPreviewId(null)}>
          <View accessibilityLabel={t(preview.name)} style={{ minHeight: 220, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: previewColors.background }}>
            <View style={{ width: 120, height: 120, borderRadius: 999, borderWidth: 8, borderColor: previewColors.ring, backgroundColor: previewColors.surface, shadowColor: previewColors.glow, shadowOpacity: 0.9, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 8, alignItems: "center", justifyContent: "center" }}>
              <Copy translate={false} style={{ color: previewColors.text, fontSize: 36, fontWeight: "700" }}>4</Copy>
            </View>
            <Copy style={{ color: previewColors.text, fontWeight: "700" }}>{t("Inhale")}</Copy>
            <Copy style={{ color: previewColors.secondaryText }}>{t("CYCLE")} 1/8</Copy>
          </View>
          <Copy style={{ color: colors.secondaryText }}>{t(preview.name)}</Copy>
          <Button title="Close preview" secondary onPress={() => setPreviewId(null)} />
    </AppDialog>}
    {locked && <AppDialog title={locked.name} onRequestClose={() => setLockedId(null)}>
          <Copy>{message("{0} of {1} practice days", [progress.practiceDays, locked.unlockDays])}</Copy>
          <Button title="Continue practicing to unlock" onPress={() => setLockedId(null)} />
          <Button title="Unlock all themes instantly with IN/OUT Pro" variant="premium" onPress={() => { setLockedId(null); onUpgrade(); }} />
          <Button title="Not now" secondary onPress={() => setLockedId(null)} />
    </AppDialog>}
  </>;
}
