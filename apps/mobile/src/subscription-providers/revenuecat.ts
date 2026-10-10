import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { commercialPolicy, type EntitlementGrant } from "../entitlements";
import { SubscriptionError, type SubscriptionProvider, type SubscriptionOffer, type PlanId } from "../subscriptions";
import config from "../../../../release/monetization.json";

export function grantFromCustomerInfo(info: CustomerInfo, testStore = false): EntitlementGrant {
  const entitlement = info.entitlements.all[commercialPolicy.entitlementId];
  const subscription = entitlement ? info.subscriptionsByProductIdentifier?.[entitlement.productIdentifier] : undefined;
  const expiresAt = entitlement?.expirationDate ? Date.parse(entitlement.expirationDate) : 0;
  const graceUntil = subscription?.gracePeriodExpiresDate ? Date.parse(subscription.gracePeriodExpiresDate) : null;
  const verifiedAt = Date.parse(info.requestDate);
  const trusted = testStore || ["VERIFIED", "VERIFIED_ON_DEVICE"].includes(info.entitlements.verification);
  const active = trusted && entitlement?.isActive === true && !subscription?.refundedAt;
  return { source: testStore ? "development" : "store", active, verifiedAt, expiresAt, graceUntil,
    status: !entitlement ? "free" : !active ? "expired" : entitlement.billingIssueDetectedAt
      ? graceUntil && graceUntil > verifiedAt ? "grace" : "billingRetry"
      : !entitlement.willRenew ? "cancelled" : entitlement.periodType.toLowerCase() === "trial" ? "trial" : "active" };
}

export function revenueCatAdapter(apiKey: string, testStore = false): SubscriptionProvider {
  const { Platform } = require("react-native") as typeof import("react-native");
  if (testStore ? !__DEV__ || !apiKey.startsWith("test_") : !apiKey.startsWith(Platform.OS === "ios" ? "appl_" : "goog_")) {
    throw new Error("Invalid public SDK key for this build");
  }
  const sdk = require("react-native-purchases") as typeof import("react-native-purchases");
  const Purchases = sdk.default;
  Purchases.configure({ apiKey, entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL });
  let packages: Partial<Record<PlanId, PurchasesPackage>> = {};
  const grant = (info: CustomerInfo) => grantFromCustomerInfo(info, testStore);
  const customer = async () => grant(await Purchases.getCustomerInfo());
  return {
    mode: "store", testStore,
    async offers() {
      packages = {};
      const current = (await Purchases.getOfferings()).all[config.offering];
      const candidates = { weekly: current?.weekly, monthly: current?.monthly, annual: current?.annual };
      const identifiers = Object.values(candidates).flatMap(p => p?.product.identifier ? [p.product.identifier] : []);
      const eligibility = Platform.OS === "ios" && identifiers.length ? await Purchases.checkTrialOrIntroductoryPriceEligibility(identifiers).catch(() => ({} as Record<string, { status: number }>)) : {} as Record<string, { status: number }>;
      return (["weekly", "monthly", "annual"] as const).flatMap((id): SubscriptionOffer[] => {
        const item = candidates[id];
        if (!item) return [];
        const product = item.product;
        const period = { weekly: "P1W", monthly: "P1M", annual: "P1Y" }[id];
        if (!product.identifier || !product.priceString?.trim() || !Number.isFinite(product.price) || product.price <= 0 || !/^[A-Z]{3}$/.test(product.currencyCode) || product.subscriptionPeriod !== period) return [];
        packages[id] = item;
        const intro = product.introPrice;
        const phase = product.defaultOption?.freePhase ?? product.defaultOption?.introPhase;
        const introductoryOffer = Platform.OS === "android" && phase ? { price: phase.price.formatted, periods: phase.billingCycleCount ?? 1, period: phase.billingPeriod.iso8601 }
          : eligibility[product.identifier]?.status === 2 && intro ? { price: intro.priceString, periods: intro.cycles, period: intro.period } : undefined;
        const validIntro = introductoryOffer && introductoryOffer.price && Number.isInteger(introductoryOffer.periods) && introductoryOffer.periods > 0 && /^P\d+[DWMY]$/.test(introductoryOffer.period) ? introductoryOffer : undefined;
        const trialEligible = !!validIntro && (Platform.OS === "ios" ? intro?.price === 0 : phase?.price.amountMicros === 0);
        return [{ id, title: { weekly: "Weekly Pro", monthly: "Monthly Pro", annual: "Yearly Pro" }[id], price: product.priceString, priceAmount: product.price, currency: product.currencyCode, period: { weekly: "week", monthly: "month", annual: "year" }[id], trialEligible, introductoryOffer: validIntro }];
      });
    },
    refresh: customer,
    async purchase(id) {
      const item = packages[id];
      if (!item) throw new SubscriptionError("unavailable", "This store plan is unavailable. Refresh the plans.");
      try { return grant((await Purchases.purchasePackage(item)).customerInfo); }
      catch (error) {
        const e = error as { userCancelled?: boolean; code?: string | number };
        if (e.userCancelled) throw new SubscriptionError("cancelled", "Purchase cancelled.");
        if (String(e.code) === "20") throw new SubscriptionError("pending", "Purchase is pending store approval. Refresh or restore when it completes.");
        throw new SubscriptionError("failed", "The store could not complete this request. Try again.");
      }
    },
    async restore() { return grant(await Purchases.restorePurchases()); },
    async managementUrl() {
      if (testStore) return null;
      const url = (await Purchases.getCustomerInfo()).managementURL;
      if (url) { try { const parsed = new URL(url); if (parsed.protocol === "https:" && ["apps.apple.com", "play.google.com"].includes(parsed.hostname)) return url; } catch { /* Use the platform's subscription settings. */ } }
      return Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
    },
    async identify(verifiedAccountId) {
      if (verifiedAccountId !== null) {
        if (!verifiedAccountId.trim() || verifiedAccountId.startsWith("$RCAnonymousID:")) throw new Error("Verified account ID required");
        return grant((await Purchases.logIn(verifiedAccountId)).customerInfo);
      }
      return await Purchases.isAnonymous() ? customer() : grant(await Purchases.logOut());
    },
    listen(listener) {
      const callback = (info: CustomerInfo) => listener(grant(info));
      Purchases.addCustomerInfoUpdateListener(callback);
      return () => Purchases.removeCustomerInfoUpdateListener(callback);
    },
  };
}
