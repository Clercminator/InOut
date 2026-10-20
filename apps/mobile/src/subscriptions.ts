import { EntitlementService, type EntitlementGrant } from "./entitlements";
import { AnalyticsService } from "./analytics";
import type { PurchasesOffering } from "react-native-purchases";

export type PlanId = "weekly" | "monthly" | "annual";
export interface SubscriptionOffer { id: PlanId; title: string; price: string; period: string; priceAmount?: number; currency?: string; trialEligible?: boolean; introductoryOffer?: { price: string; periods: number; period: string }; }
export function annualIsBetterValue(offers: SubscriptionOffer[]) {
  const annual = offers.find(o => o.id === "annual"), monthly = offers.find(o => o.id === "monthly");
  return !!(annual?.currency && monthly && Number.isFinite(annual.priceAmount) && annual.priceAmount! > 0 && offers.filter(o => o.id !== "annual").every(o => o.currency === annual.currency && Number.isFinite(o.priceAmount) && o.priceAmount! > 0 && annual.priceAmount! < o.priceAmount! * (o.id === "weekly" ? 52 : 12)));
}
export function defaultPlan(offers: SubscriptionOffer[], preferred: PlanId = "monthly") {
  // Weekly is opt-in even when it is the only available product.
  return offers.find(o => o.id === preferred && o.id !== "weekly") ?? offers.find(o => o.id === "monthly") ?? offers.find(o => o.id === "annual");
}
export class SubscriptionError extends Error {
  constructor(readonly reason: "cancelled" | "pending" | "unavailable" | "failed", message: string) { super(message); }
}
export interface SubscriptionProvider {
  readonly mode: "development" | "store" | "unavailable";
  readonly testStore?: boolean;
  remotePaywall?: {
    offering(locale: string): Promise<PurchasesOffering>;
    verify(customerInfo: unknown): EntitlementGrant;
  };
  offers(): Promise<SubscriptionOffer[]>;
  refresh(): Promise<EntitlementGrant>;
  purchase(id: PlanId): Promise<EntitlementGrant>;
  restore(): Promise<EntitlementGrant>;
  managementUrl(): Promise<string | null>;
  listen?(listener: (grant: EntitlementGrant) => void): () => void;
  /** Only a future verified auth session may call this; never profile fields or editable preferences. */
  identify?(verifiedAccountId: string | null): Promise<EntitlementGrant>;
}

export const unavailableSubscriptions: SubscriptionProvider = {
  mode: "unavailable", offers: async () => [],
  refresh: async () => { throw new SubscriptionError("unavailable", "Subscriptions are unavailable right now. You can keep breathing for free."); },
  purchase: async () => { throw new SubscriptionError("unavailable", "Subscriptions are unavailable right now. You can keep breathing for free."); },
  restore: async () => { throw new SubscriptionError("unavailable", "Subscriptions are unavailable right now. You can keep breathing for free."); },
  managementUrl: async () => null,
};

export class SubscriptionService {
  purchaseConfirmation: string | null = null;
  private confirmedPurchases = new Set<string>();
  dismissPurchaseConfirmation() { this.purchaseConfirmation = null; this.emit(); }
  private confirmPurchase(grant: EntitlementGrant) {
    if (grant.source !== "store" || !this.entitlements.state.subscriptionPro) return;
    const key = `${grant.productId ?? "pro"}:${grant.expiresAt}`;
    if (this.confirmedPurchases.has(key)) return;
    this.confirmedPurchases.add(key);
    this.purchaseConfirmation = key;
  }
  offers: SubscriptionOffer[] = [];
  private uncertain = false;
  get purchaseUncertain() { return this.uncertain; }
  set purchaseUncertain(value: boolean) {
    this.uncertain = value;
    this.uncertaintyStore?.write(value);
  }
  busy = false;
  message = "";
  private listeners = new Set<() => void>();
  private revision = 0;
  private identifying = false;
  constructor(readonly adapter: SubscriptionProvider, private entitlements: EntitlementService, private analytics: AnalyticsService, private uncertaintyStore?: { read(): boolean; write(value: boolean): void }) {
    try { this.uncertain = uncertaintyStore?.read() ?? false; } catch { this.uncertain = true; }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getRevision = () => this.revision;
  private emit() { this.revision++; this.listeners.forEach((fn) => fn()); }
  private apply(grant: EntitlementGrant) {
    const wasPro = this.entitlements.state.subscriptionPro;
    if (grant.source === "development") {
      if (this.adapter.mode !== "development" && !this.adapter.testStore) throw new Error("Unexpected mock grant");
      this.entitlements.acceptDevelopmentGrant(grant);
    } else this.entitlements.acceptStoreGrant(grant);
    this.entitlements.billingReady = this.entitlements.billingEvidenceReady;
    this.entitlements.refresh();
    if (this.entitlements.state.subscriptionPro) this.purchaseUncertain = false;
    const isPro = this.entitlements.state.subscriptionPro;
    if (grant.source === "store" && !wasPro && isPro) this.analytics.track("pro_entitlement_activated");
    if (grant.source === "store" && wasPro && !isPro) this.analytics.track("pro_entitlement_expired");
  }
  remoteStarted(operation: "purchase" | "restore") {
    if (operation === "purchase") this.purchaseUncertain = true;
    this.busy = true; this.message = "";
    this.analytics.track(operation === "purchase" ? "purchase_started" : "restore_started");
    this.emit();
  }
  remoteCompleted(customerInfo: unknown, operation: "purchase" | "restore") {
    let unlocked = false;
    try {
      if (!this.adapter.remotePaywall || this.adapter.testStore || this.adapter.mode !== "store") throw Error("Store verification required");
      const grant = this.adapter.remotePaywall.verify(customerInfo);
      if (grant.source !== "store") throw Error("Store verification required");
      this.apply(grant);
      unlocked = this.entitlements.state.subscriptionPro;
      if (unlocked && operation === "purchase") this.confirmPurchase(grant);
      this.message = unlocked ? "Pro is active." : "No active Pro subscription was found.";
      if (unlocked) {
        this.analytics.track(operation === "purchase" ? "purchase_success" : "restore_success");
        this.analytics.track(operation === "restore" ? "subscription_restored" : grant.status === "trial" ? "trial_started" : "subscription_started");
      }
    } catch {
      if (operation === "purchase") this.analytics.track("purchase_failed", { outcome: "failed" });
      this.purchaseUncertain = operation === "purchase";
      this.message = "Purchase status is uncertain. Do not pay again. Refresh status, restore purchases or contact Help & feedback.";
    }
    finally { this.busy = false; this.emit(); }
    return unlocked;
  }
  remoteFailed(cancelled = false) {
    this.busy = false;
    this.purchaseUncertain = !cancelled;
    this.message = cancelled ? "Purchase cancelled. Nothing changed." : "Purchase status is uncertain. Do not pay again. Refresh status, restore purchases or contact Help & feedback.";
    if (cancelled) this.analytics.track("purchase_cancelled");
    else this.analytics.track("purchase_failed", { outcome: "failed" });
    this.emit();
  }
  remoteClosed() { if (this.busy) { this.busy = false; this.emit(); } }
  private async operation(action: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true; this.message = ""; this.emit();
    try { await action(); }
    catch (error) {
      this.message = error instanceof SubscriptionError && error.reason === "cancelled" ? "Purchase cancelled. Nothing changed." : error instanceof SubscriptionError ? error.message : "Could not connect to the store. Check your connection and try again.";
    } finally { this.busy = false; this.emit(); }
  }
  async load() { if (this.busy) return; await this.operation(async () => {
    this.offers = [];
    const grant = await this.adapter.refresh();
    this.apply(grant);
    this.offers = await this.adapter.offers();
    if (!this.offers.length) this.message = "No subscription plans are available in this build yet.";
  }); this.entitlements.billingReady = this.entitlements.billingEvidenceReady; this.entitlements.refresh(); }
  async identify(verifiedAccountId: string | null) {
    if (this.busy) return;
    await this.operation(async () => {
      if (!this.adapter.identify) throw new SubscriptionError("unavailable", "Account subscriptions are unavailable.");
      this.identifying = true;
      this.entitlements.billingReady = false;
      // No previous identity's cached access may survive a failed account transition.
      this.apply({ source: this.adapter.testStore ? "development" : "store", active: false, status: "free", verifiedAt: 0, expiresAt: 0, graceUntil: null });
      try { this.apply(await this.adapter.identify(verifiedAccountId)); }
      finally { this.identifying = false; this.entitlements.refresh(); }
    });
  }
  async purchase(id: PlanId) { await this.operation(async () => {
    if (this.purchaseUncertain) { await this.refreshUncertainPurchase(); return; }
    if (this.entitlements.state.subscriptionPro) { this.message = "Pro is active."; return; }
    if (!this.offers.some((o) => o.id === id)) throw new Error("Choose an available plan.");
    if (this.adapter.mode === "store") this.analytics.track("purchase_started");
    let grant: EntitlementGrant;
    // Persist before opening the store sheet; killing the app must not invite another payment.
    if (this.adapter.mode === "store") this.purchaseUncertain = true;
    try { grant = await this.adapter.purchase(id); }
    catch (error) {
      if (this.adapter.mode === "store" && !(error instanceof SubscriptionError && ["cancelled", "unavailable"].includes(error.reason))) {
        this.purchaseUncertain = true;
        this.analytics.track("purchase_failed", { outcome: "failed" });
        await this.refreshUncertainPurchase();
        return;
      }
      this.purchaseUncertain = false;
      if (this.adapter.mode === "store" && error instanceof SubscriptionError && error.reason === "cancelled") this.analytics.track("purchase_cancelled");
      else if (this.adapter.mode === "store") this.analytics.track("purchase_failed", { outcome: "failed" });
      throw error;
    }
    this.apply(grant);
    if (!this.entitlements.state.subscriptionPro) {
      if (grant.source === "store") this.analytics.track("purchase_failed", { outcome: "failed" });
      this.purchaseUncertain = true;
      await this.refreshUncertainPurchase(); return;
    }
    this.message = this.adapter.mode === "development" ? "Demo Pro activated. No purchase or charge occurred." : "Pro is active.";
    this.confirmPurchase(grant);
    if (grant.source === "store") this.analytics.track("purchase_success");
    if (grant.source === "store") this.analytics.track(grant.status === "trial" ? "trial_started" : "subscription_started");
  }); }
  private async refreshUncertainPurchase() {
    try { this.apply(await this.adapter.refresh()); } catch { /* Keep the purchase lock until verified. */ }
    this.message = this.entitlements.state.subscriptionPro ? "Pro is active." : "Purchase status is uncertain. Do not pay again. Refresh status, restore purchases or contact Help & feedback.";
  }
  async restore() { await this.operation(async () => {
    if (this.adapter.mode === "store") this.analytics.track("restore_started");
    const grant = await this.adapter.restore(); this.apply(grant);
    this.message = this.entitlements.state.subscriptionPro ? "Pro access restored." : "No active Pro subscription was found.";
    if (grant.source === "store" && this.entitlements.state.subscriptionPro) this.analytics.track("subscription_restored");
    if (grant.source === "store" && this.entitlements.state.subscriptionPro) this.analytics.track("restore_success");
  }); }
  listen() { return this.adapter.listen?.((grant) => {
    if (this.identifying) return;
    const previous = this.entitlements.state.status;
    try { this.apply(grant); } catch { this.message = "Could not refresh your subscription. Try restoring purchases."; this.emit(); return; }
    if (grant.status === "cancelled" && previous !== "cancelled") this.analytics.track("subscription_cancelled");
  }) ?? (() => {}); }
}
