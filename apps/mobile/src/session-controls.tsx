import { memo, useCallback, useRef, useState } from "react";
import { AppState, BackHandler, Modal, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { SessionController } from "./session-controller";
import { ActionFooter, Button, Copy, Title } from "./ui";
import { useTheme } from "./theme";

type Dialog = "end";
/** Controls do not re-render at the 20 Hz engine checkpoint/display cadence. */
export const SessionControls = memo(function SessionControls({ controller, running, disabled, compact, release }: {
  controller: SessionController; running: boolean; disabled: boolean; compact: boolean;
  release?: "Breathe in now" | "Release now";
}) {
  const { colors } = useTheme();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const currentDialog = useRef<Dialog | null>(null);
  const dismiss = useCallback(() => { currentDialog.current = null; setDialog(null); }, []);
  const show = useCallback((kind: Dialog) => {
    controller.pause();
    if (controller.current?.stage !== "active") return;
    currentDialog.current = kind; setDialog(kind);
  }, [controller]);
  useFocusEffect(useCallback(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (currentDialog.current) dismiss(); else show("end");
      return true;
    });
    const app = AppState.addEventListener("change", state => {
      if (state !== "active") { dismiss(); controller.pause("background"); }
    });
    return () => { back.remove(); app.remove(); dismiss(); controller.pause("interruption"); };
  }, [controller, dismiss, show]));
  const finish = () => {
    const kind = currentDialog.current;
    if (!kind) return;
    dismiss(); controller.end("ended");
  };
  return <>
    <ActionFooter><View testID="session-controls" pointerEvents="auto" style={{ gap: 8 }}>
      {release && running && <Button title={release} onPress={() => controller.releaseHold()} />}
      <Button title={running ? "Pause" : "Resume"} disabled={disabled}
        onPress={() => running ? controller.pause() : controller.resume()} />
      <View style={{ flexDirection: compact ? "column" : "row", gap: 8 }}>
        <View style={{ flex: compact ? undefined : 1 }}><Button title="End session" secondary onPress={() => show("end")} /></View>
        <View style={{ flex: compact ? undefined : 1 }}><Button title="I feel unwell" danger onPress={() => { dismiss(); controller.end("unwell"); }} /></View>
      </View>
    </View></ActionFooter>
    <Modal visible={dialog !== null} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#090616B8", justifyContent: "center", padding: 24 }}>
        <View accessibilityViewIsModal style={{ maxHeight: "90%", borderRadius: 24, borderWidth: 1,
          borderColor: colors.accent, backgroundColor: colors.card, overflow: "hidden" }}>
          <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={{ padding: 24, gap: 18 }}>
            <Copy translate={false} style={{ color: colors.accent, fontWeight: "700" }}>IN/OUT</Copy>
            <Title>End your session?</Title>
            <Copy>You can keep breathing or end this practice.</Copy>
            <Button title="Continue breathing" disabled={disabled} onPress={() => { dismiss(); controller.resume(); }} />
            <Button title="End session" danger testID="confirm-end-session" onPress={finish} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
});
