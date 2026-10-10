import type { Capability } from "./entitlements";

/** Rollout defaults preserve the existing Free product. No remote configuration dependency. */
export const productConfig = {
  proChallengeIds: ["sleep-reset", "focus-week", "consistency", "comfort-hold", "beat-your-best"] as string[],
  disabledChallengeIds: [] as string[],
  onboardingPaywall: true,
  emphasizeAnnual: true,
  defaultPlan: "monthly" as "monthly" | "annual",
  planOrder: ["weekly", "monthly", "annual"] as const,
  interstitial: { everyCompletions: 3, minAppAgeMs: 180000, cooldownMs: 600000, paywallCooldownMs: 300000, maxPerDay: 2 },
  proProtocolIds: [] as string[],
  proFeatures: ["adFree", "unlimitedCustomPatterns", "unlimitedMixes", "unlimitedSavedRoutines", "advancedInsights", "advancedReminders"] as Capability[],
  guidedSessionsPerMonth: null as number | null,
  manualLogging: true,
  learn: true,
  healthMetrics: false,
  welcomeEmail: true,
  achievementThresholds: { minutes: [15, 60], sessions: [30], explorer: 5, calm: 5, sleep: 5, morning: 5, weeks: 4 },
};
