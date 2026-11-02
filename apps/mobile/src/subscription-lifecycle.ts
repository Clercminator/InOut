import { AppState } from "react-native";
import type { EntitlementService } from "./entitlements";
import type { SubscriptionService } from "./subscriptions";

export function watchSubscriptionAccess(subscriptions: SubscriptionService, entitlements: EntitlementService) {
  const unsubscribe = subscriptions.listen();
  const refresh = () => {
    if (AppState.currentState === "active" && subscriptions.adapter.mode === "store") void subscriptions.refreshAccess();
  };
  if (subscriptions.adapter.mode !== "unavailable") void subscriptions.load();
  let wasPro = entitlements.state.subscriptionPro, wasReady = entitlements.billingReady;
  const expiry = setInterval(() => {
    entitlements.checkExpiry();
    const pro = entitlements.state.subscriptionPro, ready = entitlements.billingReady;
    if (wasPro && !pro || wasReady && !ready) refresh();
    wasPro = pro; wasReady = ready;
  }, 1000);
  // CustomerInfo listeners aren't server push: reconcile long foreground sessions too.
  const poll = setInterval(refresh, 5 * 60000);
  const foreground = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
  return () => { unsubscribe(); foreground.remove(); clearInterval(expiry); clearInterval(poll); };
}
