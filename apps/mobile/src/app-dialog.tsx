import { type PropsWithChildren, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Modal, Platform, ScrollView, View, type AlertButton } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { appAlerts, type AppAlert } from "./app-alert";
import { Button, Copy, Title } from "./ui";
import { useTheme } from "./theme";
import { t } from "./i18n";

export function AppDialog({ title, children, onRequestClose, onDismiss, visible = true, danger = false }: PropsWithChildren<{
  title: string; onRequestClose: () => void; onDismiss?: () => void; visible?: boolean; danger?: boolean;
}>) {
  const { colors } = useTheme();
  const accent = danger ? colors.danger : colors.accent;
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent
    onRequestClose={onRequestClose} onDismiss={onDismiss} onShow={() => AccessibilityInfo.announceForAccessibility(t(title))}>
    <SafeAreaView style={{ flex: 1, backgroundColor: "#090616B8", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <View accessibilityViewIsModal importantForAccessibility="yes" style={{ width: "100%", maxWidth: 440, maxHeight: "92%",
        borderRadius: 28, borderWidth: 1, borderColor: accent + "55", backgroundColor: colors.card, overflow: "hidden" }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ padding: 10, borderRadius: 16, backgroundColor: accent + "18" }}>
              <MaterialIcons name={danger ? "warning-amber" : "info-outline"} size={26} color={accent} accessible={false} />
            </View>
            <Copy translate={false} style={{ color: accent, fontWeight: "700", letterSpacing: 1 }}>IN/OUT</Copy>
          </View>
          <Title>{title}</Title>
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

function AlertMessage({ alert }: { alert: AppAlert }) {
  const [visible, setVisible] = useState(true);
  const action = useRef<AlertButton | undefined>(undefined);
  const closing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const finish = () => appAlerts.finish(alert.id, action.current);
  const close = (button?: AlertButton) => {
    if (closing.current) return;
    closing.current = true; action.current = button; setVisible(false);
    // iOS native sheets need the Modal dismissal acknowledgement before opening another sheet.
    if (Platform.OS !== "ios") timer.current = setTimeout(finish, 220);
  };
  return <AppDialog title={alert.title} visible={visible} danger={alert.buttons.some(button => button.style === "destructive")}
    onDismiss={finish} onRequestClose={() => { if (alert.options?.cancelable) close(); }}>
    {!!alert.message && <Copy>{alert.message}</Copy>}
    <View style={{ gap: 10, marginTop: 4 }}>
      {alert.buttons.map((button, index) => <Button key={index} title={button.text ?? "OK"}
        secondary={button.style === "cancel" || (alert.buttons.length > 1 && index !== alert.buttons.length - 1)}
        danger={button.style === "destructive"} onPress={() => close(button)} />)}
    </View>
  </AppDialog>;
}

export function AppAlertHost() {
  const alert = useSyncExternalStore(appAlerts.subscribe, appAlerts.getSnapshot, appAlerts.getSnapshot);
  return alert ? <AlertMessage key={alert.id} alert={alert} /> : null;
}
