import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { buildPolicy } from "../scripts/build-policy.cjs";
import { associations } from "../scripts/build-link-associations.mjs";
import { SubscriptionService, SubscriptionError, type SubscriptionProvider } from "../apps/mobile/src/subscriptions";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { AnalyticsService } from "../apps/mobile/src/analytics";

test("release fails closed for test providers, mocks, demo ads and open gates; acceptance remains distinct", () => {
  assert.ok(buildPolicy({ EXPO_PUBLIC_SUBSCRIPTION_PROVIDER: "test" }).length);
  assert.ok(buildPolicy({ EXPO_PUBLIC_DEV_PRO: "true" }).length);
  assert.ok(buildPolicy({ EAS_BUILD_PROFILE: "store-test" }).length);
  const candidate = { EAS_BUILD_PROFILE: "store-test", EXPO_PUBLIC_EAS_PROJECT_ID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_testfixture", EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_testfixture", EXPO_PUBLIC_ADS_MODE: "test" };
  assert.deepEqual(buildPolicy(candidate), []);
  assert.ok(buildPolicy({ ...candidate, EXPO_PUBLIC_REVENUECAT_MODE: "test-store" }).length);
  assert.ok(buildPolicy({ ...candidate, EXPO_PUBLIC_REVENUECAT_TEST_KEY: "test_fixture" }).length);
  assert.ok(buildPolicy({ ...candidate, EXPO_PUBLIC_REVENUECAT_IOS_KEY: "sk_fixture" }).length);
  assert.ok(buildPolicy({ ...candidate, EAS_BUILD_PROFILE: "production" }).length);
  assert.ok(buildPolicy({ ...candidate, ADMOB_ANDROID_APP_ID: "ca-app-pub-3940256099942544~3347511713" }).length);
  const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
  assert.equal(eas.build["store-test"].distribution, "store"); assert.equal(eas.build["store-test"].android.buildType, "app-bundle");
  assert.equal(eas.build.production.env.INOUT_RELEASE, "1");
});
test("RevenueCat SDK references stay inside its adapter and generic service handles pending and restore", async () => {
  for (const root of ["apps/mobile/src", "apps/mobile/app"]) for (const name of readdirSync(root, { recursive: true }) as string[]) {
    if (!/\.tsx?$/.test(name) || name.replaceAll("\\", "/") === "subscription-providers/revenuecat.ts") continue;
    assert.doesNotMatch(readFileSync(`${root}/${name}`, "utf8"), /["']react-native-purchases["']/);
  }
  const e = new EntitlementService(false, () => 1000);
  const grant = { source: "store" as const, active: true, status: "active" as const, verifiedAt: 1000, expiresAt: 9000, graceUntil: null };
  const provider: SubscriptionProvider = { mode: "store", offers: async () => [{ id: "monthly", title: "Monthly", price: "$1", period: "month" }], refresh: async () => ({ ...grant, active: false }), purchase: async () => { throw new SubscriptionError("pending", "Pending approval"); }, restore: async () => grant, managementUrl: async () => null };
  const service = new SubscriptionService(provider, e, new AnalyticsService());
  await service.load(); await service.purchase("monthly"); assert.equal(e.state.pro, false); assert.equal(service.message, "Pending approval");
  await service.restore(); assert.equal(e.state.pro, true);
});
test("association generation rejects missing values and binds both native identities to the supplied HTTPS path", () => {
  assert.throws(() => associations({ origin: "" }));
  const result = associations({ origin: "https://example.test", path: "/reset.html", appleTeamId: "ABCDE12345", androidSha256: [Array(32).fill("AB").join(":")] });
  assert.equal(result.apple.applinks.details[0].appIDs[0], "ABCDE12345.com.imrtech.inout");
  assert.equal(result.android[0].target.package_name, "com.imrtech.inout");
});
