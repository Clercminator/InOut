import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { buildPolicy } from "../scripts/build-policy.cjs";
import { associations } from "../scripts/build-link-associations.mjs";
import { SubscriptionService, SubscriptionError, type SubscriptionProvider } from "../apps/mobile/src/subscriptions";
import { EntitlementService } from "../apps/mobile/src/entitlements";
import { AnalyticsService } from "../apps/mobile/src/analytics";
import { advertisingMode } from "../apps/mobile/src/monetization";
import mobileConfig from "../apps/mobile/app.config";

test("live ads require both a production build marker and a non-development runtime", () => {
  for (const profile of ["development", "preview", "store-test", "simulator"])
    assert.ok(buildPolicy({ EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_ADS_MODE: "live" }).length);
  assert.equal(advertisingMode(true, true, "live", "production"), "test");
  assert.equal(advertisingMode(true, false, "live", "test"), "test");
  assert.equal(advertisingMode(true, false, "live"), "test");
  assert.equal(advertisingMode(true, false, "live", "production"), "live");
  assert.equal(advertisingMode(false, false, "live", "production"), "preview");
});

test("release fails closed for test providers, mocks, demo ads and open gates; acceptance remains distinct", () => {
  assert.ok(buildPolicy({ EXPO_PUBLIC_SUBSCRIPTION_PROVIDER: "test" }).length);
  assert.ok(buildPolicy({ EXPO_PUBLIC_DEV_PRO: "true" }).length);
  assert.ok(buildPolicy({ EAS_BUILD_PROFILE: "store-test" }).length);
  const candidate = { EAS_BUILD_PROFILE: "store-test", EXPO_PUBLIC_EAS_PROJECT_ID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_testfixture", EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_testfixture", EXPO_PUBLIC_ADS_MODE: "test" };
  assert.deepEqual(buildPolicy(candidate), []);
  assert.deepEqual(buildPolicy({ ...candidate, EAS_BUILD_PLATFORM: "android", EXPO_PUBLIC_REVENUECAT_IOS_KEY: undefined }), []);
  assert.ok(buildPolicy({ ...candidate, EAS_BUILD_PLATFORM: "android", EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: undefined }).length);
  assert.ok(buildPolicy({ ...candidate, EXPO_PUBLIC_REVENUECAT_MODE: "test-store" }).length);
  assert.ok(buildPolicy({ ...candidate, EXPO_PUBLIC_REVENUECAT_TEST_KEY: "test_fixture" }).length);
  assert.ok(buildPolicy({ ...candidate, EXPO_PUBLIC_REVENUECAT_IOS_KEY: "sk_fixture" }).length);
  assert.ok(buildPolicy({ ...candidate, EAS_BUILD_PROFILE: "production" }).length);
  assert.ok(buildPolicy({ ...candidate, ADMOB_ANDROID_APP_ID: "ca-app-pub-3940256099942544~3347511713" }).length);
  const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
  assert.equal(eas.build["store-test"].distribution, "store"); assert.equal(eas.build["store-test"].android.buildType, "app-bundle");
  const app = JSON.parse(readFileSync("apps/mobile/app.json", "utf8")).expo;
  assert.equal(app.version, "1.2.2");
  assert.equal(app.android.versionCode, 8);
  assert.equal(eas.build.production.autoIncrement, false);
  assert.match(readFileSync("apps/mobile/app.config.ts", "utf8"), /enableMinifyInReleaseBuilds:\s*true/);
  assert.equal(eas.build["store-test"].android.buildArtifactPaths[0], "android/app/build/outputs/mapping/release/**");
  assert.deepEqual(eas.build["store-test"].android.buildArtifactPaths, [
    "android/app/build/outputs/mapping/release/**",
    "android/app/build/{outputs/native-debug-symbols,intermediates/native_symbol_tables}/release/**",
    "android/app/build/generated/sourcemaps/react/release/**",
  ]);
  assert.deepEqual(eas.build.production.android.buildArtifactPaths, eas.build["store-test"].android.buildArtifactPaths);
  assert.equal(eas.build.production.env.INOUT_RELEASE, "1");
});
test("artifact generation preserves production configuration checks and does not approve release", () => {
  const env = { EAS_BUILD_PROFILE: "production", INOUT_RELEASE: "1", INOUT_ARTIFACT_ONLY: "1", EXPO_PUBLIC_EAS_PROJECT_ID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_testfixture", EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_testfixture", EXPO_PUBLIC_ADS_MODE: "live" };
  assert.deepEqual(buildPolicy(env, {}, "draft-commercial-v1", { artifactOnly: true }), []);
  assert.ok(buildPolicy(env, {}, "draft-commercial-v1").some((error: string) => error.includes("Commercial launch gate")));
  for (const invalid of [{ EXPO_PUBLIC_ADS_MODE: "test" }, { EXPO_PUBLIC_REVENUECAT_TEST_KEY: "test_fixture" }, { EXPO_PUBLIC_REVENUECAT_IOS_KEY: "" }, { EXPO_PUBLIC_DEV_PRO: "true" }]) {
    assert.ok(buildPolicy({ ...env, ...invalid }, {}, "draft-commercial-v1", { artifactOnly: true }).length);
  }
  const childEnv = { ...process.env, ...env, EXPO_NO_DOTENV: "1" };
  const artifact = spawnSync(process.execPath, ["scripts/eas-release-check.mjs"], { env: childEnv, encoding: "utf8" });
  assert.equal(artifact.status, 0, artifact.stderr);
  const release = spawnSync(process.execPath, ["scripts/check-release.mjs"], { env: childEnv, encoding: "utf8" });
  assert.equal(release.status, 1);
  assert.match(release.stderr, /Commercial launch gate is open/);
});

test("Firebase configuration from Android cannot activate the unconfigured iOS plugin", () => {
  const previous = { ...process.env };
  try {
    delete process.env.INOUT_RELEASE; delete process.env.EAS_BUILD_PROFILE; delete process.env.INOUT_PREVIEW;
    delete process.env.EXPO_PUBLIC_ADS_MODE; delete process.env.GOOGLE_SERVICES_PLIST;
    process.env.GOOGLE_SERVICES_JSON = "/private/android-google-services.json";
    process.env.EAS_BUILD_PLATFORM = "ios";
    const context = { config: { name: "IN/OUT", slug: "inout" }, projectRoot: process.cwd(), staticConfigPath: null, packageJsonPath: null };
    assert.equal(mobileConfig(context).plugins.includes("@react-native-firebase/app"), false);
    process.env.EAS_BUILD_PLATFORM = "android";
    assert.equal(mobileConfig(context).plugins.includes("@react-native-firebase/app"), true);
    process.env.EAS_BUILD_PLATFORM = "ios";
    process.env.GOOGLE_SERVICES_PLIST = "/private/GoogleService-Info.plist";
    assert.equal(mobileConfig(context).plugins.includes("@react-native-firebase/app"), true);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("RevenueCat runtime billing calls stay inside its adapter and generic service handles pending and restore", async () => {
  for (const root of ["apps/mobile/src", "apps/mobile/app"]) for (const name of readdirSync(root, { recursive: true }) as string[]) {
    if (!/\.tsx?$/.test(name) || name.replaceAll("\\", "/") === "subscription-providers/revenuecat.ts") continue;
    const runtimeSource = readFileSync(`${root}/${name}`, "utf8").replace(/^import type .*?;\r?\n/gm, "");
    assert.doesNotMatch(runtimeSource, /["']react-native-purchases["']/);
  }
  const e = new EntitlementService(false, () => 1000);
  const grant = { source: "store" as const, active: true, status: "active" as const, verifiedAt: 1000, expiresAt: 9000, graceUntil: null };
  const provider: SubscriptionProvider = { mode: "store", offers: async () => [{ id: "monthly", title: "Monthly", price: "$1", period: "month" }], refresh: async () => ({ ...grant, active: false }), purchase: async () => { throw new SubscriptionError("pending", "Pending approval"); }, restore: async () => grant, managementUrl: async () => null };
  const service = new SubscriptionService(provider, e, new AnalyticsService());
  await service.load(); await service.purchase("monthly");
  assert.equal(e.state.pro, false);
  assert.equal(service.purchaseUncertain, true);
  assert.match(service.message ?? "", /Do not pay again/);
  await service.restore(); assert.equal(e.state.pro, true);
  assert.equal(service.purchaseUncertain, false);
});
test("association generation rejects missing values and binds both native identities to the supplied HTTPS path", () => {
  assert.throws(() => associations({ origin: "" }));
  const result = associations({ origin: "https://example.test", path: "/reset.html", appleTeamId: "ABCDE12345", androidSha256: [Array(32).fill("AB").join(":")] });
  assert.equal(result.apple.applinks.details[0].appIDs[0], "ABCDE12345.com.imrtech.inout");
  assert.equal(result.android[0].target.package_name, "com.imrtech.inout");
});
