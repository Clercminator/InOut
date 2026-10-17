import test from "node:test";
import assert from "node:assert/strict";
import { TelemetrySink } from "../apps/mobile/src/telemetry";
import { AnalyticsService, productEvents } from "../apps/mobile/src/analytics";
import { readFileSync } from "node:fs";

test("remote measurement requires consent, omits ratings, and suppresses events immediately on withdrawal", async () => {
  const records: unknown[] = [], choices: boolean[] = [];
  const sink = new TelemetrySink({ consent: async enabled => { choices.push(enabled); }, record: async (...args) => { records.push(args); } });
  const analytics = new AnalyticsService(sink);
  analytics.track("session_completed"); assert.deepEqual(records, []);
  await sink.setConsent(true);
  analytics.track("state_before_logged"); analytics.track("state_after_logged");
  (analytics.track as Function)("session_completed", { rating: 4, name: "private" });
  assert.deepEqual(records, [["app_open"], ["session_completed", undefined]]);
  await sink.setConsent(true); assert.deepEqual(choices, [true]);
  const off = sink.setConsent(false); analytics.track("session_completed"); await off;
  assert.equal(records.length, 2); assert.deepEqual(choices, [true, false]);
});
test("failed consent initialization is silent, fails closed, and can retry", async () => {
  let fail = true, count = 0;
  const sink = new TelemetrySink({ consent: async () => { if (fail) throw Error("offline"); }, record: async () => { count++; } });
  await sink.setConsent(true); sink.record("session_completed"); assert.equal(count, 0);
  fail = false; await sink.setConsent(true); sink.record("session_completed"); assert.equal(count, 2);
});
test("native collection, advertising identifiers and automatic screen reporting default off", () => {
  const config = JSON.parse(readFileSync("apps/mobile/firebase.json", "utf8"))["react-native"];
  for (const key of ["analytics_auto_collection_enabled", "crashlytics_auto_collection_enabled", "analytics_default_allow_ad_user_data", "analytics_default_allow_ad_storage", "google_analytics_adid_collection_enabled", "google_analytics_automatic_screen_reporting_enabled", "crashlytics_is_error_generation_on_js_crash_enabled"]) assert.equal(config[key], false, key);
});
test("event properties keep only bounded, non-sensitive dimensions", () => {
  const records: unknown[] = [];
  const analytics = new AnalyticsService({ record: (...args) => { records.push(args); } });
  (analytics.track as Function)("session_completed", {
    platform: "android", appVersion: "1.1.0", locale: "es-419", entitlement: "free",
    outcome: "success", rating: 8, note: "private", email: "person@example.com", sessionId: "local-id",
  });
  assert.deepEqual(records, [["session_completed", {
    platform: "android", appVersion: "1.1.0", locale: "es-419", entitlement: "free", outcome: "success",
  }]]);
  assert.equal(productEvents.includes("safety_screen_viewed"), true);
  assert.equal(productEvents.includes("audio_playback_failed"), true);
  assert.equal(productEvents.includes("challenge_started"), true);
});
