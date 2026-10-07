import type { EntitlementGrant } from "../entitlements";
import { SubscriptionError, type SubscriptionProvider, type SubscriptionOffer, type PlanId } from "../subscriptions";
export class DevelopmentSubscriptionProvider implements SubscriptionProvider {
  readonly mode = "development";
  outcome: "success" | "cancel" | "failure" | "pending" = "success";
  trial = false;
  private owned: EntitlementGrant | null = null;
  constructor(private now: () => number = Date.now) {
    if (typeof __DEV__ !== "undefined" && !__DEV__) throw new Error("Development subscriptions are disabled");
  }
  async offers(): Promise<SubscriptionOffer[]> {
    return [{ id: "monthly", title: "Monthly Pro", price: "Demo — no charge", period: "month" }, { id: "annual", title: "Annual Pro", price: "Demo — no charge", period: "year" }];
  }
  async refresh(): Promise<EntitlementGrant> {
    return this.owned ?? { source: "development", status: "free", active: false, verifiedAt: this.now(), expiresAt: 0, graceUntil: null };
  }
  async purchase(id: PlanId): Promise<EntitlementGrant> {
    if (this.outcome === "pending") throw new SubscriptionError("pending", "Purchase is pending store approval. Refresh or restore when it completes.");
    if (this.outcome === "cancel") throw new SubscriptionError("cancelled", "Purchase cancelled.");
    if (this.outcome === "failure") throw new SubscriptionError("failed", "Simulated store failure. No charge was made.");
    this.owned = { source: "development", status: this.trial ? "trial" : "active", active: true,
      verifiedAt: this.now(), expiresAt: this.now() + (this.trial ? 7 : id === "monthly" ? 30 : 365) * 86400000, graceUntil: null };
    return this.owned;
  }
  async restore() { return this.refresh(); }
  async managementUrl() { return null; }
}

