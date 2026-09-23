import { useCallback, useEffect } from "react";
import { Alert, BackHandler, View } from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Label, Title, Copy, Button, s } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { SighVisual } from "../src/sigh-visual";
import { colors } from "@inout/design-tokens";
import { breathingGuidance } from "../src/breathing-guidance";
import { practiceDuration } from "../src/format";
import { protocols } from "@inout/protocols";

export default function Session() {
  const controller = useSession();
  useFocusEffect(
    useCallback(() => () => controller.pause("interruption"), [controller]),
  );
  const record = controller.current;
  const view = controller.view();
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      controller.pause();
      return true;
    });
    return () => sub.remove();
  }, [controller]);
  if (!record || !view) return <Redirect href="/(tabs)" />;
  if (record.stage === "post") return <Redirect href="/post" />;
  if (record.stage === "result")
    return (
      <Redirect href={{ pathname: "/result", params: { id: record.id } }} />
    );
  const running = record.engine.status === "running";
  const unavailable = record.protocol?.safetyCategory === "highIntensity" || record.engine.plan.blocks.some((b) => b.protocolId === "high-intensity-cyclic");
  const animationType =
    protocols.find((protocol) => protocol.id === record.engine.plan.blocks[view.blockIndex].protocolId)
      ?.animationType ?? record.protocol?.animationType ?? "wave";
  const block = record.engine.plan.blocks[view.blockIndex];
  let nextPhases = block.phases;
  let nextIndex = block.phases.findIndex((phase, i) => i > view.phaseIndex && phase.durationMs > 0);
  if (nextIndex < 0 && view.currentCycle < view.totalCycles) nextIndex = block.phases.findIndex(p => p.durationMs > 0);
  if (nextIndex < 0 && record.engine.plan.blocks[view.blockIndex + 1]) {
    nextPhases = record.engine.plan.blocks[view.blockIndex + 1].phases;
    nextIndex = nextPhases.findIndex(p => p.durationMs > 0);
  }
  const nextLabel = nextIndex < 0 ? "Session complete" : `${breathingGuidance(nextPhases, nextIndex).label} � ${practiceDuration(nextPhases[nextIndex].durationMs)}`;
  const end = () => {
    controller.pause();
    Alert.alert(
      "End this session?",
      "Your elapsed time will be saved as an ended session.",
      [
        { text: "Keep paused", style: "cancel" },
        {
          text: "End session",
          style: "destructive",
          onPress: () => controller.end("ended"),
        },
      ],
    );
  };
  const unwell = () => {
    controller.pause();
    Alert.alert(
      "Stop and breathe naturally",
      "Let go of the pacing. Sit or lie somewhere safe. Do not push through discomfort.",
      [{ text: "End session", onPress: () => controller.end("unwell") }],
      { cancelable: false },
    );
  };
  return (
    <Screen
      title="ACTIVE SESSION"
      footer={
        <View
          testID="session-controls"
          style={{
            paddingHorizontal: 16,
            paddingBottom: 8,
            paddingTop: 12,
            gap: 8,
          }}
        >
          <Button
            title={running ? "Pause" : "Resume"}
            disabled={!!controller.error || unavailable}
            onPress={() => (running ? controller.pause() : controller.resume())}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="End session" secondary onPress={end} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="I feel unwell" danger onPress={unwell} />
            </View>
          </View>
        </View>
      }
    >
      <Title>{record.protocolName}</Title>
      <Label>
        {record.goal.toUpperCase()} · {practiceDuration(view.sessionRemainingMs)} LEFT
      </Label>
      <SaveError />
      {unavailable && <Copy>This older routine is not available in this release. End this session to choose another practice.</Copy>}
      {record.engine.plan.blocks.length > 1 && <Copy>
        Block {view.blockIndex + 1}/{record.engine.plan.blocks.length} · {protocols.find((p) => p.id === record.engine.plan.blocks[view.blockIndex].protocolId)?.name ?? "Custom"}
        {record.engine.plan.blocks[view.blockIndex + 1] ? ` · Next: ${protocols.find((p) => p.id === record.engine.plan.blocks[view.blockIndex + 1].protocolId)?.name ?? "Custom"}` : " · Final block"}
      </Copy>}
      {!running && (
        <Copy accessibilityRole="alert">
          {record.engine.pauseReason === "manual"
            ? "Paused. Continue when you are ready."
            : "Session paused after an interruption. Breathe naturally, then resume or restart."}
        </Copy>
      )}
      <LinearGradient
        colors={[colors.sessionSurface, colors.lowest]}
        style={[s.card, { padding: 16, borderWidth: 1, borderColor: colors.sessionBorder, borderRadius: 24 }]}
      >
        <SighVisual
          view={view}
          running={running}
          animationType={animationType}
          phases={record.engine.plan.blocks[view.blockIndex].phases}
        />
        <Copy style={[s.small, { textAlign: "center" }]}>Next: {nextLabel}</Copy>
        <View style={s.row}>
          {record.engine.plan.blocks[view.blockIndex].phases.map((phase, i) => phase.durationMs > 0 && (
            <View key={i} style={{ flex: 1, gap: 8, minWidth: 48 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    i === view.phaseIndex ? colors.accent : colors.border,
                }}
              />
              <Copy style={[s.small, { color: i === view.phaseIndex ? colors.text : colors.muted }]}>{breathingGuidance(record.engine.plan.blocks[view.blockIndex].phases, i).label.toUpperCase()}</Copy>
              <Copy style={[s.small, { color: colors.muted }]}>{phase.durationMs / 1000}s</Copy>
            </View>
          ))}
        </View>
        {!running && (
          <Button
            title="Restart from the beginning"
            secondary
            disabled={!!controller.error || unavailable}
            onPress={() =>
              Alert.alert(
                "Restart session?",
                "The current attempt will reset to cycle 1.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Restart", onPress: () => controller.restart() },
                ],
              )
            }
          />
        )}
      </LinearGradient>
      <Copy style={s.small}>
        Breathe comfortably. Follow the guide without forcing.
      </Copy>
      {!running && (
        <Button
          title="Audio & haptics"
          secondary
          onPress={() => router.push("/settings")}
        />
      )}
    </Screen>
  );
}
