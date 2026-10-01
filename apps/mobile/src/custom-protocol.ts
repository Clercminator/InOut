import type { Phase, PhaseType, Protocol } from "@inout/shared-types";
import { planFor } from "@inout/protocols";
import { totalDuration } from "@inout/breathing-engine";

export function makeMixProtocol(protocols: Protocol[]): Protocol {
  if (!protocols.length) throw new Error("Choose at least one protocol");
  const safety = protocols.some((p) => p.safetyCategory === "highIntensity")
    ? "highIntensity" : protocols.some((p) => p.safetyCategory === "retention") ? "retention" : "general";
  const plan = { blocks: protocols.flatMap((p) => planFor(p).blocks) };
  const duration = totalDuration(plan);
  return { ...makeCustomProtocol("custom-mix", "My Custom Mix", protocols[0].phases, 1, safety),
    plan, defaultDuration: duration, durationPresets: [duration, duration * 2, duration * 3] };
}

const labels: Record<PhaseType, string> = {
  inhale: "Inhale",
  inhaleTopUp: "Top up",
  hold: "Hold",
  exhale: "Exhale",
  hum: "Hum",
  retention: "Rest",
  recovery: "Recover",
  freeBreathing: "Breathe naturally",
};

export function customPhase(type: PhaseType, seconds: number): Phase {
  return {
    type,
    durationMs: seconds * 1000,
    label: labels[type],
    audioCue: labels[type],
    hapticCue: type === "hold" ? "medium" : type === "exhale" || type === "hum" ? "soft" : "light",
    animationInstruction: type === "inhale" ? "expand" : type === "inhaleTopUp" ? "topUp" : type === "exhale" ? "contract" : type === "hum" ? "ripple" : "still",
  };
}

export function makeCustomProtocol(
  id: string,
  name: string,
  phases: Phase[],
  cycles: number,
  safetyCategory: Protocol["safetyCategory"] = phases.some((p) => p.type === "hold" || p.type === "retention") ? "retention" : "general",
): Protocol {
  const duration = phases.reduce((total, phase) => total + phase.durationMs, 0) * cycles;
  return {
    id,
    version: 1,
    name,
    goalTags: ["Calm"],
    phases,
    defaultCycles: cycles,
    defaultDuration: duration,
    durationPresets: [duration, duration * 2, duration * 3],
    intensity: safetyCategory === "highIntensity" ? "high" : "gentle",
    safetyCategory,
    animationType: "wave",
    audioConfig: { enabled: true },
    hapticConfig: { enabled: true },
    availability: "enabled",
  };
}
