import { protocols } from "@inout/protocols";
import type { SessionRecord } from "@inout/shared-types";
import { dayKey } from "./progress";

export const dailyResetProtocol = () => ({ ...protocols.find(p => p.id === "coherent")!, defaultCycles: 6, defaultDuration: 60000 });
export interface DailyCredit { sessionId: string; localDay: string; finishedAt: number }
export interface DailyResetState { version: 1; credits: DailyCredit[] }
export const emptyDailyReset = (): DailyResetState => ({ version: 1, credits: [] });
export const calendarDay = (day: string) => Date.parse(day + "T12:00:00Z") / 86400000;
export function validLocalDay(day: unknown): day is string {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(calendarDay(day)) && new Date(day + "T12:00:00Z").toISOString().slice(0, 10) === day;
}
export function validateDailyReset(value: unknown): asserts value is DailyResetState {
  const s = value as DailyResetState;
  if (!s || s.version !== 1 || !Array.isArray(s.credits) || s.credits.some(c => !c || !c.sessionId || !validLocalDay(c.localDay) || !Number.isFinite(c.finishedAt)) || new Set(s.credits.map(c => c.localDay)).size !== s.credits.length || new Set(s.credits.map(c => c.sessionId)).size !== s.credits.length) throw Error("Invalid Daily Reset history");
}
export function isDailyResetCompletion(r: SessionRecord) {
  return r.dailyReset === true && r.source !== "manual" && r.stage === "result" && r.endReason === "completed" && r.protocolId === "coherent" && r.engine.status === "completed" && r.engine.elapsedAtAnchor >= 60000 && Number.isFinite(r.finishedAt) && r.finishedAt! >= r.engine.startedAt;
}
export function creditDailyReset(state: DailyResetState, r: SessionRecord): DailyResetState {
  if (!isDailyResetCompletion(r)) return state;
  const localDay = r.completionLocalDay ?? dayKey(new Date(r.finishedAt!));
  if (state.credits.some(c => c.localDay === localDay || c.sessionId === r.id)) return state;
  const next = { ...state, credits: [...state.credits, { sessionId: r.id, localDay, finishedAt: r.finishedAt! }] };
  validateDailyReset(next); return next;
}
// Dates are frozen on completion. Calendar arithmetic is independent of DST and travel.
export function dailyResetStats(state: DailyResetState, today = dayKey(new Date())) {
  const days = [...new Set(state.credits.map(c => c.localDay))].filter(d => d <= today).sort();
  let best = 0, run = 0, previous = -Infinity;
  for (const d of days) { const n = calendarDay(d); run = n === previous + 1 ? run + 1 : 1; best = Math.max(best, run); previous = n; }
  const numbers = new Set(days.map(calendarDay)), at = calendarDay(today);
  let cursor = numbers.has(at) ? at : at - 1, current = 0;
  while (numbers.has(cursor--)) current++;
  return { current, best, total: days.length, todayComplete: numbers.has(at), week: days.filter(d => calendarDay(d) > at - 7).length };
}
