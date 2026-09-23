import type { Phase } from "@inout/shared-types";

export const smoothBreath = (progress: number) => {
  const p = Math.max(0, Math.min(1, progress));
  return p * p * (3 - 2 * p);
};

/** The same phase geometry drives sight, sound and touch. No independent breath clock. */
export function breathingGuidance(phases: Phase[], index: number, elapsedMs = 0) {
  const phase = phases[index];
  const active = (offset: number) => {
    for (let step = 1; step <= phases.length; step++) {
      const i = (index + offset * step + phases.length * step) % phases.length;
      if (phases[i].durationMs > 0) return phases[i];
    }
    return phase;
  };
  const next = active(1);
  let previousVolume = 0;
  for (let step = 1; step <= phases.length; step++) {
    const i = (index - step + phases.length) % phases.length;
    const previous = phases[i];
    if (!previous.durationMs) continue;
    if (previous.type === "exhale" || previous.type === "hum") break;
    if (previous.type === "inhaleTopUp") { previousVolume = 1; break; }
    if (previous.type === "inhale") {
      previousVolume = phase.type === "inhaleTopUp" ? 0.78 : 1;
      break;
    }
    if (previous.type === "freeBreathing" || previous.type === "recovery") break;
  }
  const inward = phase.type === "inhale" || phase.type === "inhaleTopUp";
  const outward = phase.type === "exhale" || phase.type === "hum";
  const holding = phase.type === "hold" || phase.type === "retention";
  const full = holding && previousVolume > 0;
  const from = inward ? (phase.type === "inhaleTopUp" ? previousVolume : 0) : outward ? 1 : previousVolume;
  const to = inward ? (next.type === "inhaleTopUp" ? 0.78 : 1) : outward ? 0 : from;
  const progress = Math.max(0, Math.min(1, elapsedMs / Math.max(1, phase.durationMs)));
  const volume = from + (to - from) * smoothBreath(progress);
  const label = holding ? full ? "Hold after inhale" : "Hold after exhale"
    : phase.type === "inhaleTopUp" ? "Sip in a little more" : phase.label;
  const texture: "in" | "out" | "hum" | null = inward ? "in" : phase.type === "hum" ? "hum" : outward ? "out" : null;
  // Fade airflow at both boundaries; holds never play an airflow texture.
  const envelope = texture ? 0.5 * Math.sin(Math.PI * progress) ** 0.65 : 0;
  const pulseEveryMs = holding ? 2000 : 1000;
  const pulseOffsets = inward ? [0, 200] : outward ? [0] : holding ? full ? [0, 200, 400] : [0, 600] : [];
  const beat = Math.floor(elapsedMs / pulseEveryMs);
  const offset = elapsedMs % pulseEveryMs;
  const pulseIndex = pulseOffsets.findIndex(time => offset >= time && offset - time < 150);
  return {
    label, from, to, volume, progress, inward, outward, holding, full, texture, envelope,
    pulseKey: pulseIndex < 0 ? null : `${beat}:${pulseIndex}`,
    touch: inward ? "Two quick taps: breathe in" : outward ? "One tap: breathe out"
      : holding ? full ? "Three quick taps: hold after inhale" : "Two spaced taps: hold after exhale" : "Breathe at your own pace",
    instruction: inward ? phase.type === "inhaleTopUp" ? "A small, gentle top-up" : "Let the breath flow in"
      : outward ? phase.type === "hum" ? "Hum softly as you breathe out" : "Let the breath flow out"
        : holding ? "Rest here without straining" : "Let your breathing settle naturally",
  };
}

