import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { commercialPolicy, type EntitlementGrant } from "../entitlements";
import { SubscriptionError, type SubscriptionProvider, type PlanId } from "../subscriptions";

export function grantFromCustomerInfo(info: CustomerInfo): EntitlementGrant {
  const entitlement = info.entitlements.all[commercialPolicy.entitlementId];
  const subscription = entitlement ? info.subscriptionsByProductIdentifier?.[entitlement.productIdentifier] : undefined;
  const expiresAt = entitlement?.expirationDate ? Date.parse(entitlement.expirationDate) : 0;
  const graceUntil = subscription?.gracePeriodExpiresDate ? Date.parse(subscription.gracePeriodExpiresDate) : null;
  const verifiedAt = Date.parse(info.requestDate);
  const active = entitlement?.isActive === true && !subscription?.refundedAt;
  return { source: "store", active, verifiedAt, expiresAt, graceUntil,
    status: !entitlement ? "free" : !active ? "expired" : entitlement.billingIssueDetectedAt
      ? graceUntil && graceUntil > verifiedAt ? "grace" : "billingRetry"
      : !entitlement.willRenew ? "cancelled" : entitlement.periodType.toLowerCase() === "trial" ? "trial" : "active" };
}

export function revenueCatAdapter(apiKey: string): SubscriptionProvider {
  // Native module stays out of Expo Go execution paths; provider-specific types never reach UI.
  const Purchases = (require("react-native-purchases") as typeof import("react-native-purchases")).default;
  Purchases.configure({ apiKey });
  let packages: Partial<Record<PlanId, PurchasesPackage>> = {};
  const customer = async () => grantFromCustomerInfo(await Purchases.getCustomerInfo());
  return {
    mode: "store",
    async offers() {
      const current = (await Purchases.getOfferings()).current;
      packages = { monthly: current?.monthly ?? undefined, annual: current?.annual ?? undefined };
      return (["monthly", "annual"] as const).flatMap((id) => {
        const item = packages[id];
        return item ? [{ id, title: id === "monthly" ? "Monthly Pro" : "Annual Pro", price: item.product.priceString, period: id === "monthly" ? "month" : "year", introductoryOffer: item.product.introPrice ? { price: item.product.introPrice.priceString, periods: item.product.introPrice.cycles, period: item.product.introPrice.period } : undefined }] : [];
      });
    },
    refresh: customer,
    async purchase(id) {
      const item = packages[id];
      if (!item) throw new Error("This store plan is unavailable. Refresh the plans.");
      try { return grantFromCustomerInfo((await Purchases.purchasePackage(item)).customerInfo); }
      catch (error) {
        const e = error as { userCancelled?: boolean; code?: string };
        if (e.userCancelled) throw new SubscriptionError("cancelled", "Purchase cancelled.");
        if (e.code === "20") throw new SubscriptionError("pending", "Purchase is pending store approval. Refresh or restore when it completes.");
        throw new SubscriptionError("failed", "The store could not complete this request. Try again.");
      }
    },
    async restore() { return grantFromCustomerInfo(await Purchases.restorePurchases()); },
    async managementUrl() { return (await Purchases.getCustomerInfo()).managementURL; },
    listen(listener) {
      const callback = (info: CustomerInfo) => listener(grantFromCustomerInfo(info));
      Purchases.addCustomerInfoUpdateListener(callback);
      return () => Purchases.removeCustomerInfoUpdateListener(callback);
    },
  };
}

