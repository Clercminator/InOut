import { useTheme } from "../src/theme";
import { protocolTitle, countLabel, message } from "../src/i18n";
import { useLanguage } from "../src/use-language";
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
  Disclosure,
  ActionRow,
  Chip,
  ActionFooter,
} from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { protocols, sigh, isCyclic, availableForPractice } from "@inout/protocols";
import { experienceFor } from "../src/experience";
import { CyclicOverview, CyclicSafety } from "../src/cyclic-content";
import { totalDuration } from "@inout/breathing-engine";
import { SoundControls } from "../src/sound-controls";
export default function Pre() {
  const { colors } = useTheme();
  useLanguage();
  const controller = useSession();
  const { id, ritualId } = useLocalSearchParams<{ id?: string; ritualId?: string }>();
  const ritual = experienceFor(controller.preferences).rituals.find(r => r.id === ritualId);
  const protocol = ritual?.protocol ?? (id === "custom" && controller.customProtocol
    ? controller.customProtocol
    : protocols.find((item) => item.id === id) ?? sigh);
  const intense = isCyclic(protocol);
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const cycleDuration = protocol.plan ? totalDuration(protocol.plan) : protocol.phases.reduce(
    (total, phase) => total + phase.durationMs,
    0,
  );
  const [cycles, setCycles] = useState(ritual?.cycles ?? protocol.defaultCycles);
  if (ritualId && !ritual) return <BackScreen title="RITUAL"><Copy>This ritual is no longer available.</Copy></BackScreen>;
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
  if (!availableForPractice(protocol))
    return <BackScreen title="PROTOCOL"><Title>Not in this release.</Title><Copy>This routine includes a protocol that is currently unavailable. Choose another breathing practice.</Copy><Button title="Browse protocols" onPress={() => router.replace("/(tabs)/protocols")} /></BackScreen>;
  const start = (value: number | null) => {
    if (ritual) controller.startRitual(ritual.id, confirmed, value, cycles);
    else controller.start(
      value,
      cycles,
      protocol,
      confirmed,
    );
    if (controller.current?.stage === "active") router.replace("/session");
  };
  return (
    <BackScreen title="STATE SHIFT · PRE" footer={<ActionFooter>
      <SaveError />
      <Button title="START PRACTICE  →" disabled={rating === null || (intense && !confirmed) || !!controller.error} onPress={() => start(rating)} />
      <Button title="Skip rating & start" secondary disabled={(intense && !confirmed) || !!controller.error} onPress={() => start(null)} />
    </ActionFooter>}>
      <View style={{ gap: 6 }}>
        <Label>{protocol.goalTags[0].toUpperCase()}</Label>
        <Title translate={false}>{protocolTitle(protocol)}</Title>
        <Copy style={{ color: colors.accent }}>
          {intense ? "Breaths · Retention · Recovery" : protocol.phases.map((phase) => phase.label).join(" · ")}
        </Copy>
      </View>
      {intense && <><CyclicOverview compact /><Card><CyclicSafety /><Chip title="I have read the precautions and I am in a safe place" selected={confirmed} onPress={() => setConfirmed(!confirmed)} /></Card></>}
      <Title>How tense are you right now?</Title>
      <Copy>Optional check-in. You can skip it and start breathing.</Copy>
      <StateScale value={rating} onChange={setRating} />
      <Card>
        <Label>SESSION LENGTH</Label>
        <Copy style={{ color: colors.accent }}>
          {intense ? message(cycles === 1 ? "Up to {0} · 1 round" : "Up to {0} · {1} rounds", [durationLabel(cycles * cycleDuration), cycles]) : `${durationLabel(cycles * cycleDuration)} · ${countLabel(cycles, protocol.plan ? "repeat" : "cycle")}`}
        </Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {protocol.durationPresets.map((duration) => {
          const presetCycles = Math.max(1, Math.round(duration / cycleDuration));
          return (
            <Chip
              key={duration}
              title={intense ? message(presetCycles === 1 ? "Up to {0} · 1 round" : "Up to {0} · {1} rounds", [durationLabel(duration), presetCycles]) : `${durationLabel(duration)} · ${countLabel(presetCycles, protocol.plan ? "repeat" : "cycle")}`}
              selected={cycles === presetCycles}
              onPress={() => setCycles(presetCycles)}
            />
          );
        })}
        </View>
        <Copy>Breathe comfortably in a safe place. Never practice while driving or in water. Stop if dizzy or unwell.</Copy>
        {protocol.safetyCategory === "retention" && <Copy>Keep holds comfortable. Return to natural breathing whenever you need to.</Copy>}
      </Card>
      <Disclosure title="Guidance & sound" icon="volume-up">
        <Copy>The guide grows as you breathe in, rests during holds, and settles as you breathe out.</Copy>
        {controller.preferences.audio !== "silent" && <Copy>{controller.preferences.audio === "voice" ? "Spoken cues and breath sounds" : "Breath sounds"} follow each phase. Airflow goes quiet during holds.</Copy>}
        {controller.preferences.haptics && <Copy>Touch: gentle cues for inhale and exhale. Holds stay quiet. Choose your vibration style below.</Copy>}
        <SoundControls compact />
        <ActionRow title="Audio & haptics" icon="tune" onPress={() => router.push("/settings")} />
      </Disclosure>
      <Copy>Self-reported. Takes 1–2 seconds.</Copy>
      <ActionRow title="Save as a personal ritual" icon="bookmark-border" onPress={() => router.push({ pathname: "/ritual-edit", params: { protocolId: id ?? protocol.id, cycles: String(cycles) } })} />
      <ActionRow title="Breathing safety" icon="health-and-safety" onPress={() => router.push("/safety")} />
    </BackScreen>
  );
}
