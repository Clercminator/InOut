import { Alert, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
    <Screen title="STATE SHIFT">
      <View style={s.resultHeader}>
        <View style={s.row}>
          <View style={s.inlineLabel}>
            <MaterialIcons name={record.endReason === "completed" ? "check-circle" : "pause-circle"} size={18} color={colors.accent} />
            <Label>{record.endReason === "completed" ? "SESSION COMPLETE" : "SESSION ENDED"}</Label>
          </View>
          <Copy style={s.small}>SELF-REPORTED</Copy>
        </View>
        <Copy style={s.resultMeta}>
          {record.protocolName} · {duration(view.sessionElapsedMs)} · {view.completedCycles} cycles
        </Copy>
      </View>
      <Card style={s.resultHero}>
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
        <Copy>
          {record.engine.plan.blocks.flatMap((block) => block.phases)
            .map((phase) => `${phase.label} ${phase.durationMs / 1000}s`)
            .join(" · ")}
        </Copy>
        {record.effect && <Copy>{record.effect}</Copy>}
        {record.endReason === "unwell" && (
          <Copy>Stopped for discomfort. Breathe naturally and rest.</Copy>
        )}
      </Card>
      <SaveError />
      <Button
        title="DONE · VIEW HISTORY  →"
        disabled={!!controller.error}
        onPress={() => router.replace("/history")}
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
        onPress={() => {
          if (record.protocol) {
            controller.setCustomProtocol(record.protocol);
            router.replace({ pathname: "/pre", params: { id: "custom" } });
          } else router.replace({ pathname: "/pre", params: { id: record.protocolId } });
        }}
      />
    </Screen>
  );
}
