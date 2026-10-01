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
    availability: safetyCategory === "highIntensity" ? "definitionOnly" : "enabled",
  };
}
// Versioned pacing presets, not claims of clinical efficacy. High-intensity use
// additionally requires the native pre-session safety confirmation.
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
  {
    ...protocol("high-intensity-cyclic", "Wim Hof–style Breathing", ["Perform", "Energize"],
      [phase("inhale", 2), phase("exhale", 2)], 3, "pulse", "highIntensity"),
    version: 2,
    availability: "enabled",
    defaultDuration: 648000,
    durationPresets: [216000, 432000, 648000],
    plan: { blocks: [
      { protocolId: "high-intensity-cyclic", protocolVersion: 2, cycles: 30, phases: [phase("inhale", 2), phase("exhale", 2)] },
      { protocolId: "high-intensity-cyclic", protocolVersion: 2, cycles: 1, phases: [phase("retention", 60)] },
      { protocolId: "high-intensity-cyclic", protocolVersion: 2, cycles: 1, phases: [phase("inhale", 3), phase("hold", 15), phase("exhale", 3), phase("freeBreathing", 15)] },
    ] },
  },
];
export const cyclic = protocols[9];
export const isCyclic = (p: Pick<Protocol, "id" | "version">) => p.id === cyclic.id && p.version === cyclic.version;
export const includesHighIntensity = (p: Protocol) => p.safetyCategory === "highIntensity" || p.id === cyclic.id || !!p.plan?.blocks.some(b => b.protocolId === cyclic.id);
export const availableForPractice = (p: Protocol) => p.availability === "enabled" && (!includesHighIntensity(p) || isCyclic(p));
export const sigh = protocols[0];
export function planFor(
  protocol: Protocol,
  cycles = protocol.defaultCycles,
): SessionPlan {
  if (isCyclic(protocol)) {
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 3) throw new Error("Choose 1–3 rounds.");
    // Use the versioned definition, including for saved rituals and replay snapshots.
    return { blocks: Array.from({ length: cycles }, () => cyclic.plan!.blocks).flat() };
  }
  if (protocol.plan) {
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 1000)
      throw new Error("Invalid mix repeat count");
    return { blocks: Array.from({ length: cycles }, () => protocol.plan!.blocks).flat() };
  }
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
