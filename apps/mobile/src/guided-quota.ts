/** UTC calendar months avoid timezone travel changing an allowance boundary. */
export const quotaMonth = (now: number) => new Date(now).toISOString().slice(0, 7);
export interface GuidedUsage { month: string; sessionIds: string[] }
export function currentUsage(saved: GuidedUsage | null, now: number): GuidedUsage {
  const month = quotaMonth(now);
  if (saved && (!/^\d{4}-\d{2}$/.test(saved.month) || !Array.isArray(saved.sessionIds) || saved.sessionIds.some(id => typeof id !== "string"))) throw Error("Guided allowance could not be read.");
  // Clock rollback cannot grant a second allowance in an earlier month.
  return saved && saved.month >= month ? saved : { month, sessionIds: [] };
}
export function reserveGuidance(saved: GuidedUsage | null, id: string, now: number, limit: number): GuidedUsage {
  const usage = currentUsage(saved, now);
  if (usage.sessionIds.includes(id)) return usage;
  if (!Number.isInteger(limit) || limit < 0 || usage.sessionIds.length >= limit) throw Error("Your guided allowance is used. Breathing with tones remains available.");
  return { ...usage, sessionIds: [...usage.sessionIds, id] };
}
