import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { ReviewerError, ReviewerService } from "./reviewer";
import type { EntitlementService } from "./entitlements";
import config from "../../../release/sharing.json";
export function createReviewerService(entitlements: EntitlementService) {
  const key = "inout.reviewer.v1";
  return new ReviewerService({
    read: () => SecureStore.getItemAsync(key),
    write: value => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  }, async body => {
    const url = new URL(config.apiUrl.replace(/\/inout-shares$/, "/inout-reviewer"));
    if (url.protocol !== "https:") throw new Error("HTTPS required");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok) throw new ReviewerError(response.status);
      return await response.json();
    } finally { clearTimeout(timeout); }
  }, randomUUID, entitlements);
}
