import { TelemetrySink } from "./telemetry";

// Error messages, URLs and arbitrary stack text can contain user data.
export function sanitizedFailure(error: Error) {
  const safe = new Error("Unhandled JavaScript error");
  const locations = error.stack?.split("\n").flatMap(line => {
    const match = line.match(/(?:index\.android\.bundle|main\.jsbundle|index\.bundle|address at [^:]+):(\d+):(\d+)\)?$/);
    return match ? [`    at app (bundle:${match[1]}:${match[2]})`] : [];
  }) ?? [];
  safe.stack = [safe.message, ...locations].join("\n");
  return safe;
}

let singleton: TelemetrySink | undefined;
export function firebaseTelemetry() {
  if (singleton) return singleton;
  const errors = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler(): (error: Error, fatal?: boolean) => void; setGlobalHandler(handler: (error: Error, fatal?: boolean) => void): void } }).ErrorUtils;
  // Capture before getCrashlytics installs its own JS handler.
  const previous = errors?.getGlobalHandler();
  const analytics = require("@react-native-firebase/analytics") as typeof import("@react-native-firebase/analytics");
  const crash = require("@react-native-firebase/crashlytics") as typeof import("@react-native-firebase/crashlytics");
  const instance = analytics.getAnalytics(), reports = crash.getCrashlytics();
  let enabled = false, requested = false;
  const report = (error: Error) => {
    if (!enabled || !requested) return;
    try { crash.recordError(reports, sanitizedFailure(error)); } catch { /* Never disrupt practice. */ }
  };
  if (errors && previous) errors.setGlobalHandler((error, fatal) => { report(error); previous(error, fatal); });
  // RNFirebase 26 installs a promise handler that records raw errors even before opt-in.
  // Replace that same promise-library handler with our consent-gated, sanitized callback.
  const tracking = require("promise/setimmediate/rejection-tracking");
  tracking.enable({ allRejections: true, onUnhandled: (_id: number, error: Error) => report(error) });
  const disable = async () => {
    const results = await Promise.allSettled([
      () => analytics.setConsent(instance, { analytics_storage: false, ad_storage: false, ad_user_data: false, ad_personalization: false }),
      () => analytics.setAnalyticsCollectionEnabled(instance, false),
      () => crash.setCrashlyticsCollectionEnabled(reports, false),
    ].map(operation => Promise.resolve().then(operation)));
    const cleanup = await Promise.allSettled([() => analytics.resetAnalyticsData(instance), () => crash.deleteUnsentReports(reports)].map(operation => Promise.resolve().then(operation)));
    if ([...results, ...cleanup].some(result => result.status === "rejected")) throw new Error("Telemetry withdrawal failed");
  };
  singleton = new TelemetrySink({
    requestedConsent(value) { requested = value; if (!value) enabled = false; },
    async consent(value) {
      enabled = false;
      if (!value) { await disable(); return; }
      try {
        // Discard reports accumulated without consent before enabling upload.
        await crash.deleteUnsentReports(reports);
        await analytics.setConsent(instance, { analytics_storage: true, ad_storage: false, ad_user_data: false, ad_personalization: false });
        await analytics.setAnalyticsCollectionEnabled(instance, true);
        await crash.setCrashlyticsCollectionEnabled(reports, true);
        enabled = requested;
      } catch (error) {
        await disable().catch(() => {});
        throw error;
      }
    },
    async record(event, context) { if (enabled && requested) await analytics.logEvent(instance, event, context); },
  });
  return singleton;
}
