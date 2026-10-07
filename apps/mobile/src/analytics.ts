export const productEvents = [
  "onboarding_goal_selected", "onboarding_value_viewed", "safety_acknowledged", "onboarding_paywall_viewed",
  "premium_lock_tapped", "free_quota_exhausted", "badge_earned", "progress_viewed", "calendar_viewed",
  "paywall_source", "streak_extended", "badge_shared", "plan_selected", "purchase_started", "purchase_success", "purchase_cancelled", "restore_started", "restore_success", "paywall_dismissed",
  "achievement_view", "achievement_share_tapped", "native_share_opened",
  "app_open", "onboarding_started", "onboarding_completed", "situation_selected", "protocol_viewed",
  "session_started", "session_completed", "session_abandoned", "state_before_logged", "state_after_logged",
  "custom_created", "custom_started", "mix_created", "mix_started", "mix_completed", "share_created", "share_link_copied",
  "shared_web_opened", "shared_web_started", "shared_web_completed", "shared_web_install_cta_clicked", "shared_web_app_open_clicked",
  "paywall_viewed", "trial_started", "subscription_started", "subscription_restored", "subscription_cancelled", "ad_impression",
] as const;
export type ProductEvent = typeof productEvents[number];
export const paywallSources = ["onboarding", "profile", "protocol", "quota", "insights", "custom", "reminders", "other"] as const;
export type PaywallSource = typeof paywallSources[number];
export interface AnalyticsSink { record(event: ProductEvent, context?: { source: PaywallSource }): void; }
// Only the finite paywall source is accepted as context; ratings, free text and identifiers are excluded.
export class AnalyticsService {
  constructor(private sink?: AnalyticsSink) {}
  paywallSource(value: string) {
    const source = paywallSources.includes(value as PaywallSource) ? value as PaywallSource : "other";
    try { this.sink?.record("paywall_source", { source }); } catch { /* No measurement may block practice. */ }
  }
  track(event: ProductEvent) {
    if (!productEvents.includes(event)) return;
    try { this.sink?.record(event); } catch { /* Measurement never blocks practice. */ }
  }
}
