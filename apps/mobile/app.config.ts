import type { ConfigContext } from "expo/config";

export default ({ config }: ConfigContext) => {
  const preview = process.env.INOUT_PREVIEW === "1";
  if (preview && (process.env.INOUT_RELEASE === "1" || process.env.INOUT_STORE_TEST === "1")) throw new Error("The separate Preview app cannot be a store release.");
  const { buildPolicy } = require("../../scripts/build-policy.cjs");
  const errors = buildPolicy({ ...process.env, EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId }, require("../../release/readiness.json").gates, require("../../release/store-listing.json").status, { artifactOnly: process.env.INOUT_ARTIFACT_ONLY === "1" });
  if (errors.length) throw new Error(errors.join("\n"));
  const links = require("../../release/links.json");
  const { admob } = require("../../release/monetization.json");
  // The production Firebase files identify the production bundle, not the isolated preview.
  const androidGoogleServicesFile = preview ? undefined : process.env.GOOGLE_SERVICES_JSON;
  const iosGoogleServicesFile = preview ? undefined : process.env.GOOGLE_SERVICES_PLIST;
  const firebaseConfigured = process.env.EAS_BUILD_PLATFORM === "ios" ? !!iosGoogleServicesFile
    : process.env.EAS_BUILD_PLATFORM === "android" ? !!androidGoogleServicesFile
    : !!androidGoogleServicesFile || !!iosGoogleServicesFile;
  return ({
  ...config,
  ...(preview ? { name: "IN/OUT Preview", scheme: "inout-preview" } : {}),
  extra: { ...config.extra, adEnvironment: process.env.INOUT_RELEASE === "1" || process.env.EAS_BUILD_PROFILE === "production" ? "production" : "test", firebasePlatforms: { android: !!androidGoogleServicesFile, ios: !!iosGoogleServicesFile }, ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } : {}) },
  ios: { ...config.ios, ...(preview ? { bundleIdentifier: "com.imrtech.inout.preview" } : {}), ...(iosGoogleServicesFile ? { googleServicesFile: iosGoogleServicesFile } : {}), ...(!preview && links.origin && links.appleTeamId ? { appleTeamId: links.appleTeamId, associatedDomains: [`applinks:${new URL(links.origin).host}`] } : {}) },
  android: { ...config.android, ...(preview ? { package: "com.imrtech.inout.preview" } : {}), ...(androidGoogleServicesFile ? { googleServicesFile: androidGoogleServicesFile } : {}), ...(!preview && links.origin && links.androidSha256.length ? { intentFilters: [{ action: "VIEW", autoVerify: true, category: ["BROWSABLE", "DEFAULT"], data: [{ scheme: "https", host: new URL(links.origin).host, path: links.path }] }] } : {}) },
  plugins: [...(config.plugins ?? []),
    ...(firebaseConfigured ? ["@react-native-firebase/app", "@react-native-firebase/crashlytics"] : []),
    "expo-secure-store",
    ["expo-localization", { supportedLocales: ["en", "es", "pt"], allowDynamicLocaleChangesAndroid: true }],
    "expo-sharing",
    ["expo-notifications", { icon: "./assets/monochrome-icon.png", color: "#5B2DFF" }],
    ["expo-image-picker", { photosPermission: "Choose a photo for your private IN/OUT profile.", cameraPermission: false, microphonePermission: false }],
    "@react-native-community/datetimepicker",
    ["expo-build-properties", { ios: { useFrameworks: "dynamic" }, android: { kotlinVersion: "2.2.21", enableMinifyInReleaseBuilds: true } }],
    "./plugins/with-kotlin-compiler.cjs",
    "./plugins/with-android-symbols.cjs",
    ["react-native-google-mobile-ads", {
    androidAppId: admob.android.app,
    iosAppId: admob.ios.app,
    delayAppMeasurementInit: true,
  }]],
});
};
