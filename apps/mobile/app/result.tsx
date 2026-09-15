import { Alert, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { shiftText, duration } from "../src/format";
import { snapshot } from "@inout/breathing-engine";
import { colors } from "@inout/design-tokens";
export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const controller = useSession();
  const record =
    controller.current?.id === id
      ? controller.current
      : controller.history().find((r) => r.id === id);
  if (!record || record.stage !== "result")
    return (
      <Screen>
        <Title>Session unavailable</Title>
        <Button title="Today" onPress={() => router.replace("/(tabs)")} />
      </Screen>
    );
  const view = snapshot(record.engine, record.engine.anchorAt);
  return (
    <Screen title="SELF-REPORTED">
      <Label>
        {record.endReason === "completed" ? "STATE SHIFT" : "SESSION ENDED"}
      </Label>
      <Copy>
        {record.protocolName} · {duration(view.sessionElapsedMs)} ·{" "}
        {view.completedCycles} completed cycles
      </Copy>
      <Card>
        <View style={s.row}>
          <View>
            <Label>BEFORE</Label>
            <Copy style={[s.rating, { color: colors.muted }]}>
              {record.pre ?? "—"}
            </Copy>
          </View>
          <Copy>→</Copy>
          <View>
            <Label>AFTER</Label>
            <Copy style={s.rating}>{record.post ?? "—"}</Copy>
          </View>
        </View>
        <Title>{shiftText(record)}</Title>
        <Copy style={s.small}>Self-reported tension · 1–10</Copy>
      </Card>
      <Card>
        <Label>CADENCE</Label>
        <Copy>Inhale · Top up · Long exhale</Copy>
        {record.effect && <Copy>{record.effect}</Copy>}
        {record.endReason === "unwell" && (
          <Copy>Stopped for discomfort. Breathe naturally and rest.</Copy>
        )}
      </Card>
      <SaveError />
      <Button
        title="DONE · VIEW HISTORY  →"
        disabled={!!controller.error}
        onPress={() => router.replace("/(tabs)/progress")}
      />
      <Button
        title="Share result"
        secondary
        disabled={!!controller.error}
        onPress={() => {
          void Share.share({
            message: `IN/OUT · ${record.protocolName}\n${duration(view.sessionElapsedMs)} · ${shiftText(record)} (self-reported).`,
          }).catch(() =>
            Alert.alert("Sharing unavailable", "Please try again."),
          );
        }}
      />
      <Button
        title="Do it again"
        secondary
        disabled={!!controller.error}
        onPress={() => router.replace("/pre")}
      />
    </Screen>
  );
}
