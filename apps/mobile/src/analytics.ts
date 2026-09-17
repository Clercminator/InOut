export const productEvents = [
  "app_open", "onboarding_started", "onboarding_completed", "situation_selected", "protocol_opened",
  "protocol_started", "protocol_completed", "protocol_abandoned", "state_shift_pre_recorded", "state_shift_post_recorded",
  "custom_created", "custom_started", "mix_created", "mix_started", "mix_completed", "share_created", "share_link_copied",
  "shared_web_opened", "shared_web_started", "shared_web_completed", "shared_web_install_cta_clicked",
  "paywall_viewed", "trial_started", "subscription_started", "subscription_restored", "subscription_cancelled", "ad_impression",
] as const;
export type ProductEvent = typeof productEvents[number];
export interface AnalyticsSink { record(event: ProductEvent): void; }
// Deliberately accepts no payload: no ratings, routine content, goal or identifier can leak through this API.
export class AnalyticsService {
  constructor(private sink?: AnalyticsSink) {}
  track(event: ProductEvent) {
    if (!productEvents.includes(event)) return;
    try { this.sink?.record(event); } catch { /* Measurement never blocks practice. */ }
  }
}
