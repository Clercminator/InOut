import { revenueCatAdapter } from "./subscription-providers/revenuecat";
import { createReviewerService } from "./reviewer-native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { EntitlementService } from "./entitlements";
import { AnalyticsService } from "./analytics";
import { AdService } from "./ads";
import { SubscriptionService, unavailableSubscriptions } from "./subscriptions";
import type { LocalStore } from "./storage";
import type { CommercialServices } from "./commercial-context";
import { subscriptionConfiguration } from "./monetization";
import { secureEntitlementCache } from "./entitlement-cache";

export function createCommercialServices(store: LocalStore): CommercialServices {
  const development = __DEV__;
  const native = Constants.executionEnvironment !== "storeClient" && Platform.OS !== "web";
  const configuration = subscriptionConfiguration(development, Platform.OS, {
    mode: process.env.EXPO_PUBLIC_REVENUECAT_MODE, testKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY,
    iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  const entitlements = new EntitlementService(development, Date.now, native && configuration && !configuration.testStore ? secureEntitlementCache(development ? "debug" : "store") : undefined);
  const analytics = new AnalyticsService(development ? { record: (event) => console.info(`[IN/OUT dev event] ${event}`) } : undefined);
  let adapter = unavailableSubscriptions;
  if (configuration && native) {
    try { adapter = revenueCatAdapter(configuration.key, configuration.testStore); } catch { /* A missing native SDK must not prevent breathing. */ }
  } else if (development && process.env.EXPO_PUBLIC_REVENUECAT_MODE === "mock") adapter = new (require("./subscription-providers/test").DevelopmentSubscriptionProvider)();
  entitlements.billingReady = adapter.mode === "unavailable";
  const subscriptions = new SubscriptionService(adapter, entitlements, analytics);
  const ads = new AdService(entitlements, native ? !development && process.env.EXPO_PUBLIC_ADS_MODE === "live" ? "live" : "test" : "preview", { read: () => store.readAdFrequency(), write: value => store.writeAdFrequency(value) });
  const reviewer = createReviewerService(entitlements);
  return { entitlements, subscriptions, ads, analytics, reviewer };
}
