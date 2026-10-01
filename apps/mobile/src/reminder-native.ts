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
export function nativeReminderAdapter(): ReminderAdapter {
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
        content: { title: "IN/OUT", body: t("A moment to breathe, when it suits you."), sound: false,
          data: { reminderId: reminder.id } },
        trigger: { type: sdk.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: reminder.hour, minute: reminder.minute, channelId },
      });
    },
  };
}
