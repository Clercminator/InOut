import { validateShare, type SharedPractice } from "@inout/sharing";
export interface ManagedShare { id: string; secret: string; createdAt: number; expiresAt: number; label?: string; snapshot?: SharedPractice }
export function validateManagedShares(value: unknown): asserts value is ManagedShare[] {
  if (!Array.isArray(value) || value.length > 100) throw Error("Shared links could not be read. Your data has been preserved.");
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.id !== "string" || typeof item.secret !== "string" || !/^[a-f0-9]{32}$/.test(item.id) || !/^[a-f0-9]{64}$/.test(item.secret) || !Number.isSafeInteger(item.createdAt) || !Number.isFinite(item.expiresAt) || ids.has(item.id)) throw Error("Shared links could not be read. Your data has been preserved.");
    if (item.label !== undefined && (typeof item.label !== "string" || item.label.length > 80)) throw Error("Shared links could not be read. Your data has been preserved.");
    if (item.snapshot) validateShare(item.snapshot);
    ids.add(item.id);
  }
}
export class ShareLinksService {
  items: ManagedShare[] = [];
  busy = false;
  message = "";
  private readable = true;
  private revision = 0;
  private listeners = new Set<() => void>();
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getRevision = () => this.revision;
  private emit() { this.revision++; this.listeners.forEach(fn => fn()); }
  constructor(private store: { read(): ManagedShare[]; write(items: ManagedShare[]): void },
    private adapter: { create(item: ManagedShare): Promise<{ id: string; expiresAt: number }>; revoke(item: ManagedShare): Promise<void>; identity(): Promise<{ id: string; secret: string; createdAt: number }> }, private now = Date.now) { this.reload(); }
  reload() {
    if (this.busy) return;
    try { const items = this.store.read(); validateManagedShares(items); this.items = items; this.readable = true; this.message = ""; }
    catch { this.readable = false; this.message = "Shared links could not be read. Your data has been preserved."; }
    this.emit();
  }
  private persist(items: ManagedShare[]) { validateManagedShares(items); this.store.write(items); this.items = items; }
  async create(snapshot: SharedPractice, label?: string) {
    if (this.busy || !this.readable) return null;
    this.busy = true; this.message = ""; this.emit();
    try {
      const active = this.items.filter(item => item.expiresAt > this.now());
      if (active.length >= 100) throw Error("Revoke an existing link before creating another.");
      const identity = await this.adapter.identity();
      const item = { ...identity, label: label?.slice(0, 80), expiresAt: identity.createdAt + 30 * 86400000, snapshot: validateShare(snapshot) };
      // Persist the revocation secret before any network write, including uncertain responses.
      this.persist([...active, item]);
      return await this.publish(item);
    } catch (error) { this.message = error instanceof Error ? error.message : "Could not create the link. Try again."; return null; }
    finally { this.busy = false; this.emit(); }
  }
  private async publish(item: ManagedShare) {
    const remote = await this.adapter.create(item);
    if (remote.id !== item.id || !Number.isFinite(remote.expiresAt) || remote.expiresAt > item.createdAt + 30 * 86400000) throw Error("Could not verify the shared link.");
    const saved = { ...item, expiresAt: remote.expiresAt, snapshot: undefined };
    this.persist(this.items.map(row => row.id === item.id ? saved : row));
    return saved;
  }
  async retry(id: string) {
    const item = this.items.find(row => row.id === id && row.snapshot);
    if (this.busy || !this.readable || !item) return null;
    this.busy = true; this.message = ""; this.emit();
    try { return await this.publish(item); }
    catch (error) { this.message = error instanceof Error ? error.message : "Could not create the link. Try again."; return null; }
    finally { this.busy = false; this.emit(); }
  }
  async revoke(id: string) {
    const item = this.items.find(row => row.id === id);
    if (this.busy || !this.readable || !item) return false;
    this.busy = true; this.message = ""; this.emit();
    try {
      await this.adapter.revoke(item);
      this.persist(this.items.filter(row => row.id !== id));
      this.message = "Link revoked. It can no longer be opened.";
      return true;
    } catch { this.message = "Could not revoke the link. Your controls are preserved; try again online."; return false; }
    finally { this.busy = false; this.emit(); }
  }
}
