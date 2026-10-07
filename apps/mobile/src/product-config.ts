import type { Capability } from "./entitlements";

/** Rollout defaults preserve the existing Free product. No remote configuration dependency. */
export const productConfig = {
  onboardingPaywall: true,
  emphasizeAnnual: true,
  proProtocolIds: [] as string[],
  proFeatures: ["adFree", "unlimitedCustomPatterns", "unlimitedMixes", "unlimitedSavedRoutines", "advancedInsights", "advancedReminders"] as Capability[],
  guidedSessionsPerMonth: null as number | null,
  manualLogging: true,
  learn: true,
  healthMetrics: false,
  welcomeEmail: true,
  achievementThresholds: { minutes: [15, 60], sessions: [30], explorer: 5, calm: 5, sleep: 5, morning: 5, weeks: 4 },
};
