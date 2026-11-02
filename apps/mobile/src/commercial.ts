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
import { subscriptionConfiguration, advertisingMode } from "./monetization";
import { secureEntitlementCache } from "./entitlement-cache";
import { createFounderService } from "./founders-native";

export function createCommercialServices(store: LocalStore): CommercialServices {
  const development = __DEV__;
  const native = Constants.executionEnvironment !== "storeClient" && Platform.OS !== "web";
  const configuration = subscriptionConfiguration(development, Platform.OS, {
    mode: process.env.EXPO_PUBLIC_REVENUECAT_MODE, testKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY,
    iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  const entitlements = new EntitlementService(development, Date.now, native && configuration && !configuration.testStore ? secureEntitlementCache(development ? "debug" : "store") : undefined);
  let sink;
  if (native && Constants.expoConfig?.extra?.firebasePlatforms?.[Platform.OS]) {
    try { sink = require("./telemetry-native").firebaseTelemetry(); } catch { /* Telemetry never prevents offline practice. */ }
  }
  const analytics = new AnalyticsService(sink ?? (development ? { record: (event) => console.info(`[IN/OUT dev event] ${event}`) } : undefined));
    const telemetryConsented = store.preferences().telemetryEnabled === true;
    void analytics.setConsent(telemetryConsented).then(() => {
      if (telemetryConsented && analytics.remoteReady && store.claimFirstOpen()) analytics.track("app_first_open");
    });
  let adapter = unavailableSubscriptions;
  const reviewCapture = Platform.OS === "ios" && process.env.EXPO_PUBLIC_IOS_REVIEW_CAPTURE === "1";
  const reviewPrice = process.env.EXPO_PUBLIC_IOS_REVIEW_PRICE?.trim();
  if (configuration && native) {
    try { adapter = revenueCatAdapter(configuration.key, configuration.testStore); } catch { /* A missing native SDK must not prevent breathing. */ }
  } else if (development && process.env.EXPO_PUBLIC_REVENUECAT_MODE === "mock") adapter = new (require("./subscription-providers/test").DevelopmentSubscriptionProvider)();
  // Simulator-only App Store review capture harness. It cannot purchase or grant
  // access, and production/store-test profiles never set these build variables.
  if (native && reviewCapture && reviewPrice) adapter = { ...unavailableSubscriptions, lifetime: {
    customerId: async () => "ios-review-capture",
    offer: async () => ({ productId: "com.imrtech.inout.pro.lifetime", price: reviewPrice }),
    purchase: async () => { throw new Error("Purchases are disabled in the review capture build."); },
  } };
  entitlements.billingReady = entitlements.billingEvidenceReady;
  const subscriptions = new SubscriptionService(adapter, entitlements, analytics, { read: () => store.purchaseUncertain(), write: value => store.savePurchaseUncertainty(value) });
  const ads = new AdService(entitlements, advertisingMode(native, development, process.env.EXPO_PUBLIC_ADS_MODE, Constants.expoConfig?.extra?.adEnvironment), { read: () => store.readAdFrequency(), write: value => store.writeAdFrequency(value) }, Date.now, (event, properties) => analytics.track(event, properties));
  const reviewer = createReviewerService(entitlements);
  const founders = native && adapter.lifetime ? createFounderService(subscriptions, entitlements, analytics, Platform.OS) : undefined;
  subscriptions.onAccessChanged = () => { void founders?.reconcile(); };
  subscriptions.onRestored = () => { void founders?.reconcile(true); };
  return { entitlements, subscriptions, ads, analytics, reviewer, founders };
}
