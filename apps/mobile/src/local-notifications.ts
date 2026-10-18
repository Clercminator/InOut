import type { Preferences, SessionRecord } from "@inout/shared-types";
import { practiceDateForPacerTheme } from "./pacer-theme";

export type EngagementNotificationType = "daily-reset" | "motivation" | "check-in" | "education" | "reengagement" | "promotion";
export interface NotificationContext {
  lastPracticeAt: number | null;
  remindersEnabled: boolean;
  pro: boolean;
  billingReady: boolean;
}
const unknownContext: NotificationContext = { lastPracticeAt: null, remindersEnabled: false, pro: true, billingReady: false };
export function notificationContext(records: SessionRecord[], pro: boolean, billingReady: boolean, remindersEnabled: boolean): NotificationContext {
  const eligible = records.filter(record => practiceDateForPacerTheme(record) !== null);
  return { lastPracticeAt: eligible.length ? Math.max(...eligible.map(record => record.finishedAt!)) : null, pro, billingReady, remindersEnabled };
}
export interface LocalNotificationPreferences {
  dailyReset: boolean;
  motivation: boolean;
  checkIn: boolean;
  achievements: boolean;
  education?: boolean;
  reengagement?: boolean;
  promotions?: boolean;
  hour: number;
  minute: number;
  weekdays: number[];
  quietHoursEnabled: boolean;
  quietStartHour: number;
  quietEndHour: number;
  achievementNoticeLog?: Array<{ id: string; at: number }>;
}
export interface EngagementNotification {
  id: string;
  type: EngagementNotificationType;
  date: Date;
  body: string;
}
export const engagementNotificationPrefix = "inout-engagement:";
export const checkInCategory = "inout-check-in";
export const notificationDefaults: LocalNotificationPreferences = {
  dailyReset: false,
  motivation: false,
  checkIn: false,
  achievements: false,
  education: false,
  reengagement: false,
  promotions: false,
  hour: 13,
  minute: 0,
  weekdays: [2, 4, 6],
  quietHoursEnabled: false,
  quietStartHour: 22,
  quietEndHour: 8,
  achievementNoticeLog: [],
};
const motivationalMessages = [
  "A small pause can make room for what matters.",
  "Take a moment for yourself when it fits.",
  "A gentle breath is enough to begin.",
  "Your practice is here whenever you are ready.",
];

export function notificationPreferences(preferences: Preferences): LocalNotificationPreferences {
  const value = preferences.notifications;
  if (!value) return { ...notificationDefaults, weekdays: [...notificationDefaults.weekdays] };
  const settings = { ...notificationDefaults, ...value };
  validateNotificationPreferences(settings);
  return { ...settings, weekdays: [...settings.weekdays], achievementNoticeLog: [...(settings.achievementNoticeLog ?? [])] };
}

export function validateNotificationPreferences(value: LocalNotificationPreferences): void {
  const hour = (n: number) => Number.isInteger(n) && n >= 0 && n <= 23;
  if (!value || typeof value.dailyReset !== "boolean" || typeof value.motivation !== "boolean" ||
    typeof value.checkIn !== "boolean" || typeof value.achievements !== "boolean" ||
    [value.education, value.reengagement, value.promotions].some(flag => flag !== undefined && typeof flag !== "boolean") ||
    !hour(value.hour) || !Number.isInteger(value.minute) || value.minute < 0 || value.minute > 59 ||
    typeof value.quietHoursEnabled !== "boolean" || !hour(value.quietStartHour) || !hour(value.quietEndHour) || value.quietStartHour === value.quietEndHour ||
    !Array.isArray(value.weekdays) || value.weekdays.length > 3 ||
    new Set(value.weekdays).size !== value.weekdays.length ||
    value.weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7) ||
    (value.achievementNoticeLog !== undefined && (!Array.isArray(value.achievementNoticeLog) || value.achievementNoticeLog.length > 100 ||
      value.achievementNoticeLog.some(item => !item || !/^[\w-]{1,80}$/.test(item.id) || !Number.isFinite(item.at))))) {
    throw new Error("Check notification days, times, and quiet hours.");
  }
}

export function notificationDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function nextAllowedTime(date: Date, hour: number, minute: number, quietStart: number, quietEnd: number) {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  const currentHour = result.getHours();
  const inQuiet = quietStart < quietEnd
    ? currentHour >= quietStart && currentHour < quietEnd
    : currentHour >= quietStart || currentHour < quietEnd;
  if (inQuiet) {
    if (quietStart < quietEnd || currentHour < quietEnd) result.setHours(quietEnd, 0, 0, 0);
    else { result.setDate(result.getDate() + 1); result.setHours(quietEnd, 0, 0, 0); }
  }
  return result;
}
export function notificationTime(
  date: Date,
  hour: number,
  minute: number,
  settings: Pick<LocalNotificationPreferences, "quietHoursEnabled" | "quietStartHour" | "quietEndHour">,
) {
  if (settings.quietHoursEnabled) return nextAllowedTime(date, hour, minute, settings.quietStartHour, settings.quietEndHour);
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}
function messageFor(type: EngagementNotificationType, date: Date, weekIndex: number) {
  if (type === "daily-reset") return "A Daily Reset is ready when you are.";
  if (type === "check-in") return "Did you practice mindful breathing today?";
  if (type === "education") return "Gentle, paced breathing may help you relax. Keep each breath comfortable.";
  if (type === "reengagement") return "Your space to breathe is still here. Return with a short practice when it suits you.";
  if (type === "promotion") return "Explore guided programs and every pacer theme with IN/OUT Pro. Your free practice is always here.";
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return motivationalMessages[(dayOfYear + weekIndex) % motivationalMessages.length];
}

export function buildEngagementSchedule(value: LocalNotificationPreferences, now = new Date(), context: NotificationContext = unknownContext): EngagementNotification[] {
  validateNotificationPreferences(value);
  const active: EngagementNotificationType[] = [
    ...(value.dailyReset ? ["daily-reset" as const] : []),
    ...(value.motivation ? ["motivation" as const] : []),
    ...(value.checkIn ? ["check-in" as const] : []),
    ...(value.education ? ["education" as const] : []),
    ...(value.reengagement && context.remindersEnabled && context.lastPracticeAt !== null && now.getTime() - context.lastPracticeAt >= 3 * 86400000 ? ["reengagement" as const] : []),
  ];
  const promotions = value.promotions && context.billingReady && !context.pro;
  if (!active.length && !promotions) return [];
  const candidates: Date[] = [];
  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const weekday = day.getDay() + 1;
    if (!value.weekdays.includes(weekday)) continue;
    const at = notificationTime(day, value.hour, value.minute, value);
    if (at.getTime() > now.getTime() + 60_000) candidates.push(at);
  }
  const uniqueDays = new Map<string, Date>();
  for (const candidate of candidates) if (!uniqueDays.has(notificationDayKey(candidate))) uniqueDays.set(notificationDayKey(candidate), candidate);
  // Calendar rotation is stable across launches, but gives each enabled category a turn.
  // Promotions occupy at most one selected slot per four calendar weeks.
  let promoted = false;
  return [...uniqueDays.values()].slice(0, 3).flatMap((date, index) => {
    const week = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2026, 0, 5)) / (7 * 86400000));
    const promotionSlot = promotions && !promoted && week % 4 === 0 && date.getDay() + 1 === Math.min(...value.weekdays);
    if (!active.length && !promotionSlot) return [];
    const type = promotionSlot ? "promotion" : active[((week * 3 + index) % active.length + active.length) % active.length];
    if (promotionSlot) promoted = true;
    const time = `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
    return { id: `${engagementNotificationPrefix}${notificationDayKey(date)}:${time}:${type}`, type, date, body: messageFor(type, date, index) };
  });
}
