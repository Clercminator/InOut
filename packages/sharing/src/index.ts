import type { PhaseType, Protocol, SessionPlan } from "@inout/shared-types";
import { includesHighIntensity, planFor } from "@inout/protocols";
import { totalDuration, validatePlan } from "@inout/breathing-engine";

const labels = { inhale: "Inhale", inhaleTopUp: "Top up", hold: "Hold", exhale: "Exhale", hum: "Hum", freeBreathing: "Breathe naturally" } as const;
type SharedType = keyof typeof labels;
type SharedPhase = [SharedType, number, ("left" | "right" | "both")?];
export interface SharedPractice { v: 1; blocks: { cycles: number; phases: SharedPhase[] }[] }
export const maxShareLength = 12000;
export function validateShare(value: unknown): SharedPractice {
  const fail = () => { throw new Error("This exercise link is invalid or unsupported."); };
  if (!value || typeof value !== "object") return fail();
  const item = value as SharedPractice;
  if (item.v !== 1 || !Array.isArray(item.blocks) || !item.blocks.length || item.blocks.length > 20) return fail();
  let duration = 0;
  const blocks = item.blocks.map(block => {
    if (!block || !Number.isInteger(block.cycles) || block.cycles < 1 || block.cycles > 100 ||
      !Array.isArray(block.phases) || !block.phases.length || block.phases.length > 20) return fail();
    let cycle = 0;
    const phases = block.phases.map(phase => {
      if (!Array.isArray(phase) || (phase.length !== 2 && phase.length !== 3) || !Object.hasOwn(labels, phase[0]) || !Number.isInteger(phase[1]) || phase[1] < (phase[0] === "hold" ? 0 : 1000) || phase[1] > 60000) return fail();
      if (phase[2] !== undefined && !["left", "right", "both"].includes(phase[2])) return fail();
      cycle += phase[1];
      return (phase[2] ? [phase[0], phase[1], phase[2]] : [phase[0], phase[1]]) as SharedPhase;
    });
    if (!cycle || !phases.some(p => ["exhale", "hum", "freeBreathing"].includes(p[0]))) return fail();
    duration += cycle * block.cycles;
    return { cycles: block.cycles, phases };
  });
  if (duration > 30 * 60 * 1000) return fail();
  return { v: 1, blocks };
}
export function shareSnapshot(protocol: Protocol): SharedPractice {
  if (includesHighIntensity(protocol)) throw new Error("High-intensity practices cannot be shared as browser exercises.");
  return validateShare({ v: 1, blocks: planFor(protocol).blocks.map(b => ({ cycles: b.cycles, phases: b.phases.map(p => p.nostril ? [p.type, p.durationMs, p.nostril] : [p.type, p.durationMs]) })) });
}
export function encodeShare(snapshot: SharedPractice) {
  const encoded = encodeURIComponent(JSON.stringify(validateShare(snapshot)));
  if (encoded.length > maxShareLength) throw new Error("This exercise is too large to share. Try a shorter pattern or mix.");
  return encoded;
}
export function decodeShare(encoded: string) {
  if (!encoded || encoded.length > maxShareLength) throw new Error("This exercise link is invalid or unsupported.");
  try { return validateShare(JSON.parse(decodeURIComponent(encoded))); }
  catch { throw new Error("This exercise link is invalid or unsupported."); }
}
export function sharedProtocol(value: SharedPractice): Protocol {
  const item = validateShare(value);
  const plan: SessionPlan = { blocks: item.blocks.map((b, index) => ({ protocolId: `shared-${index}`, protocolVersion: 1, cycles: b.cycles,
    phases: b.phases.map(([type, durationMs, nostril]) => ({ type: type as PhaseType, durationMs, nostril, label: labels[type], audioCue: labels[type], hapticCue: "soft", animationInstruction: "still" })),
  })) };
  validatePlan(plan);
  const duration = totalDuration(plan);
  return { id: "shared-practice", version: 1, name: "Shared breathing practice", goalTags: ["Calm"], phases: plan.blocks[0].phases, plan,
    defaultCycles: 1, defaultDuration: duration, durationPresets: [duration], intensity: "gentle",
    safetyCategory: plan.blocks.some(b => b.phases.some(p => p.type === "hold")) ? "retention" : "general",
    animationType: "wave", audioConfig: { enabled: true }, hapticConfig: { enabled: true }, availability: "enabled" };
}
