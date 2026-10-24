import { notificationCopy } from "./notification-content";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as Notifications from "expo-notifications";
import type { ReminderAdapter } from "./reminders";
import { t } from "./i18n";
import {
  buildEngagementSchedule, checkInCategory, engagementNotificationPrefix,
  notificationDayKey, notificationPreferences, notificationTime, validateNotificationPreferences,
  type LocalNotificationPreferences, type NotificationContext,
} from "./local-notifications";
import type { Preferences } from "@inout/shared-types";

export function notifications(): typeof Notifications | null {
  if (Constants.executionEnvironment === "storeClient" || Platform.OS === "web") return null;
  return require("expo-notifications") as typeof Notifications;
}
const channelId = "practice-reminders";
const dailyResetPrefix = "inout-daily-reset:";
const achievementPrefix = "inout-achievement:";
export interface DailyResetSchedule { enabled: boolean; hour: number; minute: number; weekdays: number[]; }
export function nativeReminderAdapter(
  message: () => string = () => "A moment to breathe, when it suits you.",
  quietHours: () => Pick<LocalNotificationPreferences, "quietHoursEnabled" | "quietStartHour" | "quietEndHour" | "quietStartMinute" | "quietEndMinute"> =
    () => ({ quietHoursEnabled: false, quietStartHour: 22, quietEndHour: 8 }),
  lastPracticeAt: () => number | null = () => null,
): ReminderAdapter {
  return {
    async permission(request) {
      const sdk = notifications();
      if (!sdk) { if (request) throw new Error("Reminders need an installed native build. They are unavailable in Expo Go."); return false; }
      if (Platform.OS === "android") await sdk.setNotificationChannelAsync(channelId, {
        name: t("Practice reminders"), importance: sdk.AndroidImportance.DEFAULT, sound: null, enableVibrate: false,
      });
      let status = await sdk.getPermissionsAsync();
      if (!status.granted && request && status.canAskAgain) status = await sdk.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: false } });
      return status.granted || status.ios?.status === sdk.IosAuthorizationStatus.PROVISIONAL;
    },
    async list() { return (await notifications()?.getAllScheduledNotificationsAsync() ?? []).map(n => n.identifier); },
    async cancel(id) { await notifications()?.cancelScheduledNotificationAsync(id); },
    async schedule(id, reminder, weekday) {
      const sdk = notifications();
      if (!sdk) throw new Error("Reminders need an installed native build. They are unavailable in Expo Go.");
      const now = new Date();
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      day.setDate(day.getDate() + (weekday - (day.getDay() + 1) + 7) % 7);
      let adjusted = notificationTime(day, reminder.hour, reminder.minute, { ...quietHours(), weekdays: reminder.weekdays });
      if (adjusted.getTime() <= now.getTime() + 60_000) {
        day.setDate(day.getDate() + 7);
        adjusted = notificationTime(day, reminder.hour, reminder.minute, { ...quietHours(), weekdays: reminder.weekdays });
      }
      if (adjusted.getTime() > now.getTime() + 7 * 86400000) return;
      const practice = lastPracticeAt();
      if (practice !== null && notificationDayKey(adjusted) === notificationDayKey(new Date(practice))) return;
      const existing = await sdk.getAllScheduledNotificationsAsync();
      // User schedules take priority; overlapping saved reminders share one daily slot.
      if (existing.some(item => item.identifier.startsWith("inout-reminder:") && typeof item.content.data?.scheduledFor === "string" && notificationDayKey(new Date(item.content.data.scheduledFor)) === notificationDayKey(adjusted))) return;
      await sdk.scheduleNotificationAsync({ identifier: id,
        content: { title: "IN/OUT", body: t(message()), sound: false, color: "#5B2DFF",
          data: { notificationType: "practice-reminder", reminderId: reminder.id, scheduledFor: adjusted.toISOString() } },
        trigger: { type: sdk.SchedulableTriggerInputTypes.DATE, date: adjusted, channelId },
      });
    },
  };
}
export async function scheduleDailyReset(schedule: DailyResetSchedule): Promise<void> {
  if (!schedule || typeof schedule.enabled !== "boolean" ||
    !Number.isInteger(schedule.hour) || schedule.hour < 0 || schedule.hour > 23 ||
    !Number.isInteger(schedule.minute) || schedule.minute < 0 || schedule.minute > 59 ||
    !Array.isArray(schedule.weekdays) || !schedule.weekdays.length || schedule.weekdays.length > 7 ||
    new Set(schedule.weekdays).size !== schedule.weekdays.length ||
    schedule.weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new Error("Choose a valid Daily Reset time and at least one day.");
  }
  const sdk = notifications();
  if (!sdk) throw new Error("Daily Reset reminders need an installed native build.");
  const old = (await sdk.getAllScheduledNotificationsAsync()).filter(item => item.identifier.startsWith(dailyResetPrefix));
  for (const item of old) await sdk.cancelScheduledNotificationAsync(item.identifier);
  if (!schedule.enabled) return;
  if (!await nativeReminderAdapter().permission(false)) throw new Error("Notifications are off. Enable them in phone settings, then try again.");
  const scheduled: string[] = [];
  try {
    for (const weekday of schedule.weekdays) {
      const id = `${dailyResetPrefix}${weekday}`;
      await sdk.scheduleNotificationAsync({
        identifier: id,
        content: { title: "IN/OUT", body: t("A Daily Reset is ready when you are."), sound: false, color: "#5B2DFF",
          data: { notificationType: "daily-reset", destination: "/(tabs)" } },
        trigger: { type: sdk.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: schedule.hour, minute: schedule.minute, channelId },
      });
      scheduled.push(id);
    }
  } catch (error) {
    for (const id of scheduled) {
      try { await sdk.cancelScheduledNotificationAsync(id); } catch { /* Preserve the scheduling error. */ }
    }
    throw error;
  }
}

let configuredEngagementKey = "";
let engagementConfiguration: { key: string; promise: Promise<void> } | null = null;
let engagementQueue: Promise<void> = Promise.resolve();
export function configureEngagementNotifications(preferences: Preferences, requestPermission = false, context?: NotificationContext, force = false): Promise<void> {
  const settings = notificationPreferences(preferences);
  validateNotificationPreferences(settings);
  const today = new Date();
  const key = JSON.stringify([settings.weeklyProgress, settings.dailyReset, settings.motivation, settings.checkIn, settings.achievements,
    settings.hour, settings.minute, settings.weekdays, settings.quietStartHour, settings.quietEndHour,
    settings.quietStartMinute, settings.quietEndMinute, settings.quietHoursEnabled, settings.education, settings.reengagement, settings.promotions, preferences.language, context,
    today.getFullYear(), today.getMonth(), today.getDate(), today.getTimezoneOffset()]);
  if (!force && !requestPermission && configuredEngagementKey === key) return Promise.resolve();
  if (engagementConfiguration?.key === key) return engagementConfiguration.promise;
    const promise = engagementQueue.catch(() => {}).then(() => applyEngagementNotifications(settings, requestPermission, context))
      .then(() => { configuredEngagementKey = key; });
    engagementQueue = promise;
  engagementConfiguration = { key, promise };
  void promise.finally(() => { if (engagementConfiguration?.promise === promise) engagementConfiguration = null; }).catch(() => {});
  return promise;
}

async function applyEngagementNotifications(settings: LocalNotificationPreferences, requestPermission: boolean, context?: NotificationContext): Promise<void> {
  const active = settings.weeklyProgress || settings.dailyReset || settings.motivation || settings.checkIn || settings.achievements || settings.education || settings.reengagement || settings.promotions;
  const sdk = notifications();
  if (!sdk && !active) return;
  if (!sdk) throw new Error("Notifications need an installed native build. They are unavailable in Expo Go.");
  const adapter = nativeReminderAdapter();
  const prior = await sdk.getAllScheduledNotificationsAsync();
  // Remove obsolete conditional prompts even after permission revocation or a Pro grant.
  for (const item of prior) if (item.identifier.startsWith(engagementNotificationPrefix) ||
    item.identifier.startsWith(achievementPrefix)) await sdk.cancelScheduledNotificationAsync(item.identifier);
  if (active && requestPermission && !await adapter.permission(true))
    throw new Error("Notifications are off. Enable them in phone settings, then try again.");
  if (active && !await adapter.permission(false))
    throw new Error("Notifications are off. Enable them in phone settings, then try again.");
  if (settings.checkIn) {
    await sdk.setNotificationCategoryAsync(checkInCategory, [
      { identifier: "LOG_PRACTICE", buttonTitle: t("Yes"), options: { opensAppToForeground: true } },
      { identifier: "DISMISS_CHECK_IN", buttonTitle: t("Not yet"), options: { opensAppToForeground: false } },
    ]);
  }
  const reservedDays = new Set(prior.filter(item => item.identifier.startsWith("inout-reminder:")).flatMap(item => {
    const at = item.content.data?.scheduledFor;
    return typeof at === "string" && Number.isFinite(Date.parse(at)) ? [notificationDayKey(new Date(at))] : [];
  }));
  // Pending earned events must also follow edited times/quiet hours; never invent a new award.
  for (const item of prior.filter(item => settings.achievements && item.identifier.startsWith(achievementPrefix))) {
    const original = item.content.data?.scheduledFor;
    if (typeof original !== "string" || !Number.isFinite(Date.parse(original))) continue;
    const day = new Date(original);
    let at: Date | null = null;
    for (let offset = 0; offset < 8; offset++) {
      const candidateDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + offset);
      if (!settings.weekdays.includes(candidateDay.getDay() + 1)) continue;
      const candidate = notificationTime(candidateDay, settings.hour, settings.minute, settings);
      if (settings.weekdays.includes(candidate.getDay() + 1) && !reservedDays.has(notificationDayKey(candidate)) && candidate.getTime() > Date.now() + 60_000) { at = candidate; break; }
    }
    await sdk.cancelScheduledNotificationAsync(item.identifier);
    if (at) {
      await sdk.scheduleNotificationAsync({ identifier: item.identifier,
        content: { title: "IN/OUT", sound: false, color: "#5B2DFF", body: t(notificationCopy(["achievement"], at)), data: { ...item.content.data, scheduledFor: at.toISOString() } },
        trigger: { type: sdk.SchedulableTriggerInputTypes.DATE, date: at, channelId },
      });
      reservedDays.add(notificationDayKey(at));
    }
  }
  const scheduled: string[] = [];
  try {
    for (const item of buildEngagementSchedule(settings, new Date(), context)) {
      if (reservedDays.has(notificationDayKey(item.date))) continue;
      await sdk.scheduleNotificationAsync({
        identifier: item.id,
        content: {
          title: "IN/OUT", body: t(item.body), sound: false, color: "#5B2DFF",
          ...(item.type === "check-in" ? { categoryIdentifier: checkInCategory } : {}),
          data: { notificationType: item.type, scheduledFor: item.date.toISOString() },
        },
        trigger: { type: sdk.SchedulableTriggerInputTypes.DATE, date: item.date, channelId },
      });
      scheduled.push(item.id);
    }
  } catch (error) {
    for (const id of scheduled) {
      try { await sdk.cancelScheduledNotificationAsync(id); } catch { /* Preserve the scheduling error. */ }
    }
    throw error;
  }

}

export async function scheduleAchievementNotification(
  awardId: string,
  value: LocalNotificationPreferences,
  now = new Date(),
): Promise<number | null> {
  if (!value.achievements) return null;
  validateNotificationPreferences(value);
  if (!/^[\w-]{1,80}$/.test(awardId)) throw new Error("Invalid achievement notification identifier.");
  const cutoff = now.getTime() - 7 * 86400000;
  const recent = (value.achievementNoticeLog ?? []).filter(item => item.at > cutoff);
  if (value.achievementNoticeLog?.some(item => item.id === awardId) || recent.length >= 1) return null;
  const sdk = notifications();
  if (!sdk) throw new Error("Notifications need an installed native build. They are unavailable in Expo Go.");
  if (!await nativeReminderAdapter().permission(false))
    throw new Error("Notifications are off. Enable them in phone settings, then try again.");
  const scheduled = await sdk.getAllScheduledNotificationsAsync();
  const reservedDays = new Set(scheduled.map(item => {
    const date = item.content.data?.scheduledFor;
    return typeof date === "string" ? notificationDayKey(new Date(date)) : "";
  }).filter(Boolean));
  let at: Date | null = null;
  for (let offset = 0; offset < 8 && !at; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!value.weekdays.includes(day.getDay() + 1)) continue;
    const candidate = notificationTime(day, value.hour, value.minute, value);
    if (value.weekdays.includes(candidate.getDay() + 1) && candidate.getTime() > now.getTime() + 60_000 && !reservedDays.has(notificationDayKey(candidate))) at = candidate;
  }
  if (!at) return null;
  const identifier = `${achievementPrefix}${awardId}`;
  await sdk.scheduleNotificationAsync({
    identifier,
    content: {
      title: "IN/OUT", body: t(notificationCopy(["achievement"], at)), sound: false, color: "#5B2DFF",
      data: { notificationType: "achievement", awardId, scheduledFor: at.toISOString() },
    },
    trigger: { type: sdk.SchedulableTriggerInputTypes.DATE, date: at, channelId },
  });
  return at.getTime();
}
