import type { Goal, SessionRecord } from "@inout/shared-types";
import { start, checkpoint } from "@inout/breathing-engine";

export const practiceGoals: Goal[] = ["Calm", "Focus", "Perform", "Recover", "Sleep", "Energize"];
export interface ManualSessionInput { goal: Goal; durationMs: number; startedAt: number }

export function manualSession(input: ManualSessionInput, id: string, now: number): SessionRecord {
  const { goal, durationMs, startedAt } = input;
  if (!practiceGoals.includes(goal)) throw new Error("Choose a breathing goal.");
  if (!Number.isSafeInteger(durationMs) || durationMs < 1000 || durationMs > 86400000)
    throw new Error("Enter a duration between 1 second and 24 hours.");
  if (!Number.isFinite(startedAt) || startedAt < 0 || startedAt + durationMs > now)
    throw new Error("The session must start and finish in the past.");
  const phases = Array.from({ length: Math.ceil(durationMs / 3600000) }, (_, i) => ({
    type: "freeBreathing" as const, durationMs: Math.min(3600000, durationMs - i * 3600000),
    label: "Logged breathing", audioCue: "", hapticCue: "soft" as const, animationInstruction: "still" as const,
  }));
  return {
    id, source: "manual", protocolId: "manual-breathing", protocolVersion: 1,
    protocolName: "Manual breathing", goal, pre: null, post: null, effect: null,
    stage: "result", endReason: "completed", finishedAt: startedAt + durationMs,
    engine: checkpoint(start({ blocks: [{ protocolId: "manual-breathing", protocolVersion: 1, phases, cycles: 1 }] }, startedAt), startedAt + durationMs),
  };
}

export function parseLocalDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Use YYYY-MM-DD and 24-hour HH:MM.");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day || value.getHours() !== hour || value.getMinutes() !== minute)
    throw new Error("Enter a valid local date and time.");
  return value.getTime();
}
