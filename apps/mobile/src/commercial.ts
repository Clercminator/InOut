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

export function createCommercialServices(store: LocalStore): CommercialServices {
  const development = __DEV__;
  const native = Constants.executionEnvironment !== "storeClient" && Platform.OS !== "web";
  const entitlements = new EntitlementService(development, Date.now, {
    read: () => store.readEntitlementCache(), write: (value) => store.writeEntitlementCache(value),
  });
  const analytics = new AnalyticsService(development ? { record: (event) => console.info(`[IN/OUT dev event] ${event}`) } : undefined);
  const apiKey = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  let adapter = unavailableSubscriptions;
  if (apiKey && native) {
    try { adapter = revenueCatAdapter(apiKey); } catch { /* A missing native SDK must not prevent breathing. */ }
  } else if (development && !apiKey) adapter = new (require("./subscription-providers/test").DevelopmentSubscriptionProvider)();
  const subscriptions = new SubscriptionService(adapter, entitlements, analytics);
  const ads = new AdService(entitlements, native ? process.env.EXPO_PUBLIC_ADS_MODE === "live" ? "live" : "test" : "preview");
  const reviewer = createReviewerService(entitlements);
  return { entitlements, subscriptions, ads, analytics, reviewer };
}
