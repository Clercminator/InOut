export const productEvents = [
  "notification_preferences_saved", "session_reveal_viewed", "second_session_within_seven_days",
  "protocol_search_used", "protocol_search_empty", "session_interrupted",
  "first_session_started", "first_session_completed", "protocol_selected",
  "daily_reset_opened", "daily_reset_started", "daily_reset_completed", "daily_reset_repeat", "daily_reset_returned", "daily_reset_awarded", "guided_program_returned",
  "challenge_attempt_completed", "challenge_abandoned", "challenge_personal_best", "challenge_badge_earned", "challenge_share_opened", "challenge_shared", "challenge_program_joined", "challenge_program_progress", "challenge_retried",
  "challenge_list_viewed", "challenge_viewed", "challenge_started", "challenge_progressed", "challenge_completed", "challenge_share_tapped", "challenge_share_completed", "challenge_locked_tapped",
  "onboarding_goal_selected", "onboarding_value_viewed", "safety_acknowledged", "onboarding_paywall_viewed",
  "premium_lock_tapped", "free_quota_exhausted", "badge_earned", "progress_viewed", "calendar_viewed",
  "paywall_source", "streak_extended", "badge_shared", "plan_selected", "purchase_started", "purchase_success", "purchase_cancelled", "restore_started", "restore_success", "paywall_dismissed",
  "achievement_view", "achievement_share_tapped", "native_share_opened",
  "app_open", "app_first_open", "onboarding_started", "onboarding_completed", "situation_selected", "protocol_viewed", "safety_screen_viewed",
  "session_started", "session_completed", "session_abandoned", "state_before_logged", "state_after_logged",
  "custom_created", "custom_started", "mix_created", "mix_started", "mix_completed", "share_created", "share_link_copied",
  "shared_web_opened", "shared_web_started", "shared_web_completed", "shared_web_install_cta_clicked", "shared_web_app_open_clicked",
  "paywall_viewed", "trial_started", "subscription_started", "subscription_restored", "subscription_cancelled", "ad_impression", "ad_loaded", "ad_failed", "ad_consent_failed",
  "reminder_scheduled", "reminder_opened", "checkin_action", "checkin_notification_opened", "motivation_notification_opened", "achievement_notification_opened",
  "streak_milestone_earned", "external_practice_logged", "audio_mode_selected",
  "guided_program_started", "guided_program_completed", "share_result_invoked", "share_exercise_link_created", "purchase_failed",
  "pro_entitlement_activated", "pro_entitlement_expired", "ad_requested", "ad_dismissed", "ad_unavailable",
  "audio_playback_failed", "notification_schedule_failed", "share_delivery_failed", "share_link_failed",
  "theme_gallery_opened", "theme_previewed", "theme_applied", "theme_earned", "theme_locked_tapped", "theme_paywall_opened",
] as const;
export type ProductEvent = typeof productEvents[number];
export const paywallSources = ["onboarding", "profile", "protocol", "quota", "insights", "custom", "reminders", "challenges", "theme", "other"] as const;
export type PaywallSource = typeof paywallSources[number];
export const analyticsPropertyValues = {
  platform: ["android", "ios", "web"],
  locale: ["en", "es-419", "pt-BR"],
  entitlement: ["free", "pro"],
  challengeType: ["daily-reset", "plank", "wall-sit", "push-ups", "first-breath", "seven-day-calm", "sleep-reset", "focus-week", "breath-explorer", "consistency", "three-by-three"],
  acquisitionSource: ["organic", "shared-link", "campaign", "unknown"],
  outcome: ["success", "cancelled", "failed", "unavailable", "dismissed"],
  errorCategory: ["decode", "playback", "timeout", "permission", "scheduler", "delivery", "link", "unknown"],
} as const;
export interface ProductEventProperties {
  platform?: typeof analyticsPropertyValues.platform[number];
  appVersion?: string;
  locale?: typeof analyticsPropertyValues.locale[number];
  entitlement?: typeof analyticsPropertyValues.entitlement[number];
  challengeType?: typeof analyticsPropertyValues.challengeType[number];
  acquisitionSource?: typeof analyticsPropertyValues.acquisitionSource[number];
  outcome?: typeof analyticsPropertyValues.outcome[number];
  errorCategory?: typeof analyticsPropertyValues.errorCategory[number];
  source?: PaywallSource;
}
export interface AnalyticsSink { readonly collectionReady?: boolean; record(event: ProductEvent, properties?: ProductEventProperties): void; setConsent?(enabled: boolean): Promise<void>; }

function safeProperties(value: ProductEventProperties | undefined): ProductEventProperties | undefined {
  if (!value || typeof value !== "object") return undefined;
  const safe: ProductEventProperties = {};
  if (analyticsPropertyValues.platform.includes(value.platform as typeof analyticsPropertyValues.platform[number])) safe.platform = value.platform;
  if (typeof value.appVersion === "string" && /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[-+][A-Za-z0-9.-]{1,24})?$/.test(value.appVersion)) safe.appVersion = value.appVersion;
  if (analyticsPropertyValues.locale.includes(value.locale as typeof analyticsPropertyValues.locale[number])) safe.locale = value.locale;
  if (analyticsPropertyValues.entitlement.includes(value.entitlement as typeof analyticsPropertyValues.entitlement[number])) safe.entitlement = value.entitlement;
  if (analyticsPropertyValues.challengeType.includes(value.challengeType as typeof analyticsPropertyValues.challengeType[number])) safe.challengeType = value.challengeType;
  if (analyticsPropertyValues.acquisitionSource.includes(value.acquisitionSource as typeof analyticsPropertyValues.acquisitionSource[number])) safe.acquisitionSource = value.acquisitionSource;
  if (analyticsPropertyValues.outcome.includes(value.outcome as typeof analyticsPropertyValues.outcome[number])) safe.outcome = value.outcome;
  if (analyticsPropertyValues.errorCategory.includes(value.errorCategory as typeof analyticsPropertyValues.errorCategory[number])) safe.errorCategory = value.errorCategory;
  if (paywallSources.includes(value.source as PaywallSource)) safe.source = value.source;
  return Object.keys(safe).length ? safe : undefined;
}

// Only the finite paywall source is accepted as context; ratings, free text and identifiers are excluded.
export class AnalyticsService {
  constructor(private sink?: AnalyticsSink) {}
  get remoteReady() { return this.sink?.collectionReady === true; }
  get remoteAvailable() { return !!this.sink?.setConsent; }
  setConsent(enabled: boolean): Promise<void> { return this.sink?.setConsent?.(enabled) ?? Promise.resolve(); }
  paywallSource(value: string) {
    const source = paywallSources.includes(value as PaywallSource) ? value as PaywallSource : "other";
    try { this.sink?.record("paywall_source", { source }); } catch { /* No measurement may block practice. */ }
  }
  track(event: ProductEvent, properties?: ProductEventProperties) {
    if (!productEvents.includes(event)) return;
    const safe = safeProperties(properties);
    try {
      if (safe) this.sink?.record(event, safe);
      else this.sink?.record(event);
    } catch { /* Measurement never blocks practice. */ }
  }
}
