import { useTheme } from "../src/theme";
import { protocolTitle, countLabel, message } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { useEffect, useState } from "react";
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

import { coachProtocol, comfortableCycles, type CoachSession } from "../src/coach";
import { GuidanceAllowance } from "../src/guidance-allowance";
import { showSessionSafety } from "../src/safety-policy";
export default function Pre() {
  const { colors } = useTheme();
  useLanguage();
  const controller = useSession();
  const { id, ritualId, minSeconds, coachRun, coachStep, coachWeek, coachDate, coachRepeat, coachSeconds } = useLocalSearchParams<{
    id?: string; ritualId?: string; minSeconds?: string; coachRun?: string; coachStep?: string; coachWeek?: string; coachDate?: string; coachRepeat?: string; coachSeconds?: string;
  }>();
  const coachTag: CoachSession | undefined = coachRun ? { enrollmentId: coachRun, step: Number(coachStep) } : coachWeek ? { week: coachWeek, date: coachDate ?? "" } : undefined;
  const coachChoice = coachTag ? controller.coachSession(coachTag, coachRepeat === "1") : null;
  const basicCoach = coachSeconds !== undefined && id ? coachProtocol(id) : null;
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
  const [cycles, setCycles] = useState(coachChoice?.cycles ?? (basicCoach ? comfortableCycles(basicCoach.id as import("../src/coach").CoachProtocolId, Number(coachSeconds)) : undefined) ?? ritual?.cycles ?? Math.max(protocol.defaultCycles, Math.ceil(Math.min(180, Math.max(0, Number(minSeconds) || 0)) * 1000 / cycleDuration)));
  const locked = !controller.entitlements.protocolAccess(protocol).allowed;
  useEffect(() => { if (locked) controller.analytics.track("premium_lock_tapped"); }, [controller, locked, protocol.id]);
  if (coachTag && (!coachChoice || coachChoice.protocolId !== protocol.id || ritualId)) return <BackScreen title="Coach & programs"><Copy>This planned practice is unavailable. Return to your coach to check progress and access.</Copy><Button title="Return to coach" onPress={() => router.replace("/coach")} /></BackScreen>;
  if (ritualId && !ritual) return <BackScreen title="RITUAL"><Copy>This ritual is no longer available.</Copy></BackScreen>;
  if (id && ((id === "custom" && !controller.customProtocol) || (id !== "custom" && !protocols.some((p) => p.id === id))))
    return <BackScreen title="SESSION UNAVAILABLE"><Title>This pattern is unavailable.</Title><Copy>Choose a protocol or create a new session draft.</Copy><Button title="Browse protocols" onPress={() => router.replace("/protocols")} /></BackScreen>;
  const durationLabel = (durationMs: number) => {
    const seconds = Math.round(durationMs / 1000);
    return seconds < 60
      ? `${seconds} sec`
      : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  if (controller.pendingFitness()) return <Redirect href={{ pathname: "/fitness-challenge", params: { id: controller.pendingFitness()!.challengeId } }} />;
  if (controller.pendingTest()) return <Redirect href={{ pathname: "/challenge-test", params: { id: controller.pendingTest()!.challengeId } }} />;
  if (controller.current?.stage === "active")
    return <Redirect href="/session" />;
  if (controller.current?.stage === "post") return <Redirect href="/post" />;
  if (locked) return <BackScreen title="IN/OUT PRO"><Title>{protocolTitle(protocol)}</Title><Copy>This protocol offers another rhythm to explore. It requires InOut Pro in this build.</Copy><Button title="Unlock with InOut Pro" onPress={() => router.push({ pathname: "/pro", params: { source: "protocol" } })} /><Button title="Browse protocols" secondary onPress={() => router.replace("/protocols")} /></BackScreen>;
  if (!availableForPractice(protocol))
    return <BackScreen title="PROTOCOL"><Title>Not in this release.</Title><Copy>This routine includes a protocol that is currently unavailable. Choose another breathing practice.</Copy><Button title="Browse protocols" onPress={() => router.replace("/protocols")} /></BackScreen>;
  const start = (value: number | null) => {
    controller.requestSafety(() => {
    if (ritual) controller.startRitual(ritual.id, true, value, cycles);
    else controller.start(
      value,
      cycles,
      protocol,
      true,
      undefined,
      coachTag ? { tag: coachTag, repeat: coachRepeat === "1" } : undefined,
    );
    }, protocol);
    router.push("/practice-safety");
  };
  return (
    <BackScreen title="STATE SHIFT · PRE" footer={<ActionFooter>
      <SaveError />
      <Button title={showSessionSafety(controller.preferences, protocol) ? "Continue to safety" : "Start practice"} disabled={rating === null || !!controller.error} onPress={() => start(rating)} />
      <Button title="Skip rating & continue" secondary disabled={!!controller.error} onPress={() => start(null)} />
    </ActionFooter>}>
      {coachChoice && <Copy>{coachChoice.explanation}</Copy>}
      <View style={{ gap: 6 }}>
        <Label>{protocol.goalTags[0].toUpperCase()}</Label>
        <Title translate={false}>{protocolTitle(protocol)}</Title>
        <Copy style={{ color: colors.accent }}>
          {intense ? "Breaths · Retention · Recovery" : protocol.phases.map((phase) => phase.label).join(" · ")}
        </Copy>
      </View>
      {intense && <CyclicOverview compact />}
      <Copy accessibilityRole="header" style={{ fontSize: 24, lineHeight: 32, fontWeight: "700" }}>How tense are you right now?</Copy>
      <GuidanceAllowance />
      {controller.preferences.audio === "voice" && !controller.guidedAccess().allowed && <Copy>Your guided allowance is used. This session will use tones. You can still breathe for free.</Copy>}
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
          if (coachChoice && (presetCycles > coachChoice.cycles || presetCycles < comfortableCycles(coachChoice.protocolId, 60))) return null;
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
      <ActionRow title="Audio & haptics" icon="tune" onPress={() => router.push("/practice-audio")} />
      <Copy>Self-reported. Takes 1–2 seconds.</Copy>
      <ActionRow title="Save as a personal ritual" icon="bookmark-border" onPress={() => router.push({ pathname: "/ritual-edit", params: { protocolId: id ?? protocol.id, cycles: String(cycles) } })} />
      <ActionRow title="Breathing safety" icon="health-and-safety" onPress={() => router.push("/safety")} />
    </BackScreen>
  );
}
