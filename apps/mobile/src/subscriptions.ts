import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { commercialPolicy, EntitlementService, type EntitlementGrant } from "./entitlements";
import { AnalyticsService } from "./analytics";

export type PlanId = "monthly" | "annual";
export interface SubscriptionOffer { id: PlanId; title: string; price: string; period: string; }
export interface SubscriptionAdapter {
  readonly mode: "development" | "store" | "unavailable";
  offers(): Promise<SubscriptionOffer[]>;
  refresh(): Promise<EntitlementGrant>;
  purchase(id: PlanId): Promise<EntitlementGrant>;
  restore(): Promise<EntitlementGrant>;
  managementUrl(): Promise<string | null>;
  listen?(listener: (grant: EntitlementGrant) => void): () => void;
}

export function grantFromCustomerInfo(info: CustomerInfo): EntitlementGrant {
  const entitlement = info.entitlements.all[commercialPolicy.entitlementId];
  const subscription = entitlement ? info.subscriptionsByProductIdentifier?.[entitlement.productIdentifier] : undefined;
  const expiresAt = entitlement?.expirationDate ? Date.parse(entitlement.expirationDate) : 0;
  const graceUntil = subscription?.gracePeriodExpiresDate ? Date.parse(subscription.gracePeriodExpiresDate) : null;
  const verifiedAt = Date.parse(info.requestDate);
  const active = entitlement?.isActive === true;
  return { source: "store", active, verifiedAt, expiresAt, graceUntil,
    status: !entitlement ? "free" : !active ? "expired" : entitlement.billingIssueDetectedAt
      ? graceUntil && graceUntil > verifiedAt ? "grace" : "billingRetry"
      : !entitlement.willRenew ? "cancelled" : entitlement.periodType.toLowerCase() === "trial" ? "trial" : "active" };
}

export function revenueCatAdapter(apiKey: string): SubscriptionAdapter {
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
        return item ? [{ id, title: id === "monthly" ? "Monthly Pro" : "Annual Pro", price: item.product.priceString, period: id === "monthly" ? "month" : "year" }] : [];
      });
    },
    refresh: customer,
    async purchase(id) {
      const item = packages[id];
      if (!item) throw new Error("This store plan is unavailable. Refresh the plans.");
      return grantFromCustomerInfo((await Purchases.purchasePackage(item)).customerInfo);
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

export class DevelopmentSubscriptionAdapter implements SubscriptionAdapter {
  readonly mode = "development";
  outcome: "success" | "cancel" | "failure" = "success";
  trial = false;
  private owned: EntitlementGrant | null = null;
  constructor(private now: () => number = Date.now) {}
  async offers(): Promise<SubscriptionOffer[]> {
    return [{ id: "monthly", title: "Monthly Pro", price: "Demo — no charge", period: "month" }, { id: "annual", title: "Annual Pro", price: "Demo — no charge", period: "year" }];
  }
  async refresh(): Promise<EntitlementGrant> {
    return this.owned ?? { source: "development", status: "free", active: false, verifiedAt: this.now(), expiresAt: 0, graceUntil: null };
  }
  async purchase(id: PlanId): Promise<EntitlementGrant> {
    if (this.outcome === "cancel") throw { userCancelled: true };
    if (this.outcome === "failure") throw new Error("Simulated store failure. No charge was made.");
    this.owned = { source: "development", status: this.trial ? "trial" : "active", active: true,
      verifiedAt: this.now(), expiresAt: this.now() + (this.trial ? 7 : id === "monthly" ? 30 : 365) * 86400000, graceUntil: null };
    return this.owned;
  }
  async restore() { return this.refresh(); }
  async managementUrl() { return null; }
}

export const unavailableSubscriptions: SubscriptionAdapter = {
  mode: "unavailable", offers: async () => [],
  refresh: async () => { throw new Error("Store billing is not configured in this build."); },
  purchase: async () => { throw new Error("Store billing is not configured in this build."); },
  restore: async () => { throw new Error("Store billing is not configured in this build."); },
  managementUrl: async () => null,
};

export class SubscriptionService {
  offers: SubscriptionOffer[] = [];
  busy = false;
  message = "";
  private listeners = new Set<() => void>();
  private revision = 0;
  constructor(readonly adapter: SubscriptionAdapter, private entitlements: EntitlementService, private analytics: AnalyticsService) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getRevision = () => this.revision;
  private emit() { this.revision++; this.listeners.forEach((fn) => fn()); }
  private apply(grant: EntitlementGrant) {
    if (grant.source === "development") {
      if (this.adapter.mode !== "development") throw new Error("Unexpected mock grant");
      this.entitlements.acceptDevelopmentGrant(grant);
    } else this.entitlements.acceptStoreGrant(grant);
  }
  private async operation(action: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true; this.message = ""; this.emit();
    try { await action(); }
    catch (error) {
      this.message = (error as { userCancelled?: boolean })?.userCancelled ? "Purchase cancelled. Nothing changed." : error instanceof Error ? error.message : "The store could not complete this request. Try again.";
    } finally { this.busy = false; this.emit(); }
  }
  async load() { await this.operation(async () => {
    const grant = await this.adapter.refresh();
    this.apply(grant);
    this.offers = await this.adapter.offers();
    if (!this.offers.length) this.message = "No subscription plans are available in this build yet.";
  }); }
  async purchase(id: PlanId) { await this.operation(async () => {
    if (!this.offers.some((o) => o.id === id)) throw new Error("Choose an available plan.");
    const grant = await this.adapter.purchase(id); this.apply(grant);
    if (!this.entitlements.state.pro) { this.message = "The store has not activated Pro. Try restoring after the purchase finishes."; return; }
    this.message = this.adapter.mode === "development" ? "Demo Pro activated. No purchase or charge occurred." : "Pro is active.";
    if (grant.source === "store") this.analytics.track(grant.status === "trial" ? "trial_started" : "subscription_started");
  }); }
  async restore() { await this.operation(async () => {
    const grant = await this.adapter.restore(); this.apply(grant);
    this.message = this.entitlements.state.pro ? "Pro access restored." : "No active Pro subscription was found.";
    if (grant.source === "store" && this.entitlements.state.pro) this.analytics.track("subscription_restored");
  }); }
  listen() { return this.adapter.listen?.((grant) => {
    const previous = this.entitlements.state.status;
    this.apply(grant);
    if (grant.status === "cancelled" && previous !== "cancelled") this.analytics.track("subscription_cancelled");
  }) ?? (() => {}); }
}
