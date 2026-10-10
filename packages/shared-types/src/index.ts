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
  challengeTest?: "state-shift-60";
  guidedQuota?: boolean;
  voiceAllowed?: boolean;
  note?: string;
  safetyConfirmed?: boolean;
  source?: "app" | "manual";
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
  /** Calendar date captured when completion is saved, before optional reflection or travel. */
  completionLocalDay?: string;
  effect: string | null;
  endReason: "completed" | "ended" | "unwell" | null;
}
export interface Preferences {
  welcomeEmail?: { email: string; consentAt: number; status: "pending" | "sent" | "review" };
  journey?: OnboardingJourney;
  theme?: "system" | "light" | "dark";
  language?: "en" | "es" | "pt";
  experience?: Experience;
  audio: "voice" | "tones" | "silent";
  haptics: boolean;
  hapticMode?: "transitions" | "rhythm";
  keepAwake: boolean;
  favoriteProtocolIds?: string[];
  onboardingComplete?: boolean;
  pro?: boolean;
}
export type PracticeGoal = "stress" | "sleep" | "focus" | "performance" | "energy" | "pressure" | "learn";
export interface OnboardingJourney {
  version: 1;
  step: "welcome" | "goals" | "value" | "safety" | "offer" | "complete";
  primaryGoal?: PracticeGoal;
  secondaryGoals: PracticeGoal[];
  safetyAcceptedAt?: number;
  completedAt?: number;
  quickStart?: boolean;
}
export interface Experience {
  name: string;
  bio: string;
  intention: string;
  avatar: "spa" | "air" | "nightlight" | "wb-sunny";
  photo?: string;
  pinnedBadges: string[];
  weeklyGoal: number;
  palette: "sky" | "mint" | "dusk" | "sunrise";
  texture: "glass" | "halo" | "orbit";
  background: "midnight" | "deep-sea" | "plum";
  frame: "simple" | "glow" | "laurel";
  celebration: "quiet" | "gentle" | "playful";
  celebrationStyle: "sparks" | "confetti";
  chime: "bell" | "bloom" | "off";
  breathSound: "air" | "ocean" | "warm";
  guidanceVolume: number;
  celebrationVolume: number;
  favoriteRitualId?: string;
  rituals: PersonalRitual[];
}
export interface PersonalRitual {
  id: string;
  name: string;
  protocol: Protocol;
  cycles: number;
  audio: Preferences["audio"];
  appearance: Pick<Experience, "palette" | "texture" | "background" | "breathSound" | "guidanceVolume">;
}
export interface SavedRoutine {
  id: string;
  kind: "pattern" | "mix";
  protocol: Protocol;
  updatedAt: number;
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
