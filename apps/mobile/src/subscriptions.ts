import { EntitlementService, type EntitlementGrant } from "./entitlements";
import { AnalyticsService } from "./analytics";

export type PlanId = "monthly" | "annual";
export interface SubscriptionOffer { id: PlanId; title: string; price: string; period: string; introductoryOffer?: { price: string; periods: number; period: string }; }
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
      this.message = error instanceof SubscriptionError && error.reason === "cancelled" ? "Purchase cancelled. Nothing changed." : error instanceof Error ? error.message : "The store could not complete this request. Try again.";
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
