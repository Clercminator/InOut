import { useRef, useState } from "react";
import { Linking, View } from "react-native";
import { Switch, Alert } from "./localized-native";
import { t, locale } from "./i18n";
import { useLanguage } from "./use-language";
import { useTheme } from "./theme";
import { useSession } from "./provider";
import { useReminders } from "./reminder-context";
import { Button, Card, Chip, Copy, Label, Disclosure, useStyles } from "./ui";
import { SessionDatePicker } from "./session-date-picker";
import { notificationContext, notificationDefaults, notificationPreferences, validateNotificationPreferences, type LocalNotificationPreferences } from "./local-notifications";
import { configureEngagementNotifications, nativeReminderAdapter } from "./reminder-native";

export function NotificationSettings() {
  useLanguage();
  const { colors } = useTheme();
  const s = useStyles();
  const controller = useSession();
  const reminders = useReminders();
  const [notificationError, setNotificationError] = useState("");
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const notificationSaveLock = useRef(false);
  const preferences = controller.preferences;
  const notificationSettings = notificationPreferences(preferences);
  const saveNotificationSettings = async (next: LocalNotificationPreferences) => {
    if (notificationSaveLock.current) return;
    notificationSaveLock.current = true;
    setSavingNotificationSettings(true);
    setNotificationError("");
    try {
      validateNotificationPreferences(next);
      const wantsNotifications = next.dailyReset || next.motivation || next.checkIn || next.achievements || next.education || next.reengagement || next.promotions;
      if (wantsNotifications && !await nativeReminderAdapter().permission(true))
        throw new Error("Notifications are off. Enable them in phone settings, then try again.");
      controller.setPreferences({ ...controller.preferences, notifications: next });
      if (controller.error) throw new Error(controller.error);
      await configureEngagementNotifications({ ...controller.preferences, notifications: next }, false,
        notificationContext(controller.history(), controller.entitlements.state.pro, controller.entitlements.billingReady,
          !!reminders?.items.some(item => item.enabled) || next.dailyReset));
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : "Notification settings could not be saved. Try again.");
    } finally {
      notificationSaveLock.current = false;
      setSavingNotificationSettings(false);
    }
  };
  return (
      <View style={{ gap: 16 }}>
        <Copy style={s.small}>Optional local notifications stay on this phone. They are off until you enable a category. Scheduled prompts are limited to three days each week; achievement alerts are limited to one each week.</Copy>
        {([
          ["dailyReset", "Daily Reset"],
          ["motivation", "Motivational reminders"],
          ["checkIn", "Practice check-in with log action"],
          ["achievements", "Achievement alerts"],
          ["education", "Breathing education"],
          ["reengagement", "Gentle return reminders"],
          ["promotions", "Occasional Pro offers"],
        ] as const).map(([key, label]) => <View key={key} style={s.row}>
          <Copy style={{ flex: 1 }}>{label}</Copy>
          <Switch disabled={savingNotificationSettings} accessibilityLabel={t(label)} value={notificationSettings[key] ?? false}
            onValueChange={value => { void saveNotificationSettings({ ...notificationSettings, [key]: value }); }}
            trackColor={{ true: colors.blue }} />
        </View>)}
        <Copy style={s.small}>Check-ins offer Yes and Not yet. Yes opens a manual practice entry. Quiet hours follow your phone’s local time.</Copy>
        <Copy style={s.small}>Return reminders use your last completed in-app practice and require practice reminders to be enabled. Pro offers are limited to one per four weeks and excluded while Pro or reviewer access is active.</Copy>
        <SessionDatePicker timeOnly disabled={savingNotificationSettings} value={new Date(2026, 0, 1, notificationSettings.hour, notificationSettings.minute)}
          onChange={date => { void saveNotificationSettings({ ...notificationSettings, hour: date.getHours(), minute: date.getMinutes() }); }} />
        <Label>NOTIFY ON (UP TO THREE DAYS)</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[2, 3, 4, 5, 6, 7, 1].map(day => {
            const selected = notificationSettings.weekdays.includes(day);
            const label = new Date(2026, 5, 6 + day).toLocaleDateString(locale(), { weekday: "short" });
            return <Chip key={day} translate={false} title={label} selected={selected} onPress={() => {
              if (savingNotificationSettings) return;
              if (!selected && notificationSettings.weekdays.length >= 3) {
                setNotificationError("Choose no more than three notification days each week.");
                return;
              }
              void saveNotificationSettings({ ...notificationSettings, weekdays: selected
                ? notificationSettings.weekdays.filter(value => value !== day)
                : [...notificationSettings.weekdays, day].sort() });
            }} />;
          })}
        </View>
        <Label>QUIET HOURS</Label>
        <View style={s.row}>
          <Copy style={{ flex: 1 }}>Apply quiet hours to all IN/OUT notifications</Copy>
          <Switch disabled={savingNotificationSettings} accessibilityLabel={t("Apply quiet hours to all IN/OUT notifications")} value={notificationSettings.quietHoursEnabled}
            onValueChange={value => { void saveNotificationSettings({ ...notificationSettings, quietHoursEnabled: value }); }}
            trackColor={{ true: colors.blue }} />
        </View>
        <SessionDatePicker timeOnly disabled={savingNotificationSettings} label="QUIET HOURS START" value={new Date(2026, 0, 1, notificationSettings.quietStartHour, 0)}
          onChange={date => { void saveNotificationSettings({ ...notificationSettings, quietStartHour: date.getHours() }); }} />
        <SessionDatePicker timeOnly disabled={savingNotificationSettings} label="QUIET HOURS END" value={new Date(2026, 0, 1, notificationSettings.quietEndHour, 0)}
          onChange={date => { void saveNotificationSettings({ ...notificationSettings, quietEndHour: date.getHours() }); }} />
        {notificationError ? <Copy accessibilityRole="alert" style={{ color: colors.danger }}>{notificationError}</Copy> : null}
        <Button title="Reset notification settings" secondary disabled={savingNotificationSettings} onPress={() => { void saveNotificationSettings({ ...notificationDefaults, achievementNoticeLog: notificationSettings.achievementNoticeLog, weekdays: [...notificationDefaults.weekdays] }); }} />
        {!!reminders?.items.length && <Disclosure title="Saved reminders" icon="notifications-none">
          {reminders.items.map(reminder => <Card key={reminder.id}>
            <Copy translate={false}>{reminder.label}</Copy>
            <Switch accessibilityLabel={reminder.label} disabled={reminders.busy} value={reminder.enabled}
              onValueChange={enabled => { void reminders.save({ ...reminder, enabled }); }} trackColor={{ true: colors.blue }} />
            <SessionDatePicker timeOnly disabled={reminders.busy} value={new Date(2026, 0, 1, reminder.hour, reminder.minute)}
              onChange={date => { void reminders.save({ ...reminder, hour: date.getHours(), minute: date.getMinutes() }); }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[2, 3, 4, 5, 6, 7, 1].map(day => <Chip key={day} translate={false}
                title={new Date(2026, 5, 6 + day).toLocaleDateString(locale(), { weekday: "short" })}
                selected={reminder.weekdays.includes(day)} onPress={() => {
                  if (reminders.busy) return;
                  void reminders.save({ ...reminder, weekdays: reminder.weekdays.includes(day)
                    ? reminder.weekdays.filter(value => value !== day) : [...reminder.weekdays, day].sort() });
                }} />)}
            </View>
            {reminder.ritualId && <Button title="Quick breathing practice" secondary disabled={reminders.busy}
              onPress={() => { void reminders.save({ ...reminder, ritualId: undefined }); }} />}
            <Button title="Delete reminder" secondary danger disabled={reminders.busy} onPress={() => Alert.alert(
              "Delete reminder?", "This removes its scheduled notifications from this phone.", [
                { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { void reminders.remove(reminder.id); } },
              ])} />
          </Card>)}
        </Disclosure>}
        {!!reminders?.message && <Copy accessibilityRole="alert">{reminders.message}</Copy>}
        <Button title="Retry reminder scheduling" secondary disabled={savingNotificationSettings || reminders?.busy}
          onPress={() => { void saveNotificationSettings(notificationSettings); void reminders?.reconcile(); }} />
        <Button title="Open notification settings" secondary onPress={() => { void Linking.openSettings().catch(() => setNotificationError("Could not open phone settings.")); }} />
      </View>
  );
}
