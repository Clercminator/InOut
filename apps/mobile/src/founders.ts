import type { EntitlementService } from "./entitlements";
import type { AnalyticsService } from "./analytics";
import { classifySubscriptionError, type SubscriptionService } from "./subscriptions";

export type FounderEnvironment = "production" | "sandbox";
export interface FounderStorage { read(): string | null; write(value: string): void; }
export type FounderRequest = (body: Record<string, unknown>) => Promise<any>;
interface SavedFounder {
  pending?: { token: string; customerId: string; environment: FounderEnvironment; started: boolean };
  recognition?: { customerId: string; environment: FounderEnvironment; verifiedAt: number };
  completed?: string[];
  restored?: string[];
}
export class FounderError extends Error { constructor(readonly reason: string) { super(reason); } }
export class FounderService {
  status = "inactive";
  allowed = false;
  offer: { productId: string; price: string } | null = null;
  message = "";
  loading = false;
  confirmation = false;
  environment: FounderEnvironment = "production";
  private code = "";
  private saved: SavedFounder = {};
  private identity: string | null = null;
  private reconciling = false;
  private restoreQueued = false;
  private viewed = false;
  private soldOutReported = false;
  private revision = 0;
  private listeners = new Set<() => void>();
  constructor(private subscriptions: SubscriptionService, private entitlements: EntitlementService, private analytics: AnalyticsService,
    private request: FounderRequest, private storage: FounderStorage, private token: () => string, private platform: string, private now = Date.now) {
    try { const parsed = JSON.parse(storage.read() ?? "{}"); this.saved = parsed && typeof parsed === "object" ? parsed : {}; } catch { this.saved = {}; }
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getRevision = () => this.revision;
  private emit() { this.revision++; this.listeners.forEach(fn => fn()); }
  private persist() { this.storage.write(JSON.stringify(this.saved)); }
  get supported() { return !!this.subscriptions.adapter.lifetime && !this.subscriptions.adapter.testStore; }
  get busy() { return this.loading || this.subscriptions.busy; }
  get pending() { return !!this.saved.pending; }
  get member() {
    const r = this.saved.recognition;
    return !!r && r.customerId === this.identity && this.entitlements.state.lifetimePro && this.now() >= r.verifiedAt && this.now()-r.verifiedAt < 72*3600000;
  }
  get sandboxMember() { return this.member && this.saved.recognition?.environment === "sandbox"; }
  dismissConfirmation() { this.confirmation = false; this.emit(); }
  async testAccess(code: string) { this.code = code.trim(); this.environment = this.code ? "sandbox" : "production"; await this.load(); }
  private async call(action: string, extra: Record<string, unknown> = {}) {
    const customerId = await this.subscriptions.adapter.lifetime!.customerId(); this.identity = customerId;
    return this.request({ action, customerId, environment: this.environment, code: this.code, ...extra });
  }
  async load() {
    if (!this.supported || this.loading) return;
    this.loading = true; this.offer = null; this.allowed = false; this.message = ""; this.emit();
    try {
      const state = await this.call("status");
      this.status = state.status; this.allowed = state.allowed === true;
      if (this.status === "sold_out" && !this.soldOutReported) { this.soldOutReported = true; this.analytics.track("founder_offer_sold_out"); }
      if (this.allowed) this.offer = await this.subscriptions.adapter.lifetime!.offer();
      if (this.allowed && this.offer && !this.viewed) { this.viewed = true; this.analytics.track("founder_offer_viewed"); }
      if (this.saved.pending && !this.saved.pending.started) {
        try { await this.call("cancel", { token: this.saved.pending.token, environment: this.saved.pending.environment }); } catch {}
        delete this.saved.pending; this.persist();
      }
    } catch (e) { this.message = e instanceof FounderError && e.reason === "invalid_test_access" ? "The testing code is invalid or expired." : "Lifetime Pro is unavailable from your store right now."; }
    finally { this.loading = false; this.emit(); }
    await this.reconcile();
  }
  async reconcile(restored = false) {
    if (!this.supported) return;
    if (this.reconciling) { this.restoreQueued ||= restored; return; }
    if (!this.entitlements.state.lifetimePro) {
      if (this.saved.recognition) { delete this.saved.recognition; try { this.persist(); } catch {} this.emit(); }
      return;
    }
    this.reconciling = true;
    try {
      const result = await this.call("reconcile");
      if (result.founder === true && ["production","sandbox"].includes(result.environment)) {
        this.saved.recognition = { customerId: this.identity!, environment: result.environment, verifiedAt: this.now() };
        const key = `${this.identity}:${result.environment}`;
        if (this.saved.pending?.customerId === this.identity && this.saved.pending.started) {
          const completed = this.saved.completed ?? [];
          if (!completed.includes(key)) {
            this.saved.completed = [...completed, key].slice(-20); this.persist();
            this.analytics.track("founder_purchase_completed");
          }
        }
        if (restored && !(this.saved.restored ?? []).includes(key)) {
          this.saved.restored = [...(this.saved.restored ?? []), key].slice(-20); this.persist();
          this.analytics.track("founder_purchase_restored");
        }
        delete this.saved.pending;
        this.message = "Lifetime Pro is now yours.";
      } else {
        delete this.saved.recognition;
        this.message = result.pending ? "Lifetime Pro is active. Founding Member recognition is being verified." : "Lifetime Pro is active.";
      }
      this.persist();
    } catch { /* Bounded cached recognition remains usable; store access is independent. */ }
    finally { this.reconciling = false; this.emit(); if (this.restoreQueued) { this.restoreQueued = false; void this.reconcile(true); } }
  }
  async purchase() {
    if (!this.supported || this.busy || !this.offer || !this.allowed) return;
    if (this.pending || this.subscriptions.purchaseUncertain) { this.message = "Purchase status is uncertain. Do not pay again. Refresh status, restore purchases or contact Help & feedback."; this.emit(); return; }
    let launched = false;
    try {
      await this.subscriptions.lifetimeOperation(async apply => {
        this.message = "";
        apply(await this.subscriptions.adapter.refresh());
        if (this.entitlements.state.lifetimePro) { await this.reconcile(); return; }
        if (this.entitlements.state.subscriptionPro) throw new FounderError("active_subscription");
        const current = await this.subscriptions.adapter.lifetime!.offer();
        if (current.price !== this.offer!.price || current.productId !== this.offer!.productId) {
          this.offer = current; this.message = "The store price changed. Review the price before continuing."; return;
        }
        const customerId = await this.subscriptions.adapter.lifetime!.customerId();
        const token = this.token();
        this.saved.pending = { token, customerId, environment: this.environment, started: false };
        this.persist(); // A failed secure write must prevent checkout.
        const reservation = await this.call("reserve", { token, platform: this.platform });
        if (reservation.allowed !== true) { delete this.saved.pending; this.persist(); this.allowed = false; this.status = reservation.status ?? "inactive"; throw new FounderError(this.status); }
        this.saved.pending.started = true; this.persist();
        this.subscriptions.purchaseUncertain = true;
        launched = true; this.analytics.track("founder_purchase_started");
        apply(await this.subscriptions.adapter.lifetime!.purchase());
        try { apply(await this.subscriptions.adapter.refresh()); } catch { /* Purchase result already contains verified RC evidence. */ }
        if (!this.entitlements.state.lifetimePro) throw new FounderError("pending");
        this.confirmation = true;
        this.message = "Lifetime Pro is active. Founding Member recognition is being verified.";
        await this.reconcile();
      });
    } catch (e) {
      const reason = e instanceof FounderError ? e.reason : classifySubscriptionError(e).reason;
      if (reason === "cancelled" || !launched) {
        if (this.saved.pending) {
          try { await this.call("cancel", { token: this.saved.pending.token, environment: this.saved.pending.environment }); } catch { /* Expires automatically. */ }
          delete this.saved.pending; try { this.persist(); } catch {}
        }
        if (launched) this.subscriptions.purchaseUncertain = false;
      }
      if (launched) this.analytics.track(reason === "cancelled" ? "founder_purchase_cancelled" : "founder_purchase_failed");
      this.message = reason === "active_subscription" ? "You already have a subscription. To avoid overlapping charges, Lifetime checkout is unavailable until your paid subscription ends. Cancelling renewal is separate and does not end access immediately."
        : reason === "cancelled" ? "Purchase cancelled. Nothing changed."
        : reason === "pending" ? "Purchase is pending store approval. Refresh or restore when it completes."
        : reason === "closed" ? "The Founding Member campaign is closed."
        : reason === "sold_out" ? "The Founding Member allocation is sold out."
        : launched ? "Purchase status is uncertain. Do not pay again. Refresh status, restore purchases or contact Help & feedback."
        : "Lifetime Pro is unavailable right now. Your existing access is unchanged.";
    } finally { this.emit(); }
  }
  async restore() { if (this.subscriptions.busy) return; await this.subscriptions.restore(); await this.reconcile(true); }
}
