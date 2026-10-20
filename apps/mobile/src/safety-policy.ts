import { includesHighIntensity } from "@inout/protocols";
import type { Preferences, Protocol } from "@inout/shared-types";

export function mandatorySafety(protocol?: Protocol, warning?: string) {
  return !!warning || !!protocol && (includesHighIntensity(protocol) ||
    protocol.safetyCategory === "retention" ||
    [protocol.phases, ...(protocol.plan?.blocks.map(block => block.phases) ?? [])]
      .some(phases => phases.some(phase => ["hold", "retention"].includes(phase.type) && phase.durationMs >= 10000)));
}
export function showSessionSafety(preferences: Preferences, protocol?: Protocol, warning?: string) {
  return preferences.showSafetyReminders !== false || mandatorySafety(protocol, warning);
}
