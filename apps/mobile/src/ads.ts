import { EntitlementService } from "./entitlements";
import { productConfig } from "./product-config";
import { adUnit } from "./monetization";

export const adPlacements = { today: "/", progress: "/progress" } as const;
export type AdPlacement = keyof typeof adPlacements;
export interface AdContext { path: string; foreground: boolean; sessionStage: string | null; challengeActive?: boolean; }
interface Frequency { seen: string[]; count: number; day: string; shown: number; lastAd: number; lastPaywall: number; highWater: number; }
export interface AdFrequencyStorage { read(): unknown; write(value: Frequency): void; }
export class AdService {
  private currentReady = false;
  private revision = 0;
  private listeners = new Set<() => void>();
  private pending: Promise<void> | null = null;
  private context: AdContext | null = null;
  private paywalls = 0;
  private initialized = false;
  private consentGeneration = 0;
  private blocked = false;
  private startedAt: number;
  private frequency: Frequency;
  private candidate: { id: string; loaded: boolean; show(): Promise<void>; dispose(): void } | null = null;
  private showing = false;
  private finishShowing?: () => void;
  constructor(private entitlements: EntitlementService, readonly mode: "test" | "live" | "preview", private storage?: AdFrequencyStorage, private now = Date.now) {
    this.startedAt = now();
    this.frequency = { seen: [], count: 0, day: "", shown: 0, lastAd: 0, lastPaywall: 0, highWater: now() };
    try {
      const saved = storage?.read() as Frequency | null;
      if (saved) {
        if (!Array.isArray(saved.seen) || !saved.seen.every(id => typeof id === "string") || typeof saved.day !== "string" || ![saved.count, saved.shown, saved.lastAd, saved.lastPaywall, saved.highWater].every(v => Number.isFinite(v) && v >= 0)) throw new Error("Invalid frequency state");
        this.frequency = saved;
      }
    } catch { this.blocked = true; }
    entitlements.subscribe(() => { if (!this.canRequest()) { this.ready = false; this.cancelCompletion(); } });
  }
  get ready() { return this.currentReady; }
  set ready(value: boolean) { if (this.currentReady === value) return; this.currentReady = value; this.revision++; this.listeners.forEach(fn => fn()); }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getRevision = () => this.revision;
  private canRequest() { return this.entitlements.accessReady && this.entitlements.billingReady && !this.entitlements.has("adFree") && !this.paywalls && (!this.context || this.context.foreground && !this.context.challengeActive && !["pre", "active", "post"].includes(this.context.sessionStage ?? "") && ["/", "/progress", "/result"].includes(this.context.path)); }
  setContext(context: AdContext) {
    this.context = context;
    if (!this.completionAllowed()) this.cancelCompletion();
  }
  allowed(placement: AdPlacement, context: AdContext) {
    return this.canRequest() && context.foreground && !context.challengeActive &&
      context.sessionStage !== "active" && context.sessionStage !== "post" && context.sessionStage !== "pre" &&
      context.path === adPlacements[placement];
  }
  async prepare(isEligible: () => boolean = () => true) {
    if (!this.canRequest() || !isEligible()) return;
    if (this.mode === "preview") { this.ready = true; return; }
    if (this.pending) return this.pending;
    const generation = this.consentGeneration;
    const eligible = () => generation === this.consentGeneration && this.canRequest() && isEligible();
    this.pending = (async () => {
      const sdk = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
      const consent = await sdk.AdsConsent.gatherConsent();
      if (!consent.canRequestAds) { this.ready = false; return; }
      if (!eligible()) { this.ready = false; return; }
      if (!this.initialized) {
        await sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.G });
        if (!eligible()) return;
        await sdk.default().initialize();
        this.initialized = true;
      }
      this.ready = eligible();
    })();
    try { await this.pending; } finally { this.pending = null; }
  }
  async privacyOptions() {
    this.consentGeneration++;
    this.ready = false;
    this.cancelCompletion();
    this.entitlements.refresh();
    if (this.mode === "preview") return;
    const sdk = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
    await sdk.AdsConsent.showPrivacyOptionsForm();
    this.ready = this.initialized && (await sdk.AdsConsent.getConsentInfo()).canRequestAds && this.canRequest();
  }
  paywallOpened() { this.paywalls++; this.cancelCompletion(); return () => { this.paywalls = Math.max(0, this.paywalls - 1); this.frequency.lastPaywall = this.now(); this.persist(); }; }
  private persist() { try { this.storage?.write(this.frequency); } catch { this.blocked = true; } }
  private completionAllowed() {
    return this.canRequest() && this.ready && !this.showing && this.context?.path === "/result" && this.context.foreground && this.context.sessionStage === "result" && !this.context.challengeActive;
  }
  private withinCaps() {
    const now = this.now(), f = this.frequency, policy = productConfig.interstitial;
    if (this.blocked || now < f.highWater) return false;
    f.highWater = now;
    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== f.day) { f.day = day; f.shown = 0; }
    return now - this.startedAt >= policy.minAppAgeMs && (!f.lastAd || now - f.lastAd >= policy.cooldownMs) && (!f.lastPaywall || now - f.lastPaywall >= policy.paywallCooldownMs) && f.shown < policy.maxPerDay && f.count >= policy.everyCompletions;
  }
  prepareCompletion(id: string) {
    if (this.mode === "preview" || !this.completionAllowed() || this.frequency.seen.includes(id)) return;
    this.frequency.seen = [...this.frequency.seen.slice(-99), id];
    this.frequency.count++;
    const eligible = this.withinCaps(); this.persist();
    if (!eligible || this.blocked) return;
    this.cancelCompletion();
    try {
    const sdk = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
    const ad = sdk.InterstitialAd.createForAdRequest(adUnit("interstitial", this.mode), { requestNonPersonalizedAdsOnly: true });
    const cleanup: (() => void)[] = [];
    const candidate = { id, loaded: false, show: () => ad.show(), dispose: () => cleanup.splice(0).forEach(fn => fn()) };
    this.candidate = candidate;
    cleanup.push(ad.addAdEventListener(sdk.AdEventType.LOADED, () => { if (this.candidate === candidate && this.completionAllowed()) candidate.loaded = true; else this.cancelCompletion(); }));
    cleanup.push(ad.addAdEventListener(sdk.AdEventType.ERROR, () => { this.finishShowing?.(); this.cancelCompletion(); }));
    cleanup.push(ad.addAdEventListener(sdk.AdEventType.CLOSED, () => { this.finishShowing?.(); this.cancelCompletion(); }));
    if (this.completionAllowed()) ad.load(); else this.cancelCompletion();
    } catch { this.cancelCompletion(); }
  }
  async showCompletion(id: string) {
    const candidate = this.candidate;
    if (!candidate?.loaded || candidate.id !== id || !this.completionAllowed() || !this.withinCaps()) { this.cancelCompletion(); return; }
    this.frequency.lastAd = this.now(); this.frequency.shown++; this.frequency.count = 0; this.persist();
    if (this.blocked) { this.cancelCompletion(); return; }
    this.showing = true;
    await new Promise<void>(resolve => {
      this.finishShowing = () => { this.showing = false; this.finishShowing = undefined; resolve(); };
      try { void candidate.show().catch(() => { this.finishShowing?.(); this.cancelCompletion(); }); }
      catch { this.finishShowing?.(); this.cancelCompletion(); }
    });
  }
  cancelCompletion() { if (this.showing) return; this.candidate?.dispose(); this.candidate = null; }
}
