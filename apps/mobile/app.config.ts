import type { ConfigContext } from "expo/config";

export default ({ config }: ConfigContext) => {
  const { buildPolicy } = require("../../scripts/build-policy.cjs");
  const errors = buildPolicy(process.env, require("../../release/readiness.json").gates, require("../../release/store-listing.json").status);
  if (errors.length) throw new Error(errors.join("\n"));
  const links = require("../../release/links.json");
  return ({
  ...config,
  extra: { ...config.extra, ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } : {}) },
  ios: { ...config.ios, ...(links.origin && links.appleTeamId ? { appleTeamId: links.appleTeamId, associatedDomains: [`applinks:${new URL(links.origin).host}`] } : {}) },
  android: { ...config.android, ...(links.origin && links.androidSha256.length ? { intentFilters: [{ action: "VIEW", autoVerify: true, category: ["BROWSABLE", "DEFAULT"], data: [{ scheme: "https", host: new URL(links.origin).host, path: links.path }] }] } : {}) },
  plugins: [...(config.plugins ?? []),
    "expo-secure-store",
    "expo-sharing",
    "expo-notifications",
    ["expo-image-picker", { photosPermission: "Choose a photo for your private IN/OUT profile.", cameraPermission: false, microphonePermission: false }],
    "@react-native-community/datetimepicker",
    ["expo-build-properties", { android: { kotlinVersion: "2.2.21" } }],
    "./plugins/with-kotlin-compiler.cjs",
    ["react-native-google-mobile-ads", {
    androidAppId: process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713",
    iosAppId: process.env.ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511",
    delayAppMeasurementInit: true,
  }]],
});
};
