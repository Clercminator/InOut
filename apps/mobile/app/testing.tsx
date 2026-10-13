import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { pause, resume, snapshot, start } from "@inout/breathing-engine";
import type { EngineState, SessionPlan } from "@inout/shared-types";
import { typography } from "@inout/design-tokens";
import { BackScreen, Title, Label, Copy, Button, Card, Chip, ActionFooter } from "../src/ui";
import { PulseOrb } from "../src/pulse-orb";
import { useTheme } from "../src/theme";
import { message, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";

export const testingPlan: SessionPlan = { blocks: [{ protocolId: "testing-pulse", protocolVersion: 1, cycles: 6,
  phases: [{ type: "inhale", label: "Inhale", durationMs: 5000, audioCue: "Inhale", hapticCue: "light", animationInstruction: "expand" },
    { type: "exhale", label: "Exhale", durationMs: 5000, audioCue: "Exhale", hapticCue: "soft", animationInstruction: "contract" }] }] };
const ready = () => { const now = Date.now(); return pause(start(testingPlan, now), now); };

export default function Testing() {
  useLanguage();
  const { colors } = useTheme();
  const { height, fontScale } = useWindowDimensions();
  const orbSize = Math.max(100, Math.min(260, (height - 470) / fontScale));
  const engine = useRef<EngineState | null>(null);
  if (!engine.current) engine.current = ready();
  const [view, setView] = useState(() => snapshot(engine.current!, Date.now()));
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [generation, setGeneration] = useState(0);
  const update = useCallback((next: EngineState) => { engine.current = next; setView(snapshot(next, Date.now())); }, []);
  const stop = useCallback(() => update(pause(engine.current!, Date.now(), "interruption")), [update]);
  useFocusEffect(useCallback(() => () => stop(), [stop]));
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => { if (state !== "active") stop(); });
    return () => sub.remove();
  }, [stop]);
  const running = engine.current.status === "running" && !view.completed;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setView(snapshot(engine.current!, Date.now())), 100);
    return () => clearInterval(timer);
  }, [running]);
  const restart = () => { update(ready()); setGeneration(value => value + 1); };
  return <BackScreen title="ANIMATION LAB" footer={<ActionFooter>
    <Button title={view.completed ? "Try again" : running ? "Pause" : view.sessionElapsedMs ? "Resume" : "Start testing"}
      onPress={() => view.completed ? restart() : update(running ? pause(engine.current!, Date.now()) : resume(engine.current!, Date.now()))} />
    <Button title="Restart" secondary onPress={restart} />
  </ActionFooter>}>
    <View style={{ gap: 8 }}><Label>EXPERIMENTAL</Label><Title>Testing · Pulse</Title></View>
    <Card style={{ backgroundColor: colors.lowest, borderColor: colors.sessionBorder, gap: 8, padding: 12 }}>
      <PulseOrb key={generation} view={view} running={running} phases={testingPlan.blocks[0].phases} motionEnabled={motionEnabled} size={orbSize} />
      <View accessible accessibilityLabel={message("{0}. {1} seconds remaining.", [t(view.completed ? "Completed" : running ? view.phase.label : "Paused"), Math.ceil(view.phaseRemainingMs / 1000)])}
        style={{ alignItems: "center", gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Label>{view.completed ? "Completed" : running ? view.phase.label : "Paused"}</Label>
          <Copy style={{ fontFamily: typography.metric, fontSize: 40, lineHeight: 48 }}>{Math.ceil(view.phaseRemainingMs / 1000).toString().padStart(2, "0")}</Copy>
        </View>
        <Copy>{message("Cycle {0} of {1}", [view.currentCycle, view.totalCycles])}</Copy>
      </View>
    </Card>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <Chip title="Flowing sphere" selected={motionEnabled} onPress={() => setMotionEnabled(true)} />
      <Chip title="Still sphere" selected={!motionEnabled} onPress={() => setMotionEnabled(false)} />
    </View>
    <Copy>Inhale 5s · Exhale 5s · 1 minute</Copy>
    <Copy>A quiet space to try the new breathing sphere.</Copy>
    <Copy>{running ? "Breathe comfortably. Follow the guide without forcing." : "Breathe naturally while paused"}</Copy>
    <Copy>Visual test only. This does not save a session or count toward progress. Your reduced-motion setting is respected.</Copy>
  </BackScreen>;
}
