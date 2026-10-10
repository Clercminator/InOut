import config from "../../../release/monetization.json";

export const monetization = config;
export function adUnit(format: "banner" | "interstitial", mode: "test" | "live") {
  const { Platform } = require("react-native") as typeof import("react-native");
  if (mode === "test") {
    const { TestIds } = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
    return format === "banner" ? TestIds.BANNER : TestIds.INTERSTITIAL;
  }
  return config.admob[Platform.OS === "ios" ? "ios" : "android"][format];
}

export function subscriptionConfiguration(development: boolean, platform: string, env: {
  mode?: string; testKey?: string; iosKey?: string; androidKey?: string;
}) {
  if (env.mode === "test-store") return development && env.testKey?.startsWith("test_")
    ? { key: env.testKey, testStore: true } : null;
  if (env.mode && env.mode !== "store") return null;
  const key = platform === "ios" ? env.iosKey : env.androidKey;
  return key?.startsWith(platform === "ios" ? "appl_" : "goog_") ? { key, testStore: false } : null;
}
