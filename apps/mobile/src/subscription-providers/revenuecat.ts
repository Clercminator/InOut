import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { commercialPolicy, isLifetimeProduct, type EntitlementGrant } from "../entitlements";
import { SubscriptionError, classifySubscriptionError, type SubscriptionProvider, type SubscriptionOffer, type PlanId } from "../subscriptions";
import config from "../../../../release/monetization.json";
import founders from "../../../../release/founders.json";

export function grantFromCustomerInfo(info: CustomerInfo, testStore = false): EntitlementGrant {
  const entitlement = info.entitlements.all[commercialPolicy.entitlementId];
  const subscription = entitlement ? info.subscriptionsByProductIdentifier?.[entitlement.productIdentifier] : undefined;
  const expiresAt = entitlement?.expirationDate ? Date.parse(entitlement.expirationDate) : 0;
  const graceUntil = subscription?.gracePeriodExpiresDate ? Date.parse(subscription.gracePeriodExpiresDate) : null;
  const verifiedAt = Date.parse(info.requestDate);
  const trusted = testStore || ["VERIFIED", "VERIFIED_ON_DEVICE"].includes(info.entitlements.verification);
  if (!trusted) throw new SubscriptionError("failed", "The store response could not be verified. Try restoring purchases.");
  const active = trusted && entitlement?.isActive === true && !subscription?.refundedAt;
  const lifetime = !!entitlement && isLifetimeProduct(entitlement.productIdentifier) && entitlement.expirationDate === null;
  return { source: testStore ? "development" : "store", active, lifetime, verifiedAt, expiresAt, graceUntil, productId: entitlement?.productIdentifier, planId: entitlement?.productPlanIdentifier ?? undefined,
    status: !entitlement ? "free" : !active ? "expired" : entitlement.billingIssueDetectedAt
      ? graceUntil && graceUntil > verifiedAt ? "grace" : "billingRetry"
      : lifetime ? "active" : !entitlement.willRenew ? "cancelled" : entitlement.periodType.toLowerCase() === "trial" ? "trial" : "active" };
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
  let lifetimePackage: PurchasesPackage | undefined;
  const grant = (info: CustomerInfo) => grantFromCustomerInfo(info, testStore);
  const request = async <T,>(action: () => Promise<T>): Promise<T> => {
    try { return await action(); } catch (error) { throw classifySubscriptionError(error); }
  };
  const customer = async () => request(async () => {
    // A foreground/manual check must see refunds even within the SDK cache TTL.
    await Purchases.invalidateCustomerInfoCache();
    return grant(await Purchases.getCustomerInfo());
  });
  const loadOffering = async () => {
    const offering = (await request(() => Purchases.getOfferings())).all[config.offering];
    if (!offering) throw new SubscriptionError("configuration", "Subscription setup is incomplete. Please contact Help & feedback. Free practice is available.");
    if (!offering.availablePackages.length) throw new SubscriptionError("no_products", "No subscription plans were returned by your store. Try again later or contact Help & feedback.");
    return offering;
  };
  return {
    mode: "store", testStore,
    ...(!testStore ? { lifetime: {
      customerId: () => Purchases.getAppUserID(),
      async offer() {
        lifetimePackage = undefined;
        const offering = (await request(() => Purchases.getOfferings())).all[founders.offering];
        const item = offering?.availablePackages.find(p => p.identifier === founders.package);
        const p = item?.product;
        const expected = Platform.OS === "ios" ? founders.products.ios : founders.products.android;
        if (!item || item.packageType !== "LIFETIME" || p?.identifier !== expected || p.subscriptionPeriod != null ||
          !p.priceString?.trim() || !Number.isFinite(p.price) || p.price <= 0 || !/^[A-Z]{3}$/.test(p.currencyCode))
          throw new SubscriptionError("product_unavailable", "Lifetime Pro is unavailable from your store right now.");
        lifetimePackage = item;
        return { productId: p.identifier, price: p.priceString };
      },
      async purchase() {
        if (!lifetimePackage) throw new SubscriptionError("unavailable", "Lifetime Pro is unavailable from your store right now.");
        return request(async () => grant((await Purchases.purchasePackage(lifetimePackage!)).customerInfo));
      },
    } } : {}),
    ...(!testStore ? { remotePaywall: {
      async offering(locale: string) {
        await Purchases.overridePreferredLocale(locale);
        const offering = await loadOffering();
        return offering;
      },
      verify: (info: unknown) => grantFromCustomerInfo(info as CustomerInfo),
    } } : {}),
    async offers() {
      packages = {};
      const current = await loadOffering();
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
    async restore() { return grant(await request(() => Purchases.restorePurchases())); },
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
      const callback = (info: CustomerInfo) => {
        // An unverified update cannot revoke existing access or establish Free billing status.
        try { listener(grant(info)); } catch { /* A later refresh can recover. */ }
      };
      Purchases.addCustomerInfoUpdateListener(callback);
      return () => Purchases.removeCustomerInfoUpdateListener(callback);
    },
  };
}
