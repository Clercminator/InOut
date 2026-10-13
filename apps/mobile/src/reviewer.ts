import type { EntitlementService } from "./entitlements";
export const reviewerOfflineMs = 60 * 60 * 1000;
export interface ReviewerGrant { token: string; expiresAt: number; serverTime: number; validatedAt: number; }
interface SavedReviewer { installationId: string; grant: ReviewerGrant | null; highWater: number; }
export interface ReviewerStorage { read(): Promise<string | null>; write(value: string): Promise<void>; }
export class ReviewerError extends Error { constructor(readonly status: number) { super("Reviewer request failed"); } }
export type ReviewerRequest = (body: object) => Promise<{ token: string; expiresAt: number; serverTime: number }>;
export class ReviewerService {
  busy = false;
  private notice = "";
  get message() {
    return this.notice === "Reviewer access enabled. Pro features are now available on this device." && !this.entitlements.state.reviewerPro
      ? "Reviewer access has expired. Connect and enter a valid review code." : this.notice;
  }
  set message(value: string) { this.notice = value; }
  ready = false;
  private saved: SavedReviewer | null = null;
  private revision = 0;
  private listeners = new Set<() => void>();
  private initialization?: Promise<void>;
  private generation = 0;
  private writing: Promise<void> = Promise.resolve();
  constructor(private storage: ReviewerStorage, private request: ReviewerRequest, private uuid: () => string,
    private entitlements: EntitlementService, private now = Date.now) {
    entitlements.accessReady = false;
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getRevision = () => this.revision;
  private emit() { this.revision++; this.listeners.forEach(fn => fn()); }
  private persist() {
    const data = JSON.stringify(this.saved);
    const writing = this.writing.catch(() => {}).then(() => this.storage.write(data));
    this.writing = writing;
    return writing;
  }
  initialize(): Promise<void> {
    return this.initialization ??= (async () => {
      try {
        const value = await this.storage.read();
        const saved = value ? JSON.parse(value) : null;
        if (saved && /^[a-f0-9-]{36}$/.test(saved.installationId) && Number.isFinite(saved.highWater)) this.saved = saved as SavedReviewer;
        else this.saved = { installationId: this.uuid(), grant: null, highWater: this.now() };
        if (!this.valid(this.saved.grant) || this.now() < this.saved.highWater) this.saved.grant = null;
        this.saved.highWater = Math.max(this.saved.highWater, this.now());
        await this.persist();
        this.apply();
      } catch { this.saved = null; this.entitlements.acceptReviewerGrant(null); }
      finally { this.ready = true; this.entitlements.accessReady = true; this.entitlements.refresh(); this.emit(); }
    })();
  }
  private valid(g: ReviewerGrant | null): g is ReviewerGrant {
    return !!g && /^[a-f0-9]{64}$/.test(g.token) && [g.expiresAt, g.serverTime, g.validatedAt].every(Number.isFinite)
      && g.expiresAt > g.serverTime && g.expiresAt - g.serverTime <= 7 * 86400000
      && Math.abs(g.serverTime - g.validatedAt) <= 5 * 60000;
  }
  private apply() {
    const g = this.saved?.grant;
    this.entitlements.acceptReviewerGrant(g && this.valid(g) ? {
      verifiedAt: g.validatedAt,
      // Never extend beyond the absolute server deadline, even with a slow device clock.
      expiresAt: Math.min(g.expiresAt, g.validatedAt + g.expiresAt - g.serverTime, g.validatedAt + reviewerOfflineMs),
    } : null);
  }
  async checkpoint() {
    if (!this.saved?.grant) return;
    if (this.now() < this.saved.highWater) { this.saved.grant = null; this.entitlements.acceptReviewerGrant(null); }
    this.saved.highWater = Math.max(this.saved.highWater, this.now());
    try { await this.persist(); } catch { this.saved.grant = null; this.entitlements.acceptReviewerGrant(null); }
  }
  async activate(code: string) { await this.run(code); }
  async refresh() { await this.run(); }
  private async run(code?: string) {
    await this.initialize();
    if (this.busy) return;
    this.busy = true; this.message = ""; this.emit();
    const generation = this.generation;
    try {
      if (!this.saved) throw new Error("Secure storage unavailable");
      await this.checkpoint();
      if (code === undefined && !this.saved.grant) return;
      const result = await this.request({ action: code === undefined ? "validate" : "redeem", installationId: this.saved.installationId,
        ...(code === undefined ? { token: this.saved.grant!.token } : { code: code.trim() }) });
      const grant = { ...result, validatedAt: this.now() };
      if (generation !== this.generation) return;
      if (!this.valid(grant) || this.now() < this.saved.highWater) throw new Error("Check device clock");
      this.saved.grant = grant; this.saved.highWater = this.now();
      await this.persist(); this.apply();
      this.message = "Reviewer access enabled. Pro features are now available on this device.";
    } catch (error) {
      if (error instanceof ReviewerError && error.status === 403) {
        if (this.saved) { this.saved.grant = null; await this.persist().catch(() => {}); }
        this.entitlements.acceptReviewerGrant(null);
        this.message = "Invalid or unavailable review code.";
      } else this.message = error instanceof ReviewerError && error.status === 429
        ? "Too many attempts. Try again later." : "Reviewer access could not be verified. Check your connection and device clock, then try again.";
    } finally { this.busy = false; this.emit(); }
  }
  async clear() {
    this.generation++;
    await this.initialize();
    if (this.saved) this.saved.grant = null;
    this.entitlements.acceptReviewerGrant(null);
    await this.persist(); this.message = ""; this.emit();
  }
}
