import { useState } from "react";
import { View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  BackScreen,
  Title,
  Label,
  Card,
  Copy,
  Button,
  StateScale,
} from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { protocols, sigh } from "@inout/protocols";
import { totalDuration } from "@inout/breathing-engine";
export default function Pre() {
  const controller = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const protocol = id === "custom" && controller.customProtocol
    ? controller.customProtocol
    : protocols.find((item) => item.id === id) ?? sigh;
  const [rating, setRating] = useState<number | null>(null);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const cycleDuration = protocol.plan ? totalDuration(protocol.plan) : protocol.phases.reduce(
    (total, phase) => total + phase.durationMs,
    0,
  );
  const [cycles, setCycles] = useState(protocol.defaultCycles);
  if (id && ((id === "custom" && !controller.customProtocol) || (id !== "custom" && !protocols.some((p) => p.id === id))))
    return <BackScreen title="SESSION UNAVAILABLE"><Title>This pattern is unavailable.</Title><Copy>Choose a protocol or create a new session draft.</Copy><Button title="Browse protocols" onPress={() => router.replace("/(tabs)/protocols")} /></BackScreen>;
  const durationLabel = (durationMs: number) => {
    const seconds = Math.round(durationMs / 1000);
    return seconds < 60
      ? `${seconds} sec`
      : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  if (controller.current?.stage === "active")
    return <Redirect href="/session" />;
  if (controller.current?.stage === "post") return <Redirect href="/post" />;
  const start = (value: number | null) => {
    controller.start(
      value,
      cycles,
      protocol,
      safetyConfirmed,
    );
    if (controller.current?.stage === "active") router.replace("/session");
  };
  return (
    <BackScreen title="STATE SHIFT · PRE">
      <View style={{ gap: 6 }}>
        <Label>{protocol.goalTags[0].toUpperCase()}</Label>
        <Title>{protocol.name}</Title>
        <Copy style={{ color: "#adc6ff" }}>
          {protocol.phases.map((phase) => phase.label).join(" · ")} · {Math.round(protocol.defaultDuration / 1000)} sec
        </Copy>
      </View>
      <Title>How tense are you right now?</Title>
      <StateScale value={rating} onChange={setRating} />
      <Card>
        <Label>CADENCE</Label>
        <Copy>{protocol.phases.map((phase) => phase.label).join(" · ")}</Copy>
        <Label>SESSION LOADOUT</Label>
        <Copy style={{ color: "#adc6ff" }}>
          {durationLabel(cycles * cycleDuration)} · {cycles} {protocol.plan ? "repeats" : "cycles"}
        </Copy>
        {protocol.durationPresets.map((duration) => {
          const presetCycles = Math.max(1, Math.round(duration / cycleDuration));
          return (
            <Button
              key={duration}
              title={`${durationLabel(duration)} · ${presetCycles} ${protocol.plan ? "repeats" : "cycles"}`}
              secondary={cycles !== presetCycles}
              onPress={() => setCycles(presetCycles)}
            />
          );
        })}
        <Copy>Breathe comfortably. Stop if dizzy or unwell.</Copy>
        {protocol.safetyCategory === "retention" && <Copy>Keep holds comfortable. Return to natural breathing whenever you need to.</Copy>}
      </Card>
      {protocol.safetyCategory === "highIntensity" && (
        <Card>
          <Label>HIGH-INTENSITY SAFETY GATE</Label>
          <Copy>
            Only practice seated or lying down. Never use this protocol while
            driving, operating machinery, standing, swimming, bathing, or near water.
          </Copy>
          <Copy style={{ color: "#ffb4ab" }}>
            Stop immediately if you feel unwell and return to natural breathing.
          </Copy>
          <Button
            title={
              safetyConfirmed
                ? "Safety confirmed"
                : "I am seated or lying somewhere safe"
            }
            secondary={!safetyConfirmed}
            onPress={() => setSafetyConfirmed((confirmed) => !confirmed)}
          />
        </Card>
      )}
      <SaveError />
      <Button
        title="START RESET  →"
        disabled={
          rating === null ||
          !!controller.error ||
          (protocol.safetyCategory === "highIntensity" && !safetyConfirmed)
        }
        onPress={() => start(rating)}
      />
      <Button
        title="Skip rating & start"
        disabled={
          !!controller.error ||
          (protocol.safetyCategory === "highIntensity" && !safetyConfirmed)
        }
        secondary
        onPress={() => start(null)}
      />
      <Copy>Self-reported. Takes 1–2 seconds.</Copy>
    </BackScreen>
  );
}
