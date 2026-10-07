import { EntitlementService, type EntitlementGrant } from "./entitlements";
import { AnalyticsService } from "./analytics";

export type PlanId = "monthly" | "annual";
export interface SubscriptionOffer { id: PlanId; title: string; price: string; period: string; priceAmount?: number; currency?: string; trialEligible?: boolean; introductoryOffer?: { price: string; periods: number; period: string }; }
export function annualIsBetterValue(offers: SubscriptionOffer[]) {
  const annual = offers.find(o => o.id === "annual"), monthly = offers.find(o => o.id === "monthly");
  return !!(annual?.currency && annual.currency === monthly?.currency && Number.isFinite(annual.priceAmount) && Number.isFinite(monthly?.priceAmount) && annual.priceAmount! > 0 && annual.priceAmount! < monthly!.priceAmount! * 12);
}
export class SubscriptionError extends Error {
  constructor(readonly reason: "cancelled" | "pending" | "unavailable" | "failed", message: string) { super(message); }
}
export interface SubscriptionProvider {
  readonly mode: "development" | "store" | "unavailable";
  offers(): Promise<SubscriptionOffer[]>;
  refresh(): Promise<EntitlementGrant>;
  purchase(id: PlanId): Promise<EntitlementGrant>;
  restore(): Promise<EntitlementGrant>;
  managementUrl(): Promise<string | null>;
  listen?(listener: (grant: EntitlementGrant) => void): () => void;
}

export const unavailableSubscriptions: SubscriptionProvider = {
  mode: "unavailable", offers: async () => [],
  refresh: async () => { throw new SubscriptionError("unavailable", "Subscriptions are unavailable right now. You can keep breathing for free."); },
  purchase: async () => { throw new SubscriptionError("unavailable", "Subscriptions are unavailable right now. You can keep breathing for free."); },
  restore: async () => { throw new SubscriptionError("unavailable", "Subscriptions are unavailable right now. You can keep breathing for free."); },
  managementUrl: async () => null,
};

export class SubscriptionService {
  offers: SubscriptionOffer[] = [];
  busy = false;
  message = "";
  private listeners = new Set<() => void>();
  private revision = 0;
  constructor(readonly adapter: SubscriptionProvider, private entitlements: EntitlementService, private analytics: AnalyticsService) {}
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
      this.message = error instanceof SubscriptionError && error.reason === "cancelled" ? "Purchase cancelled. Nothing changed." : error instanceof SubscriptionError ? error.message : "Could not connect to the store. Check your connection and try again.";
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
    if (this.adapter.mode === "store") this.analytics.track("purchase_started");
    let grant: EntitlementGrant;
    try { grant = await this.adapter.purchase(id); }
    catch (error) { if (this.adapter.mode === "store" && error instanceof SubscriptionError && error.reason === "cancelled") this.analytics.track("purchase_cancelled"); throw error; }
    this.apply(grant);
    if (!this.entitlements.state.subscriptionPro) { this.message = "The store has not activated Pro. Try restoring after the purchase finishes."; return; }
    this.message = this.adapter.mode === "development" ? "Demo Pro activated. No purchase or charge occurred." : "Pro is active.";
    if (grant.source === "store") this.analytics.track("purchase_success");
    if (grant.source === "store") this.analytics.track(grant.status === "trial" ? "trial_started" : "subscription_started");
  }); }
  async restore() { await this.operation(async () => {
    if (this.adapter.mode === "store") this.analytics.track("restore_started");
    const grant = await this.adapter.restore(); this.apply(grant);
    this.message = this.entitlements.state.subscriptionPro ? "Pro access restored." : "No active Pro subscription was found.";
    if (grant.source === "store" && this.entitlements.state.subscriptionPro) this.analytics.track("subscription_restored");
    if (grant.source === "store" && this.entitlements.state.subscriptionPro) this.analytics.track("restore_success");
  }); }
  listen() { return this.adapter.listen?.((grant) => {
    const previous = this.entitlements.state.status;
    try { this.apply(grant); } catch { this.message = "Could not refresh your subscription. Try restoring purchases."; this.emit(); return; }
    if (grant.status === "cancelled" && previous !== "cancelled") this.analytics.track("subscription_cancelled");
  }) ?? (() => {}); }
}
