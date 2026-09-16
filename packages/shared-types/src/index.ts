export type Goal =
  | "Calm"
  | "Focus"
  | "Perform"
  | "Recover"
  | "Sleep"
  | "Energize";
export type PhaseType =
  | "inhale"
  | "inhaleTopUp"
  | "hold"
  | "exhale"
  | "hum"
  | "retention"
  | "recovery"
  | "freeBreathing";
export interface Phase {
  type: PhaseType;
  durationMs: number;
  label: string;
  nostril?: "left" | "right" | "both";
  audioCue: string;
  hapticCue: "light" | "medium" | "soft";
  animationInstruction: "expand" | "topUp" | "contract" | "still" | "ripple";
}
export interface Protocol {
  plan?: SessionPlan;
  id: string;
  version: number;
  name: string;
  goalTags: Goal[];
  phases: Phase[];
  defaultCycles: number;
  defaultDuration: number;
  durationPresets: number[];
  intensity: "gentle" | "moderate" | "high";
  safetyCategory: "general" | "retention" | "highIntensity";
  animationType: "sigh" | "box" | "wave" | "alternating" | "ripple" | "pulse";
  audioConfig: { enabled: boolean };
  hapticConfig: { enabled: boolean };
  availability: "enabled" | "definitionOnly";
}
export interface SessionPlan {
  blocks: {
    protocolId: string;
    protocolVersion: number;
    phases: Phase[];
    cycles: number;
  }[];
}
export interface EngineState {
  version: 1;
  plan: SessionPlan;
  startedAt: number;
  anchorAt: number;
  elapsedAtAnchor: number;
  checkpointAt: number;
  status: "running" | "paused" | "completed" | "ended";
  pauseReason?:
    | "manual"
    | "background"
    | "interruption"
    | "recovery"
    | "clockChange";
}
export interface SessionRecord {
  protocol?: Protocol;
  id: string;
  protocolId: string;
  protocolVersion: number;
  protocolName: string;
  goal: Goal;
  engine: EngineState;
  pre: number | null;
  post: number | null;
  stage: "active" | "post" | "result";
  finishedAt: number | null;
  effect: string | null;
  endReason: "completed" | "ended" | "unwell" | null;
}
export interface Preferences {
  audio: "voice" | "tones" | "silent";
  haptics: boolean;
  keepAwake: boolean;
  favoriteProtocolIds?: string[];
  onboardingComplete?: boolean;
  pro?: boolean;
}
export function stateShift(
  pre: number | null,
  post: number | null,
): number | null {
  return pre === null || post === null ? null : pre - post;
}
export function validRating(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 10)
  );
}
