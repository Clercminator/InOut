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
  description?: string,
  searchTerms: string[] = [],
): Protocol {
  const duration = phases.reduce((n, p) => n + p.durationMs, 0) * cycles;
  return {
    id,
    version: 1,
    name,
    description,
    searchTerms,
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
    availability: safetyCategory === "highIntensity" && !["high-intensity-cyclic", "high-intensity-cyclic-alt"].includes(id) ? "definitionOnly" : "enabled",
  };
}

export function breathingRate(protocol: Pick<Protocol, "phases" | "defaultCycles">) {
  const cycleSeconds = protocol.phases.reduce((sum, phase) => sum + phase.durationMs, 0) / 1000;
  return cycleSeconds > 0 ? Number((60 / cycleSeconds).toFixed(2)) : 0;
}

export function protocolSummary(protocol: Protocol) {
  return {
    rate: breathingRate(protocol),
    cycleSeconds: protocol.phases.reduce((sum, phase) => sum + phase.durationMs, 0) / 1000,
    cycleLabel: `${protocol.defaultCycles} ${protocol.defaultCycles === 1 ? "cycle" : "cycles"}`,
    durationLabel: `${Math.round(protocol.defaultDuration / 1000)} sec`,
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
    "wave",
    "general",
    "Steady, even breaths for a grounded and balanced rhythm.",
    ["coherent", "steady", "balanced", "5 by 5", "even breathing"],
  ),
  protocol(
    "extended-exhale",
    "Extended Exhale",
    ["Calm", "Sleep"],
    [phase("inhale", 4), phase("exhale", 6)],
    12,
    "wave",
    "general",
    "Longer exhales soften the system and encourage a gentle ease.",
    ["extended exhale", "long exhale", "downshift", "ease", "4 by 6"],
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
    "general",
    "Alternate nostrils and settle the mind with balanced, deliberate breath.",
    ["nadi shodhana", "alternate nostril", "switch sides", "balance", "yogic"],
  ),
  protocol(
    "bhramari",
    "Bhramari",
    ["Calm"],
    [phase("inhale", 4), phase("hum", 8)],
    6,
    "ripple",
  ),
  protocol(
    "meditation-breathing",
    "Meditation Breathing",
    ["Calm", "Sleep"],
    [phase("inhale", 6), phase("hold", 2), phase("exhale", 6), phase("hold", 2)],
    8,
    "wave",
    "general",
    "A measured calm rhythm that settles the system without forcing.",
    ["meditation breathing", "meditation", "calm breath", "6 by 2", "stillness"],
  ),
  protocol(
    "traditional-yogic",
    "Traditional Yogic",
    ["Calm", "Focus"],
    [phase("inhale", 4), phase("hold", 16), phase("exhale", 8)],
    4,
    "wave",
    "retention",
    "A classic yogic cadence that emphasizes measured retention and release.",
    ["traditional yogic", "yogic breathing", "pranayama", "4 by 16 by 8", "traditional breath"],
  ),
  protocol(
    "three-stage-breath",
    "Three-Stage Breath",
    ["Recover", "Focus"],
    [phase("inhale", 3), phase("hold", 1), phase("exhale", 5), phase("hold", 1)],
    6,
    "wave",
    "general",
    "A gradual, steady pattern to settle attention and ease tension.",
    ["three-stage breath", "three stage breath", "3 by 1 by 5 by 1", "layered breath", "stage rhythm"],
  ),
  protocol(
    "runner-rhythm",
    "Runner's Rhythm",
    ["Perform", "Recover"],
    [phase("inhale", 3), phase("exhale", 3)],
    12,
    "wave",
    "general",
    "A light, repeatable cadence for preparing the body without rushing the breath.",
    ["runner's rhythm", "runners rhythm", "running rhythm", "3 by 3", "cadence"],
  ),
  {
    ...protocol(
      "high-intensity-cyclic",
      "Stimulating Breath",
      ["Perform", "Energize"],
      [phase("inhale", 2), phase("exhale", 2)],
      3,
      "pulse",
      "highIntensity",
      "A rapid, guided breath pattern for a short energy surge under safe conditions.",
      ["stimulating breath", "power breath", "rapid breath", "energize", "surge"],
    ),
    version: 2,
    availability: "enabled",
    defaultDuration: 648000,
    durationPresets: [216000, 432000, 648000],
    plan: {
      blocks: [
        { protocolId: "high-intensity-cyclic", protocolVersion: 1, cycles: 30, phases: [phase("inhale", 2), phase("exhale", 2)] },
        { protocolId: "high-intensity-cyclic", protocolVersion: 1, cycles: 1, phases: [phase("retention", 60)] },
        { protocolId: "high-intensity-cyclic", protocolVersion: 1, cycles: 1, phases: [phase("inhale", 3), phase("hold", 15), phase("exhale", 3), phase("freeBreathing", 15)] },
      ],
    },
  },
  protocol(
    "box-2",
    "Triangle Breathing",
    ["Calm"],
    [phase("inhale", 4), phase("exhale", 4), phase("hold", 4)],
    10,
    "wave",
    "general",
  ),
  protocol(
    "measured",
    "Measured Breathing",
    ["Calm", "Focus"],
    [phase("inhale", 4), phase("hold", 1), phase("exhale", 7)],
    10,
    "wave",
    "general",
  ),
  protocol(
    "athletic",
    "Athletic Preparation",
    ["Perform"],
    [phase("inhale", 3), phase("hold", 3), phase("exhale", 6), phase("hold", 3)],
    8,
    "wave",
    "general",
  ),
  protocol(
    "endurance",
    "Endurance Pattern",
    ["Perform"],
    [phase("inhale", 4), phase("hold", 8), phase("exhale", 4)],
    6,
    "wave",
    "general",
  ),
  protocol(
    "swimmer",
    "Swimmer's Rhythm",
    ["Perform"],
    [phase("inhale", 4), phase("hold", 8), phase("exhale", 6), phase("hold", 2)],
    5,
    "wave",
    "general",
  ),
  {
    ...protocol("high-intensity-cyclic-alt", "Power Breath", ["Perform", "Energize"],
      [phase("inhale", 2), phase("exhale", 2)], 3, "pulse", "highIntensity"),
    version: 2,
    availability: "enabled",
    defaultDuration: 648000,
    durationPresets: [216000, 432000, 648000],
    plan: { blocks: [
      { protocolId: "high-intensity-cyclic-alt", protocolVersion: 2, cycles: 30, phases: [phase("inhale", 2), phase("exhale", 2)] },
      { protocolId: "high-intensity-cyclic-alt", protocolVersion: 2, cycles: 1, phases: [phase("retention", 60)] },
      { protocolId: "high-intensity-cyclic-alt", protocolVersion: 2, cycles: 1, phases: [phase("inhale", 3), phase("hold", 15), phase("exhale", 3), phase("freeBreathing", 15)] },
    ] },
  },
  {
    ...protocol("sleep-wind-down", "Sleep Wind Down", ["Sleep", "Calm"],
      [phase("inhale", 4), phase("exhale", 6)], 36, "wave", "general",
      "A gentle, slower rhythm with a longer exhale to help you settle before bedtime."),
    purpose: "Settle before bedtime",
    instructions: "Sit or lie comfortably. Inhale gently for 4 seconds, then exhale for 6 seconds without holding. Return to natural breathing whenever you need to.",
    durationPresets: [180000, 240000, 300000, 360000, 420000, 480000, 540000, 600000],
  },
  {
    ...protocol("post-workout-reset", "Post-Workout Reset", ["Recover"],
      [phase("inhale", 4), phase("exhale", 6)], 30, "wave", "general",
      "A comfortable breathing practice for the transition from exercise toward rest."),
    purpose: "Settle after exercise",
    instructions: "After your cool-down, wait until breathing is comfortable. Inhale gently for 4 seconds and exhale for 6 seconds, without holds or forcing.",
    precaution: "Wait until breathlessness has settled. This practice does not replace cool-down, hydration or medical assessment for concerning symptoms.",
    durationPresets: [180000, 240000, 300000, 360000, 420000, 480000, 540000, 600000],
  },
  {
    ...protocol("intimacy-calm", "Intimacy Calm", ["Calm"],
      [phase("inhale", 4), phase("exhale", 6)], 24, "wave", "general",
      "A discreet practice to ease situational tension and notice your breathing and arousal before intimate moments."),
    purpose: "Calm & confidence",
    instructions: "Before an intimate moment, sit comfortably. Inhale gently for 4 seconds and exhale for 6 seconds. Do not hold or suppress natural breathing during sexual activity.",
    durationPresets: [120000, 180000, 240000, 300000, 360000, 420000, 480000],
  },
];
export const cyclic = protocols.find((protocol) => protocol.id === "high-intensity-cyclic")!;
export const altCyclic = protocols.find((protocol) => protocol.id === "high-intensity-cyclic-alt")!;
export const catalogProtocolIds = [
  "sleep-wind-down",
  "post-workout-reset",
  "intimacy-calm",
  "coherent",
  "box",
  "meditation-breathing",
  "traditional-yogic",
  "equal",
  "box-2",
  "4-7-8",
  "three-stage-breath",
  "runner-rhythm",
  "high-intensity-cyclic",
  "athletic",
  "endurance",
  "swimmer",
  "measured",
] as const;
export const catalogProtocols = catalogProtocolIds.map((id) => protocols.find((protocol) => protocol.id === id)!).filter(Boolean);
export const isCyclic = (p: Pick<Protocol, "id" | "version">) => p.id === cyclic.id && p.version === cyclic.version;
export const isGuidedHighIntensity = (p: Pick<Protocol, "id" | "version">) =>
  (p.id === cyclic.id && p.version === cyclic.version) ||
  (p.id === altCyclic.id && p.version === altCyclic.version);
export const includesHighIntensity = (p: Protocol) => p.safetyCategory === "highIntensity" || p.id === cyclic.id || p.id === altCyclic.id || !!p.plan?.blocks.some(b => b.protocolId === cyclic.id || b.protocolId === altCyclic.id);
export const availableForPractice = (p: Protocol) => p.availability === "enabled" && (!includesHighIntensity(p) || isGuidedHighIntensity(p));
export const sigh = protocols.find(protocol => protocol.id === "physiological-sigh")!;
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
