import type {
  Phase,
  PhaseType,
  Protocol,
  SessionPlan,
  Goal,
} from "@inout/shared-types";
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
function phase(
  type: PhaseType,
  seconds: number,
  nostril?: Phase["nostril"],
): Phase {
  return {
    type,
    durationMs: seconds * 1000,
    label: labels[type],
    nostril,
    audioCue: labels[type],
    hapticCue:
      type === "exhale" || type === "hum"
        ? "soft"
        : type === "hold"
          ? "medium"
          : "light",
    animationInstruction:
      type === "inhale"
        ? "expand"
        : type === "inhaleTopUp"
          ? "topUp"
          : type === "exhale"
            ? "contract"
            : type === "hum"
              ? "ripple"
              : "still",
  };
}
function protocol(
  id: string,
  name: string,
  goals: Goal[],
  phases: Phase[],
  cycles: number,
  animationType: Protocol["animationType"] = "wave",
  safetyCategory: Protocol["safetyCategory"] = "general",
): Protocol {
  const duration = phases.reduce((n, p) => n + p.durationMs, 0) * cycles;
  return {
    id,
    version: 1,
    name,
    goalTags: goals,
    phases,
    defaultCycles: cycles,
    defaultDuration: duration,
    durationPresets: [duration, duration * 2, duration * 3],
    intensity: safetyCategory === "highIntensity" ? "high" : "gentle",
    safetyCategory,
    animationType,
    audioConfig: { enabled: true },
    hapticConfig: { enabled: true },
    availability: id === "physiological-sigh" ? "enabled" : "definitionOnly",
  };
}
// Versioned pacing presets, not claims of clinical efficacy. Only the first slice is exposed for execution.
export const protocols: Protocol[] = [
  protocol(
    "physiological-sigh",
    "Physiological Sigh",
    ["Calm"],
    [phase("inhale", 4), phase("inhaleTopUp", 2), phase("exhale", 10)],
    3,
    "sigh",
  ),
  protocol(
    "box",
    "Box Breathing",
    ["Focus", "Perform"],
    [
      phase("inhale", 4),
      phase("hold", 4),
      phase("exhale", 4),
      phase("hold", 4),
    ],
    12,
    "box",
    "retention",
  ),
  protocol(
    "coherent",
    "Coherent Breathing",
    ["Calm", "Recover"],
    [phase("inhale", 5), phase("exhale", 5)],
    18,
  ),
  protocol(
    "extended-exhale",
    "Extended Exhale",
    ["Calm", "Sleep"],
    [phase("inhale", 4), phase("exhale", 6)],
    12,
  ),
  protocol(
    "4-7-8",
    "4-7-8 Breathing",
    ["Sleep"],
    [phase("inhale", 4), phase("hold", 7), phase("exhale", 8)],
    4,
    "wave",
    "retention",
  ),
  protocol(
    "diaphragmatic",
    "Diaphragmatic Breathing",
    ["Recover"],
    [phase("inhale", 4), phase("exhale", 6)],
    12,
  ),
  protocol(
    "equal",
    "Equal Breathing",
    ["Focus"],
    [phase("inhale", 4), phase("exhale", 4)],
    15,
  ),
  protocol(
    "nadi-shodhana",
    "Nadi Shodhana",
    ["Focus", "Calm"],
    [
      phase("inhale", 4, "left"),
      phase("exhale", 4, "right"),
      phase("inhale", 4, "right"),
      phase("exhale", 4, "left"),
    ],
    6,
    "alternating",
  ),
  protocol(
    "bhramari",
    "Bhramari",
    ["Calm"],
    [phase("inhale", 4), phase("hum", 8)],
    6,
    "ripple",
  ),
  // Definition only; a dedicated safety gate and reviewed retention UX are required before enabling.
  protocol(
    "high-intensity-cyclic",
    "High-Intensity Cyclic Breathing",
    ["Energize"],
    [phase("inhale", 2), phase("exhale", 2)],
    30,
    "pulse",
    "highIntensity",
  ),
];
export const sigh = protocols[0];
export function planFor(
  protocol: Protocol,
  cycles = protocol.defaultCycles,
): SessionPlan {
  return {
    blocks: [
      {
        protocolId: protocol.id,
        protocolVersion: protocol.version,
        phases: protocol.phases,
        cycles,
      },
    ],
  };
}
