import { TelemetrySink } from "./telemetry";

export function firebaseTelemetry() {
  const analytics = require("@react-native-firebase/analytics") as typeof import("@react-native-firebase/analytics");
  const crash = require("@react-native-firebase/crashlytics") as typeof import("@react-native-firebase/crashlytics");
  const instance = analytics.getAnalytics(), reports = crash.getCrashlytics();
  let enabled = false;
  const errors = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler(): (error: Error, fatal?: boolean) => void; setGlobalHandler(handler: (error: Error, fatal?: boolean) => void): void } }).ErrorUtils;
  if (errors) {
    const previous = errors.getGlobalHandler();
    errors.setGlobalHandler((error, fatal) => {
      if (enabled) {
        const sanitized = new Error("Unhandled JavaScript error");
        sanitized.stack = [sanitized.message, ...(error.stack?.split("\n").filter(line => /^\s*at /.test(line)) ?? [])].join("\n");
        try { crash.recordError(reports, sanitized); } catch { /* Preserve original error handling. */ }
      }
      previous(error, fatal);
    });
  }
  return new TelemetrySink({
    async consent(value) {
      enabled = false;
      await analytics.setConsent(instance, { analytics_storage: value, ad_storage: false, ad_user_data: false, ad_personalization: false });
      await analytics.setAnalyticsCollectionEnabled(instance, value);
      await crash.setCrashlyticsCollectionEnabled(reports, value);
      if (!value) { await analytics.resetAnalyticsData(instance); await crash.deleteUnsentReports(reports); }
      enabled = value;
    },
    async record(event, context) { await analytics.logEvent(instance, event, context); },
  });
}
