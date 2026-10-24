import { useTheme } from "../src/theme";
import { recordTitle, message, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Alert } from "../src/localized-native";
import { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { Redirect, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Label, Title, Copy, Button, useStyles } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { SessionControls } from "../src/session-controls";
import { SessionVisual } from "../src/session-visual";

import { breathingGuidance } from "../src/breathing-guidance";
import { practiceDuration } from "../src/format";
import { protocols, isCyclic } from "@inout/protocols";

export default function Session() {
  const { colors } = useTheme();
  const s = useStyles();
  const { width, fontScale } = useWindowDimensions();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [headingHeight, setHeadingHeight] = useState(0);
  const [detailsHeight, setDetailsHeight] = useState(0);
  const stackedControls = width < 360 || fontScale > 1.3;
  useLanguage();
  const controller = useSession();
  const record = controller.current;
  const view = controller.view();
  if (!record || !view) return <Redirect href="/(tabs)" />;
  if (record.stage === "post") return <Redirect href="/post" />;
  if (record.stage === "result")
    return (
      <Redirect href={{ pathname: "/result", params: { id: record.id } }} />
    );
  const running = record.engine.status === "running";
  const unavailable = !controller.canContinue();
  const intense = !!record.protocol && isCyclic(record.protocol);
  const holding = view.phase.type === "retention" || view.phase.type === "hold";
  const round = record.engine.plan.blocks.slice(0, view.blockIndex + 1).filter(b => b.cycles === 30).length;
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
  const nextLabel = nextIndex < 0 ? "Session complete" : `${breathingGuidance(nextPhases, nextIndex).label} · ${practiceDuration(nextPhases[nextIndex].durationMs)}`;
  return (
    <Screen
      title="ACTIVE SESSION" scroll={false}
      footer={<SessionControls controller={controller} running={running} disabled={!!controller.error || unavailable}
        compact={stackedControls} release={intense && holding ? view.phase.type === "retention" ? "Breathe in now" : "Release now" : undefined} />}

    >
      <ScrollView testID="session-content" style={{ flex: 1 }} onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
        contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View onLayout={event => setHeadingHeight(event.nativeEvent.layout.height)} style={{ gap: 6 }}>
      <Title translate={false}>{recordTitle(record)}</Title>
      <Label>
        {intense ? message("Up to {0} remaining", [practiceDuration(view.sessionRemainingMs)]) : `${record.goal.toUpperCase()} · ${practiceDuration(view.sessionRemainingMs)} REMAINING`}
      </Label>
      <SaveError />
      {controller.audioFailure && <View style={{ gap: 8 }}>
        <Copy accessibilityRole="alert">Sound could not play. Retry audio or continue with the visual guide.</Copy>
        <Button title="Retry audio" onPress={() => controller.recoverAudio()} />
        <Button title="Continue without sound" secondary onPress={() => controller.recoverAudio(true)} />
      </View>}
      {unavailable && <Copy>This older routine is not available in this release. End this session to choose another practice.</Copy>}
      {intense && <><Label>{message("Round {0} of {1}", [round, record.protocol!.defaultCycles])}</Label><Copy>{!running || view.phase.type === "freeBreathing" ? "Breathe naturally" : holding ? "Breathe as soon as you need to. The timer is a limit, not a target." : "Deep, unforced inhale. Let the exhale go without pushing."}</Copy></>}
      {!intense && record.engine.plan.blocks.length > 1 && <Copy>
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
      </View>
      <LinearGradient
        colors={["#171029", "#0E0A19"]}
        style={[s.card, { padding: 12, gap: 8, borderWidth: 1, borderColor: colors.sessionBorder, borderRadius: 24 }]}
      >
        <SessionVisual
          availableHeight={viewportHeight ? viewportHeight - headingHeight - detailsHeight - 72 : undefined}
          nextLabel={nextLabel}
          protocolId={block.protocolId}
          animationType={animationType}
          key={record.id}
          view={view}
          running={running}
          phases={record.engine.plan.blocks[view.blockIndex].phases}
          pacerTheme={controller.effectivePacerTheme()}
          cycleLabel={intense ? block.cycles === 30 ? message("Breath {0} of 30", [view.currentCycle]) : view.phase.type === "retention" ? "Optional retention" : "Recovery breath" : undefined}
        />
        <View onLayout={event => setDetailsHeight(event.nativeEvent.layout.height)} style={{ gap: 8 }}>
        <View style={s.row}>
          {record.engine.plan.blocks[view.blockIndex].phases.map((phase, i) => phase.durationMs > 0 && (
            <View key={i} accessible accessibilityLabel={`${t(breathingGuidance(block.phases, i).label)} · ${practiceDuration(phase.durationMs)}`} style={{ flex: 1, gap: 8 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    i === view.phaseIndex ? colors.accent : colors.border,
                }}
              />
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
                  { text: "Restart", onPress: () => { controller.requestSafety(() => controller.restart(), record.protocol); router.push("/practice-safety"); } },
                ],
              )
            }
          />
        )}
        </View>
      </LinearGradient>
      {!running && (
        <Button
          title="Audio & haptics"
          secondary
          onPress={() => router.push("/practice-audio")}
        />
      )}
      </ScrollView>
    </Screen>
  );
}
