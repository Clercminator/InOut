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
  Chip,
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
  if (protocol.availability !== "enabled" || protocol.safetyCategory === "highIntensity" || protocol.plan?.blocks.some((b) => b.protocolId === "high-intensity-cyclic"))
    return <BackScreen title="PROTOCOL"><Title>Not in this release.</Title><Copy>This routine includes a protocol that is currently unavailable. Choose another breathing practice.</Copy><Button title="Browse protocols" onPress={() => router.replace("/(tabs)/protocols")} /></BackScreen>;
  const start = (value: number | null) => {
    controller.start(
      value,
      cycles,
      protocol,
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
        <Label>SESSION LENGTH</Label>
        <Copy style={{ color: "#adc6ff" }}>
          {durationLabel(cycles * cycleDuration)} · {cycles} {protocol.plan ? "repeats" : "cycles"}
        </Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {protocol.durationPresets.map((duration) => {
          const presetCycles = Math.max(1, Math.round(duration / cycleDuration));
          return (
            <Chip
              key={duration}
              title={`${durationLabel(duration)} · ${presetCycles} ${protocol.plan ? "repeats" : "cycles"}`}
              selected={cycles === presetCycles}
              onPress={() => setCycles(presetCycles)}
            />
          );
        })}
        </View>
        <Copy>Breathe comfortably in a safe place. Never practice while driving or in water. Stop if dizzy or unwell.</Copy>
        {protocol.safetyCategory === "retention" && <Copy>Keep holds comfortable. Return to natural breathing whenever you need to.</Copy>}
      </Card>
      <Card>
        <Label>FOLLOW THE BREATH</Label>
        <Copy>The guide grows as you breathe in, rests during holds, and settles as you breathe out.</Copy>
        {controller.preferences.audio !== "silent" && <Copy>{controller.preferences.audio === "voice" ? "Spoken cues and breath sounds" : "Breath sounds"} follow each phase. Airflow goes quiet during holds.</Copy>}
        {controller.preferences.haptics && <Copy>Touch: two quick taps for in; one for out. Three quick taps mean hold after inhale; two spaced taps mean hold after exhale.</Copy>}
        <Button title="Audio & haptics" secondary onPress={() => router.push("/settings")} />
      </Card>
      <SaveError />
      <Button
        title="START RESET  →"
        disabled={
          rating === null ||
          !!controller.error
        }
        onPress={() => start(rating)}
      />
      <Button
        title="Skip rating & start"
        disabled={
          !!controller.error
        }
        secondary
        onPress={() => start(null)}
      />
      <Copy>Self-reported. Takes 1–2 seconds.</Copy>
      <Button title="Breathing safety" secondary onPress={() => router.push("/safety")} />
    </BackScreen>
  );
}
