import type { PracticeGoal } from "@inout/shared-types";
import { coachProtocolIds, type CoachRecommendation } from "./coach";
import { practiceGoals } from "./personalization";

export const aiExplanationCodes = ["goal", "familiar", "short", "return"] as const;
export const aiSummaryCodes = ["begin", "continue", "rest"] as const;
export interface CoachAiOutput {
  goal: PracticeGoal;
  protocolId: typeof coachProtocolIds[number];
  explanationCode: typeof aiExplanationCodes[number];
  summaryCode: typeof aiSummaryCodes[number];
}
export interface CoachAiRequest {
  purpose: "interpret-goal" | "explain" | "weekly-review";
  locale: "en" | "es" | "pt";
  goal: PracticeGoal;
  protocolId: typeof coachProtocolIds[number];
  goalText?: string;
  summary?: { sessions: number; minutes: number; days: number };
  // Only a coarse category, never ratings, notes, identity, history, or device identifiers.
  checkIn?: "comfortable" | "shorter-preferred";
}
export function validateCoachAiOutput(value: unknown, recommended: CoachRecommendation): CoachAiOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = value as CoachAiOutput;
  const keys = Object.keys(out).sort().join(",");
  if (keys !== "explanationCode,goal,protocolId,summaryCode" || !practiceGoals.includes(out.goal) || !coachProtocolIds.includes(out.protocolId) || out.protocolId !== recommended.protocolId ||
    !aiExplanationCodes.includes(out.explanationCode) || !aiSummaryCodes.includes(out.summaryCode)) return null;
  // The model selects reviewed phrasing, never free-form medical advice or parameters.
  return { goal: out.goal, protocolId: out.protocolId, explanationCode: out.explanationCode, summaryCode: out.summaryCode };
}
export interface CoachAiDependencies {
  enabled: () => boolean;
  hasAccess: () => boolean;
  /** Must call a server that independently enforces entitlement, daily cost caps and rate limits. Never OpenRouter from the app. */
  transport?: (request: CoachAiRequest, signal: AbortSignal) => Promise<{ status: number; body: unknown }>;
  quota: { read: () => { day: string; requests: number }; write: (value: { day: string; requests: number }) => void };
  now?: () => number;
}
export function createCoachAiAdapter(deps: CoachAiDependencies) {
  let inFlight = false;
  return async (input: {
    recommendation: CoachRecommendation; purpose: CoachAiRequest["purpose"]; locale: CoachAiRequest["locale"];
    consent: { ai: boolean; checkIns: boolean }; goalText?: string; summary?: CoachAiRequest["summary"]; checkIn?: CoachAiRequest["checkIn"];
  }): Promise<{ source: "local" | "ai"; value: CoachAiOutput; reason?: string }> => {
    const fallback = (reason: string) => ({ source: "local" as const, reason, value: {
      goal: input.recommendation.goal, protocolId: input.recommendation.protocolId, explanationCode: "goal" as const, summaryCode: "continue" as const,
    } });
    if (!deps.enabled() || !deps.transport) return fallback("disabled");
    if (!deps.hasAccess()) return fallback("access");
    if (!input.consent.ai) return fallback("consent");
    if (inFlight) return fallback("busy");
    const day = new Date((deps.now ?? Date.now)()).toISOString().slice(0, 10);
    try {
      const used = deps.quota.read();
      if (!Number.isInteger(used.requests) || used.requests < 0 || used.day > day || (used.day === day && used.requests >= 3)) return fallback("limit");
      deps.quota.write({ day, requests: used.day === day ? used.requests + 1 : 1 });
    } catch { return fallback("quota"); }
    inFlight = true;
    const abort = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const request: CoachAiRequest = { purpose: input.purpose, locale: input.locale, goal: input.recommendation.goal, protocolId: input.recommendation.protocolId };
      if (input.purpose === "interpret-goal" && input.goalText) request.goalText = input.goalText.slice(0, 240);
      if (input.purpose === "weekly-review" && input.summary) request.summary = {
        sessions: Math.max(0, Math.min(100, Math.floor(input.summary.sessions) || 0)),
        minutes: Math.max(0, Math.min(1000, Math.floor(input.summary.minutes) || 0)),
        days: Math.max(0, Math.min(7, Math.floor(input.summary.days) || 0)),
      };
      if (input.consent.checkIns && ["comfortable", "shorter-preferred"].includes(input.checkIn ?? "")) request.checkIn = input.checkIn;
      const response = await Promise.race([
        deps.transport(request, abort.signal),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => { abort.abort(); reject(Error("timeout")); }, 5000); }),
      ]);
      if (response.status !== 200) return fallback(response.status === 429 ? "limit" : "network");
      const output = validateCoachAiOutput(response.body, input.recommendation);
      return output ? { source: "ai", value: output } : fallback("invalid-output");
    } catch { return fallback("network"); }
    finally { clearTimeout(timeout); abort.abort(); inFlight = false; }
  };
}
