import { useTheme } from "./theme";
import { locale } from "./i18n";
import { useLanguage } from "./use-language";
import { useState } from "react";
import { Modal, Platform, ScrollView, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Copy, Label } from "./ui";

export function SessionDatePicker({ value, onChange, disabled = false, timeOnly = false }: { value: Date; onChange: (value: Date) => void; disabled?: boolean; timeOnly?: boolean }) {
  const { colors, mode: themeMode } = useTheme();
  useLanguage();
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const [draft, setDraft] = useState(value);
  const merge = (selected: Date, kind: "date" | "time") => kind === "date"
    ? new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), value.getHours(), value.getMinutes())
    : new Date(value.getFullYear(), value.getMonth(), value.getDate(), selected.getHours(), selected.getMinutes());
  const open = (kind: "date" | "time") => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value, mode: kind, maximumDate: kind === "date" ? new Date() : undefined, minimumDate: kind === "date" ? new Date(1970, 0, 1) : undefined,
        onValueChange: (_event, selected) => onChange(merge(selected, kind)) });
    } else { setDraft(value); setMode(kind); }
  };
  return <View style={{ gap: 10 }}>
    <Label>{timeOnly ? "REMINDER TIME" : "START DATE & TIME"}</Label>
    <Copy>{!timeOnly ? `${value.toLocaleDateString(locale(), { year: "numeric", month: "short", day: "numeric" })} · ` : ""}{value.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {!timeOnly && <Button title="Choose date" secondary disabled={disabled} onPress={() => open("date")} />}
      <Button title="Choose time" secondary disabled={disabled} onPress={() => open("time")} />
    </View>
    {mode !== null && <Modal visible animationType="slide" onRequestClose={() => setMode(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Label>{mode === "date" ? "CHOOSE DATE" : "CHOOSE TIME"}</Label>
          <DateTimePicker locale={locale()} value={draft} mode={mode} display="spinner" themeVariant={themeMode} style={{ alignSelf: "stretch" }}
            minimumDate={mode === "date" ? new Date(1970, 0, 1) : undefined} maximumDate={mode === "date" ? new Date() : undefined}
            onValueChange={(_event, selected) => setDraft(selected)} />
          <Button title="Done" onPress={() => { onChange(merge(draft, mode)); setMode(null); }} />
          <Button title="Cancel picker" secondary onPress={() => setMode(null)} />
        </ScrollView>
      </SafeAreaView>
    </Modal>}
  </View>;
}
