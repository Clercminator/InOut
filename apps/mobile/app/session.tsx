import { useEffect } from "react";
import { Alert, BackHandler, View } from "react-native";
import { Redirect, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Label, Title, Copy, Button, s } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { SighVisual } from "../src/sigh-visual";
import { colors } from "@inout/design-tokens";

export default function Session() {
  const controller = useSession();
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
    <Screen title="ACTIVE SESSION">
      <Title>Physiological Sigh</Title>
      <Label>
        CALM NOW · {Math.ceil(view.sessionRemainingMs / 1000)} SEC LEFT
      </Label>
      <SaveError />
      {!running && (
        <Copy accessibilityRole="alert">
          {record.engine.pauseReason === "manual"
            ? "Paused. Continue when you are ready."
            : "Session paused after an interruption. Breathe naturally, then resume or restart."}
        </Copy>
      )}
      <LinearGradient
        colors={["#0b192b", colors.lowest]}
        style={[s.card, { padding: 16 }]}
      >
        <SighVisual view={view} running={running} />
        <View style={s.row}>
          {record.engine.plan.blocks[0].phases.map((phase, i) => (
            <View key={i} style={{ flex: 1, gap: 8 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    i === view.phaseIndex ? colors.accent : colors.border,
                }}
              />
              <Copy style={s.small}>{phase.label.toUpperCase()}</Copy>
            </View>
          ))}
        </View>
        <Button
          title={running ? "Pause" : "Resume"}
          disabled={!!controller.error}
          onPress={() => (running ? controller.pause() : controller.resume())}
        />
        {!running && (
          <Button
            title="Restart from the beginning"
            secondary
            disabled={!!controller.error}
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
        <Button title="End session" secondary onPress={end} />
        <Button title="I feel unwell" danger onPress={unwell} />
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
