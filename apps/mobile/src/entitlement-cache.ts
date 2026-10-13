import * as SecureStore from "expo-secure-store";
import type { EntitlementCache } from "./entitlements";

/** Store evidence is isolated from editable preferences and from debug/Test Store grants. */
export function secureEntitlementCache(namespace: string): EntitlementCache {
  const key = `inout.billing.v2.${namespace}`;
  return {
    read() {
      const raw = SecureStore.getItem(key);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!Number.isFinite(saved.savedAt) || Date.now() < saved.savedAt) return null;
      return saved.grant;
    },
    write(grant) {
      SecureStore.setItem(key, JSON.stringify({ grant, savedAt: Date.now() }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    },
  };
}
