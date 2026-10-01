export interface Reminder {
  id: string;
  label: string;
  hour: number;
  minute: number;
  weekdays: number[];
  ritualId?: string;
  enabled: boolean;
}
export interface ReminderAdapter {
  permission(request: boolean): Promise<boolean>;
  list(): Promise<string[]>;
  cancel(id: string): Promise<void>;
  schedule(id: string, reminder: Reminder, weekday: number): Promise<void>;
}
export const reminderPrefix = "inout-reminder:";
export function validateReminders(value: unknown): asserts value is Reminder[] {
  if (!Array.isArray(value) || value.length > 5) throw new Error("Choose up to five reminders.");
  const ids = new Set<string>();
  for (const r of value) {
    if (!r || typeof r.id !== "string" || !/^[\w-]{1,80}$/.test(r.id) || ids.has(r.id) ||
      typeof r.label !== "string" || !r.label.trim() || r.label.length > 40 || typeof r.enabled !== "boolean" ||
      !Number.isInteger(r.hour) || r.hour < 0 || r.hour > 23 || !Number.isInteger(r.minute) || r.minute < 0 || r.minute > 59 ||
      !Array.isArray(r.weekdays) || !r.weekdays.length || r.weekdays.length > 7 || new Set(r.weekdays).size !== r.weekdays.length ||
      r.weekdays.some((d: unknown) => !Number.isInteger(d) || Number(d) < 1 || Number(d) > 7) ||
      (r.ritualId !== undefined && (typeof r.ritualId !== "string" || r.ritualId.length > 80))) throw new Error("Check the reminder time and days.");
    ids.add(r.id);
  }
}
export class ReminderService {
  items: Reminder[] = [];
  busy = false;
  message = "";
  private revision = 0;
  private listeners = new Set<() => void>();
  private rerun = false;
  private readable = true;
  private generation = 0;
  invalidate() { this.generation++; void this.reconcile(); }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getRevision = () => this.revision;
  private emit() { this.revision++; this.listeners.forEach(fn => fn()); }
  constructor(private storage: { read(): Reminder[]; write(items: Reminder[]): void }, private adapter: ReminderAdapter,
    private hasPro: () => boolean, private ritualIds: () => string[]) {
    try { const items = storage.read(); validateReminders(items); this.items = items; } catch { this.readable = false; this.message = "Reminders could not be read. Your saved data has been preserved."; }
  }
  async save(reminder: Reminder) {
    if (this.busy || !this.readable) return false;
    const existing = this.items.some(r => r.id === reminder.id);
    if (!existing && this.items.length >= (this.hasPro() ? 5 : 1)) {
      this.message = "Free includes one reminder. Pro includes up to five. Existing reminders remain available."; this.emit(); return false;
    }
    const next = [...this.items.filter(r => r.id !== reminder.id), reminder];
    return this.change(next, reminder.enabled);
  }
  async remove(id: string) { return this.change(this.items.filter(r => r.id !== id), false); }
  private async change(next: Reminder[], request: boolean) {
    if (this.busy || !this.readable) return false;
    const generation = this.generation;
    this.busy = true; this.message = ""; this.emit();
    try {
      validateReminders(next);
      if (request && !await this.adapter.permission(true)) throw new Error("Notifications are off. Enable them in phone settings, then try again.");
      if (generation !== this.generation) return false;
      this.storage.write(next);
      this.items = next;
      await this.schedule();
      this.message = "Reminder changes saved on this phone.";
      return true;
    } catch (error) {
      this.message = error instanceof Error ? error.message : "Reminders could not be scheduled. Try again.";
      return false;
    } finally { this.busy = false; this.emit(); if (this.rerun) { this.rerun = false; void this.reconcile(); } }
  }
  async reconcile() {
    if (this.busy) { this.rerun = true; return; }
    this.busy = true; this.emit();
    try {
      this.readable = false;
      const items = this.storage.read(); validateReminders(items); this.items = items; this.readable = true;
      await this.schedule(); this.message = "";
    } catch (error) { this.message = error instanceof Error ? error.message : "Reminders could not be scheduled. Try again."; }
    finally { this.busy = false; this.emit(); if (this.rerun) { this.rerun = false; void this.reconcile(); } }
  }
  private async schedule() {
    try {
      for (const id of await this.adapter.list()) if (id.startsWith(reminderPrefix)) await this.adapter.cancel(id);
      const active = this.items.filter(r => r.enabled);
      if (!active.length) return;
      if (!await this.adapter.permission(false)) throw new Error("Notifications are off. Enable them in phone settings, then try again.");
      const rituals = this.ritualIds();
      for (const r of active) {
        if (r.ritualId && !rituals.includes(r.ritualId)) continue;
        for (const weekday of r.weekdays) await this.adapter.schedule(`${reminderPrefix}${r.id}:${weekday}`, r, weekday);
      }
    } catch (error) {
      // Best effort removal avoids silently leaving a partially updated schedule.
      try { for (const id of await this.adapter.list()) if (id.startsWith(reminderPrefix)) await this.adapter.cancel(id); } catch {}
      throw error;
    }
  }
}
