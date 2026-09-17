import type { SavedRoutine } from "@inout/shared-types";

export const commercialPolicy = Object.freeze({
  freeSavedPatterns: 1,
  freeSavedMixes: 1,
  freeSavedRoutines: 2,
  maxOfflineAgeMs: 72 * 60 * 60 * 1000,
  entitlementId: "pro",
});
export const proCapabilities = [
  "adFree", "unlimitedCustomPatterns", "unlimitedMixes", "unlimitedSavedRoutines",
  "advancedProgress", "advancedInsights", "advancedReminders", "advancedGuidance",
  "premiumAudioVisuals", "futureCloudSync",
] as const;
export type Capability = typeof proCapabilities[number];
export type SubscriptionStatus = "free" | "trial" | "active" | "cancelled" | "billingRetry" | "grace" | "expired";
export interface EntitlementGrant {
  source: "store" | "development";
  status: SubscriptionStatus;
  active: boolean;
  verifiedAt: number;
  expiresAt: number;
  graceUntil: number | null;
}
export interface EntitlementCache {
  read(): unknown;
  write(grant: EntitlementGrant): void;
}
export function validGrant(value: unknown): value is EntitlementGrant {
  if (!value || typeof value !== "object") return false;
  const g = value as EntitlementGrant;
  return ["store", "development"].includes(g.source) &&
    ["free", "trial", "active", "cancelled", "billingRetry", "grace", "expired"].includes(g.status) &&
    typeof g.active === "boolean" && Number.isFinite(g.verifiedAt) && Number.isFinite(g.expiresAt) &&
    (g.graceUntil === null || Number.isFinite(g.graceUntil));
}

export class EntitlementService {
  private grant: EntitlementGrant | null = null;
  private listeners = new Set<() => void>();
  private revision = 0;
  constructor(
    readonly development = false,
    private now: () => number = Date.now,
    private cache?: EntitlementCache,
  ) {
    try {
      const saved = cache?.read();
      // Legacy preferences.pro and any persisted mock are never purchase evidence.
      if (validGrant(saved) && saved.source === "store") this.grant = { ...saved };
    } catch { /* Unreadable commercial cache must not block offline practice. */ }
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getRevision = () => this.revision;
  refresh = () => { this.revision++; this.listeners.forEach((fn) => fn()); };
  get state() {
    const g = this.grant;
    const now = this.now();
    const deadline = g?.status === "grace" ? Math.max(g.expiresAt, g.graceUntil ?? 0) : g?.expiresAt ?? 0;
    const fresh = !!g && now >= g.verifiedAt && now - g.verifiedAt < commercialPolicy.maxOfflineAgeMs;
    const pro = !!g && g.active && fresh && now < deadline && !["free", "expired"].includes(g.status);
    return {
      pro,
      source: g?.source ?? "unconfigured",
      status: pro ? g!.status : g && g.status !== "free" ? "expired" as const : "free" as const,
      expiresAt: deadline || null,
      needsRefresh: !!g && !fresh,
    };
  }
  has(capability: Capability): boolean { return proCapabilities.includes(capability) && this.state.pro; }
  /** Only an isolated store adapter may call this after obtaining CustomerInfo. */
  acceptStoreGrant(grant: EntitlementGrant) {
    if (!validGrant(grant) || grant.source !== "store") throw new Error("Invalid store entitlement");
    this.grant = { ...grant };
    try { this.cache?.write(this.grant); } catch { /* Live grant remains usable; next launch refreshes. */ }
    this.refresh();
  }
  simulate(status: SubscriptionStatus) {
    if (!this.development) throw new Error("Development entitlements are disabled");
    const now = this.now();
    this.acceptDevelopmentGrant({ source: "development", status, active: !["free", "expired"].includes(status),
      verifiedAt: now, expiresAt: status === "expired" ? now - 1 : now + 24 * 60 * 60 * 1000,
      graceUntil: status === "grace" ? now + 48 * 60 * 60 * 1000 : null });
  }
  acceptDevelopmentGrant(grant: EntitlementGrant) {
    if (!this.development || !validGrant(grant) || grant.source !== "development") throw new Error("Development entitlements are disabled");
    this.grant = { ...grant };
    this.refresh();
  }
  routineAccess(kind: SavedRoutine["kind"], routines: readonly SavedRoutine[], id?: string) {
    const existing = id ? routines.find((r) => r.id === id) : undefined;
    if (existing) return { allowed: existing.kind === kind, message: existing.kind === kind ? "" : "A saved routine cannot change type." };
    const capability = kind === "pattern" ? "unlimitedCustomPatterns" : "unlimitedMixes";
    const limit = kind === "pattern" ? commercialPolicy.freeSavedPatterns : commercialPolicy.freeSavedMixes;
    const allowed = (this.has(capability) || routines.filter((r) => r.kind === kind).length < limit) &&
      (this.has("unlimitedSavedRoutines") || routines.length < commercialPolicy.freeSavedRoutines);
    return { allowed, message: allowed ? "" : `Free includes ${limit} saved ${kind === "pattern" ? "pattern" : "mix"}. Edit an existing routine, use this draft without saving, or explore Pro.` };
  }
}
