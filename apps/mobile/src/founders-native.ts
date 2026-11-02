import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { FounderError, FounderService } from "./founders";
import type { SubscriptionService } from "./subscriptions";
import type { EntitlementService } from "./entitlements";
import type { AnalyticsService } from "./analytics";
import config from "../../../release/sharing.json";

export function createFounderService(subscriptions: SubscriptionService, entitlements: EntitlementService, analytics: AnalyticsService, platform: string) {
  const key = "inout.founders.v1";
  const reviewCapture = platform === "ios" && process.env.EXPO_PUBLIC_IOS_REVIEW_CAPTURE === "1";
  return new FounderService(subscriptions, entitlements, analytics, async body => {
    if (reviewCapture) {
      if (body.action === "status") return { status: "inactive", allowed: true, environment: "sandbox" };
      throw new FounderError("unavailable");
    }
    const url = config.apiUrl.replace(/\/inout-shares$/, "/inout-founders");
    if (!url.startsWith("https://")) throw Error("HTTPS required");
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new FounderError(result.error ?? "unavailable");
      return result;
    } finally { clearTimeout(timer); }
  }, { read: () => SecureStore.getItem(key), write: value => SecureStore.setItem(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }) },
  () => (randomUUID()+randomUUID()).replaceAll("-", ""), platform);
}
