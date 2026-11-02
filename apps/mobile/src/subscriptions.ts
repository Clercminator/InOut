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
  constructor(readonly reason: "cancelled" | "pending" | "unavailable" | "failed" | "network" | "store" | "configuration" | "no_products" | "product_unavailable" | "service", message: string) { super(message); }
}
/** Classify SDK codes, never infer a network failure from an arbitrary error. */
export function classifySubscriptionError(error: unknown): SubscriptionError {
  if (error instanceof SubscriptionError) return error.reason === "cancelled" ? new SubscriptionError("cancelled", "Purchase cancelled. Nothing changed.") : error;
  const value = error as { code?: string | number; userCancelled?: boolean } | null;
  if (value?.userCancelled || String(value?.code) === "1") return new SubscriptionError("cancelled", "Purchase cancelled. Nothing changed.");
  const code = String(value?.code);
  if (["10", "35"].includes(code)) return new SubscriptionError("network", "Could not connect to the store. Check your connection and try again.");
  if (["11", "23"].includes(code)) return new SubscriptionError("configuration", "Subscription setup is incomplete. Please contact Help & feedback. Free practice is available.");
  if (["5", "6"].includes(code)) return new SubscriptionError("product_unavailable", "This plan is not available from your store right now. Refresh plans or contact Help & feedback.");
  if (["2", "3"].includes(code)) return new SubscriptionError("store", "Your store could not load purchases. Check your store account and try again.");
  if (["16", "19"].includes(code)) return new SubscriptionError("service", "The subscription service is temporarily unavailable. Please try again later.");
  if (code === "20") return new SubscriptionError("pending", "Purchase is pending store approval. Refresh or restore when it completes.");
  return new SubscriptionError("failed", "Could not load subscription information. Try again or contact Help & feedback.");
}
export interface SubscriptionProvider {
  lifetime?: {
    offer(): Promise<{ productId: string; price: string }>;
    purchase(): Promise<EntitlementGrant>;
    customerId(): Promise<string>;
  };
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
  onAccessChanged?: () => void;
  onRestored?: () => void;
  /** Founders shares the purchase lock, persisted uncertainty and authoritative grant path. */
  async lifetimeOperation(action: (apply: (grant: EntitlementGrant) => void) => Promise<void>) {
    if (this.busy) return false;
    this.busy = true; this.message = ""; this.emit();
    try { await action(grant => this.apply(grant)); return true; }
    finally { this.finishOperation(); }
  }
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
  private refreshQueued = false;
  private remoteInFlight = false;
  private finishOperation() {
    this.busy = false; this.emit();
    if (this.refreshQueued) { this.refreshQueued = false; void this.refreshAccess(); }
  }
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
    if (!isPro) this.purchaseConfirmation = null;
    if (grant.source === "store" && !wasPro && isPro) this.analytics.track("pro_entitlement_activated");
    if (grant.source === "store" && wasPro && !isPro) this.analytics.track("pro_entitlement_expired");
    this.onAccessChanged?.();
  }
  remoteStarted(operation: "purchase" | "restore") {
    this.remoteInFlight = true;
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
      if (unlocked && operation === "restore") this.onRestored?.();
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
    finally { this.remoteInFlight = false; this.finishOperation(); }
    return unlocked;
  }
  remoteFailed(cancelled = false) {
    this.remoteInFlight = false;
    this.busy = false;
    this.purchaseUncertain = !cancelled;
    this.message = cancelled ? "Purchase cancelled. Nothing changed." : "Purchase status is uncertain. Do not pay again. Refresh status, restore purchases or contact Help & feedback.";
    if (cancelled) this.analytics.track("purchase_cancelled");
    else this.analytics.track("purchase_failed", { outcome: "failed" });
    this.finishOperation();
  }
  remoteClosed() { if (this.remoteInFlight) { this.remoteInFlight = false; this.finishOperation(); } }
  private async operation(action: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true; this.message = ""; this.emit();
    try { await action(); }
    catch (error) {
      this.message = classifySubscriptionError(error).message;
    } finally { this.finishOperation(); }
  }
  /** Refresh access independently of product availability, including after a busy store sheet. */
  async refreshAccess() {
    if (this.busy) { this.refreshQueued = true; return; }
    await this.operation(async () => { this.apply(await this.adapter.refresh()); });
    this.entitlements.billingReady = this.entitlements.billingEvidenceReady;
    this.entitlements.refresh();
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
    this.onRestored?.();
    this.message = this.entitlements.state.subscriptionPro ? "Pro access restored." : "No active Pro subscription was found.";
    if (grant.source === "store" && this.entitlements.state.subscriptionPro) this.analytics.track("subscription_restored");
    if (grant.source === "store" && this.entitlements.state.subscriptionPro) this.analytics.track("restore_success");
  }); }
  listen() { return this.adapter.listen?.((grant) => {
    if (this.identifying) return;
    const previous = this.entitlements.state.status;
    try { this.apply(grant); } catch { this.message = "Could not refresh your subscription. Try restoring purchases."; this.emit(); return; }
    if (grant.status === "cancelled" && previous !== "cancelled") this.analytics.track("subscription_cancelled");
    this.emit();
  }) ?? (() => {}); }
}
