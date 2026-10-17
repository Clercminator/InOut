import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as Notifications from "expo-notifications";
import type { ReminderAdapter } from "./reminders";
import { t } from "./i18n";

export function notifications(): typeof Notifications | null {
  if (Constants.executionEnvironment === "storeClient" || Platform.OS === "web") return null;
  return require("expo-notifications") as typeof Notifications;
}
const channelId = "practice-reminders";
const dailyResetPrefix = "inout-daily-reset:";
export interface DailyResetSchedule { enabled: boolean; hour: number; minute: number; weekdays: number[]; }
export function nativeReminderAdapter(message: () => string = () => "A moment to breathe, when it suits you."): ReminderAdapter {
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
      await sdk.scheduleNotificationAsync({ identifier: id,
        content: { title: "IN/OUT", body: t(message()), sound: false, color: "#5B2DFF",
          data: { notificationType: "practice-reminder", reminderId: reminder.id } },
        trigger: { type: sdk.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: reminder.hour, minute: reminder.minute, channelId },
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
