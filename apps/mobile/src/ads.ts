import { EntitlementService } from "./entitlements";

export const adPlacements = { today: "/", progress: "/progress" } as const;
export type AdPlacement = keyof typeof adPlacements;
export interface AdContext { path: string; foreground: boolean; sessionStage: string | null; }
export class AdService {
  private currentReady = false;
  private revision = 0;
  private listeners = new Set<() => void>();
  get ready() { return this.currentReady; }
  set ready(value: boolean) {
    if (this.currentReady === value) return;
    this.currentReady = value;
    this.revision++;
    this.listeners.forEach(listener => listener());
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getRevision = () => this.revision;
  private pending: Promise<void> | null = null;
  constructor(private entitlements: EntitlementService, readonly mode: "test" | "live" | "preview") {}
  allowed(placement: AdPlacement, context: AdContext) {
    return this.entitlements.accessReady && !this.entitlements.has("adFree") && context.foreground &&
      context.sessionStage !== "active" && context.sessionStage !== "post" &&
      context.path === adPlacements[placement];
  }
  async prepare(isEligible: () => boolean = () => true) {
    if (!this.entitlements.accessReady || this.entitlements.has("adFree") || !isEligible()) return;
    if (this.mode === "preview") { this.ready = true; return; }
    if (this.pending) return this.pending;
    this.pending = (async () => {
      const sdk = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
      // Demo inventory cannot use an owner's UMP message before their AdMob app exists.
      // Live inventory always requires UMP eligibility; test mode can only render TestIds.BANNER.
      if (this.mode === "live") {
        const consent = await sdk.AdsConsent.gatherConsent();
        if (!consent.canRequestAds) { this.ready = false; return; }
      }
      if (this.entitlements.has("adFree") || !isEligible()) { this.ready = false; return; }
      await sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.G });
      if (this.entitlements.has("adFree") || !isEligible()) return;
      await sdk.default().initialize();
      this.ready = !this.entitlements.has("adFree") && isEligible();
    })();
    try { await this.pending; } finally { this.pending = null; }
  }
  async privacyOptions() {
    this.ready = false;
    this.entitlements.refresh();
    if (this.mode === "preview") return;
    const sdk = require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");
    await sdk.AdsConsent.showPrivacyOptionsForm();
    this.ready = (await sdk.AdsConsent.getConsentInfo()).canRequestAds && !this.entitlements.has("adFree");
    this.entitlements.refresh();
  }
}
