import { useTheme } from "../src/theme";
import { recordTitle, message, t, countLabel } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Alert, Switch } from "../src/localized-native";
import { useState } from "react";
import { Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Screen, Title, Label, Card, Copy, Button, useStyles } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { shiftText, practiceDuration as duration } from "../src/format";
import { stateShift } from "@inout/shared-types";
import { snapshot } from "@inout/breathing-engine";

import { Celebration } from "../src/celebration";
import { WeeklyGoal } from "../src/practice-rewards";
import { ShareExercise } from "../src/share-exercise";
export default function Result() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const [shareRatingsFor, setShareRatingsFor] = useState<string | null>(null);
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
  const shift = stateShift(record.pre, record.post);
  const resultColor = shift !== null && shift > 0 ? colors.exhale : colors.accent;
  const view = snapshot(record.engine, record.engine.anchorAt);
  return (
    <Screen title="STATE SHIFT">
      {saved === "1" && controller.current?.id === id && !controller.error && record.endReason === "completed" && <Celebration
        variant="saved"
        awards={controller.latestAwards}
        title={shift !== null && shift > 0 ? "A little lighter." : "Session saved!"}
        message={shift !== null && shift > 0 ? "You reported less tension. A moment worth celebrating — your session is saved." : "Your practice is part of your progress. Nicely done."}
      />}
      {saved === "1" && !controller.error && <WeeklyGoal compact />}
      <View style={s.resultHeader}>
        <View style={s.row}>
          <View style={s.inlineLabel}>
            <MaterialIcons name={record.endReason === "completed" ? "check-circle" : "pause-circle"} size={18} color={colors.accent} />
            <Label>{record.endReason === "completed" ? "SESSION COMPLETE" : "SESSION ENDED"}</Label>
          </View>
          <Copy style={s.small}>SELF-REPORTED</Copy>
        </View>
        <Copy translate={false} style={s.resultMeta}>
          {recordTitle(record)} · {duration(view.sessionElapsedMs)} · {record.source === "manual" ? t("Manually logged") : countLabel(view.completedCycles, "cycle")}
        </Copy>
      </View>
      <Card style={{ ...s.resultHero, borderColor: resultColor + "50", padding: 24 }}>
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
            <Copy style={[s.rating, { color: resultColor }]}>{record.post ?? "—"}</Copy>
          </View>
        </View>
        <Title>{shiftText(record)}</Title>
        <Copy style={s.small}>Self-reported tension · 1–10</Copy>
      </Card>
      {record.source !== "manual" && <Card>
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
      </Card>}
      <SaveError />
      {record.source !== "manual" && record.protocol && <ShareExercise protocol={record.protocol} />}
      {shift !== null && <View style={s.row}>
        <Copy>Include my tension change when sharing</Copy>
        <Switch accessibilityLabel={t("Include my tension change when sharing")} value={shareRatingsFor === record.id} onValueChange={enabled => setShareRatingsFor(enabled ? record.id : null)} />
      </View>}
      <Copy style={s.small}>Sharing includes your practice name and duration. Tension ratings stay private unless you choose to include them.</Copy>
      <View style={{ gap: 8 }}>
        <Button
          title="DONE · VIEW HISTORY  →"
          disabled={!!controller.error}
          onPress={() => router.replace("/history")}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <View style={{ flexGrow: 1, flexBasis: 140 }}>
        <Button
          title="Share result"
          secondary
          disabled={!!controller.error}
          onPress={() => {
            void Share.share({
              message: `IN/OUT · ${recordTitle(record)}\n${duration(view.sessionElapsedMs)}${shareRatingsFor === record.id && shift !== null ? ` · ${t(shiftText(record))} (${t("self-reported")})` : ""}`,
            }).catch(() =>
              Alert.alert("Sharing unavailable", "Please try again."),
            );
          }}
        />
        </View>
        {record.source !== "manual" && <View style={{ flexGrow: 1, flexBasis: 140 }}><Button
          title="Do it again"
          secondary
          disabled={!!controller.error}
          onPress={() => {
            if (record.protocol) {
              controller.setCustomProtocol(record.protocol);
              router.replace({ pathname: "/pre", params: { id: "custom" } });
            } else router.replace({ pathname: "/pre", params: { id: record.protocolId } });
          }}
        /></View>}
        </View>
      </View>
    </Screen>
  );
}
