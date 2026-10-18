import { WelcomeEmailOptIn } from "../src/welcome-email-ui";
import { useShareLinks } from "../src/share-links-context";
import { useReminders } from "../src/reminder-context";
import { PacerThemePicker, ThemePicker } from "../src/theme-picker";
import { useTheme } from "../src/theme";
import { useLanguage } from "../src/use-language";
import { Alert, Switch } from "../src/localized-native";
import { languages, t } from "../src/i18n";
import Constants from "expo-constants";
import { View, Linking } from "react-native";
import publicInfo from "../../../release/public-info.json";
import { router } from "expo-router";
import { BackScreen, Label, Card, Copy, Chip, Disclosure, ActionRow, Button, useStyles } from "../src/ui";
import { useSession, SaveError } from "../src/provider";

import { SoundControls } from "../src/sound-controls";
import { clearProfilePhotos } from "../src/profile-photo";
import { useCommercial } from "../src/commercial-context";
import { useRef, useState } from "react";
import { notificationContext, notificationDefaults, notificationPreferences, validateNotificationPreferences, type LocalNotificationPreferences } from "../src/local-notifications";
import { configureEngagementNotifications, nativeReminderAdapter } from "../src/reminder-native";
import { SessionDatePicker } from "../src/session-date-picker";
import { locale } from "../src/i18n";
export default function Settings() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const shares = useShareLinks(), reminders = useReminders();
  const commercial = useCommercial();
  const [notificationError, setNotificationError] = useState("");
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const notificationSaveLock = useRef(false);
  const preferences = controller.preferences;
  const notificationSettings = notificationPreferences(preferences);
  const historyCount = controller.history().length;
  const savedCount = controller.routines().length;
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
    <BackScreen title="SETTINGS">
      <Label>ACCOUNT</Label>
      <Disclosure title="Plan & privacy" icon="credit-card">
        <Copy>{commercial?.entitlements.state.pro ? "Pro" : "Free"} · All 14 breathing protocols included</Copy>
        <ActionRow title="Pro & subscriptions" icon="credit-card" onPress={() => router.push("/pro")} />
        {commercial?.analytics.remoteAvailable && <>
          <View style={s.row}>
            <Copy>Share usage & crash reports</Copy>
            <Switch accessibilityLabel={t("Share usage & crash reports")} value={preferences.telemetryEnabled === true}
              onValueChange={value => controller.setPreferences({ ...preferences, telemetryEnabled: value })}
              trackColor={{ true: colors.blue }} />
          </View>
          <Copy style={s.small}>Optional. Help improve IN/OUT with basic usage and crash reports through Google Firebase. No breathing ratings or profile details are sent. Turn off anytime.</Copy>
        </>}
        <ActionRow title="Ad privacy options" icon="privacy-tip" onPress={() => {
          if (!commercial || commercial.ads.mode === "preview") { Alert.alert("Native build required", "Ad privacy choices are available in a native development build."); return; }
          void commercial.ads.privacyOptions().then(() => Alert.alert("Privacy options", "Your available ad privacy choices have been reviewed.")).catch(() => Alert.alert("Privacy options unavailable", "No new ad request was made. Try again when connected."));
        }} />
      </Disclosure>
      <Label>EXPERIENCE</Label>
      <Disclosure title="Appearance & language" icon="palette">
      <ThemePicker value={preferences.theme ?? "system"} onChange={theme => controller.setPreferences({ ...preferences, theme })} />
      <Card>
        <Label>PACER THEMES</Label>
        {preferences.pacerTheme && !controller.isPacerThemeAvailable(preferences.pacerTheme) && <Copy accessibilityRole="alert">Your selected theme is saved and will be available again when IN/OUT Pro is restored. Pulse Default is active for now.</Copy>}
        <PacerThemePicker
          value={controller.effectivePacerTheme()}
          progress={controller.pacerThemeProgress()}
          noticeThemeIds={controller.pacerThemeNotice}
          pro={commercial?.entitlements.state.pro ?? controller.entitlements.state.pro}
          onApply={theme => { controller.applyPacerTheme(theme); }}
          onLockedTap={() => controller.analytics.track("theme_locked_tapped")}
          onPreview={() => controller.analytics.track("theme_previewed")}
          onGalleryOpened={() => controller.analytics.track("theme_gallery_opened")}
          onDismissNotice={() => controller.dismissPacerThemeNotice()}
          onUpgrade={() => {
            controller.analytics.track("theme_paywall_opened");
            router.push({ pathname: "/pro", params: { source: "theme" } });
          }}
        />
      </Card>
      <Card>
        <Label>LANGUAGE</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip title="Use device language" selected={preferences.languageSource === "device"} onPress={() => controller.setPreferences({ ...preferences, languageSource: "device" })} />
          {languages.map(language => <Chip key={language.id} title={language.name}
            selected={preferences.languageSource !== "device" && (preferences.language ?? "en") === language.id}
            onPress={() => controller.setPreferences({ ...preferences, language: language.id, languageSource: "manual" })} />)}
        </View>
      </Card>
      </Disclosure>
      <Disclosure title="Sound" icon="volume-up" summary={preferences.audio === "silent" ? "Silent" : preferences.audio === "voice" ? "Voice + breath" : "Breath sounds"}>
        <SoundControls />
      </Disclosure>
      <Label>PRACTICE</Label>
      <Disclosure title="Your practice" icon="person-outline">
        <ActionRow title="Practice reminders" icon="notifications-none" onPress={() => router.push("/reminders")} />
        <Copy>IN/OUT · {historyCount} sessions</Copy>
        <ActionRow title="Open Profile" icon="person-outline" onPress={() => router.push("/profile")} />
        <ActionRow title="Personalize my experience" icon="palette" onPress={() => router.push("/personalize")} />
      </Disclosure>
      <Disclosure title="Practice notifications" icon="notifications-active">
        <Copy>Optional local notifications stay on this phone. They are off until you enable a category. Scheduled prompts are limited to three days each week; achievement alerts are limited to one each week.</Copy>
        {([
          ["dailyReset", "Daily Reset"],
          ["motivation", "Motivational reminders"],
          ["checkIn", "Practice check-in with log action"],
          ["achievements", "Achievement alerts"],
          ["education", "Breathing education"],
          ["reengagement", "Gentle return reminders"],
          ["promotions", "Occasional Pro offers"],
        ] as const).map(([key, label]) => <View key={key} style={s.row}>
          <Copy>{label}</Copy>
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
          <Copy>Apply quiet hours to all IN/OUT notifications</Copy>
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
      </Disclosure>
      <Disclosure title="Session preferences" icon="tune">
        {(
          [
            { key: "keepAwake", label: "Keep screen awake" },
          ] as const
        ).map((item) => (
          <View key={item.key} style={s.row}>
            <Copy>{item.label}</Copy>
            <Switch
              accessibilityLabel={t(item.label)}
              value={preferences[item.key]}
              onValueChange={(value) =>
                controller.setPreferences({ ...preferences, [item.key]: value })
              }
              trackColor={{ true: colors.blue }}
            />
          </View>
        ))}
        <Copy style={s.small}>
          Choose sound and vibration in Sound. Holds stay quiet.
          App switching and screen lock pause sessions. Reduced motion follows
          your system setting.
        </Copy>
      </Disclosure>
      <Disclosure title="Safety" icon="health-and-safety">
        <Copy>
          Breathe comfortably. Stop if dizzy, faint, or unwell. Never practice while driving, operating machinery, swimming, bathing, or near water.
        </Copy>
        <Copy style={s.small}>
          State Shift ratings are private, self-reported notes, not biometric
          measurements.
        </Copy>
      </Disclosure>
      <Label>LIBRARY</Label>
      <Disclosure title="Your library" icon="folder-open">
        <Copy>
          {savedCount} saved {savedCount === 1 ? "routine" : "routines"} · {historyCount}{" "}
          logged {historyCount === 1 ? "session" : "sessions"}
        </Copy>
        <ActionRow title="Favorites" icon="bookmark-border" onPress={() => router.push({ pathname: "/protocols", params: { filter: "Saved" } })} />
        <ActionRow title="Saved Presets" icon="folder-open" onPress={() => router.push("/presets")} />
        <ActionRow title="Saved Mixes" icon="queue-music" onPress={() => router.push("/mixes")} />
      </Disclosure>
      <Label>DATA</Label>
      <ActionRow title="Account & data requests" icon="privacy-tip" onPress={() => { void Linking.openURL(publicInfo.deleteAccountUrl).catch(() => Alert.alert("Website unavailable", `Contact ${publicInfo.supportEmail}.`)); }} />
      <ActionRow title="Shared links" icon="link" onPress={() => router.push("/shared-links")} />
      <ActionRow title="View session history" icon="history" onPress={() => router.push("/history")} />
      <Disclosure title="Local data" icon="storage">
        <Copy style={s.small}>
          Your routines, preferences, and history are stored on this phone.
          Clearing history cannot be undone.
        </Copy>
        <ActionRow title="Delete local history" icon="delete-outline"
          danger
          disabled={!historyCount && !controller.testAttempts().length}
          onPress={() =>
            Alert.alert(
              "Delete local history?",
              "Session history and challenge test results will be removed from this phone. Saved routines, settings, program progress and earned badges will remain.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete history",
                  style: "destructive",
                  onPress: () => controller.clearHistory(),
                },
              ],
            )
          } />
        <ActionRow title="Delete all local data" disabled={shares?.busy || reminders?.busy} icon="delete-forever" danger onPress={() => Alert.alert("Delete all local data?", "This permanently removes sessions, ratings, routines, favorites and settings on this phone, including the current session. Revoke shared links first in Shared links; otherwise they remain accessible until expiry and you lose their controls.", [{ text: "Cancel", style: "cancel" }, { text: "Delete everything", style: "destructive", onPress: async () => { try { await commercial?.reviewer?.clear(); } catch { Alert.alert("Reviewer access reset failed", "Please retry deleting local data."); return; } if (controller.resetLocalData()) { try { clearProfilePhotos(); } catch { Alert.alert("Photo cleanup failed", "Please retry deleting local data to remove profile photos."); } router.replace("/onboarding"); } } }])} />
      </Disclosure>
      <Label>COMMUNICATION</Label>
      <Disclosure title="Email preferences" icon="mail-outline"><WelcomeEmailOptIn /></Disclosure>
      <Label>SUPPORT</Label>
      <Disclosure title="Help & privacy" icon="help-outline">
        <ActionRow title="Subscription terms" icon="description" onPress={() => router.push("/subscription-terms")} />
        <ActionRow title="Help & support" icon="help-outline" onPress={() => router.push("/support")} />
        <ActionRow title="Privacy policy" icon="privacy-tip" onPress={() => router.push("/privacy")} />
        <ActionRow title="Breathing safety" icon="health-and-safety" onPress={() => router.push("/safety")} />

      </Disclosure>
      <View>
        <Copy style={s.small}>Version {Constants.expoConfig?.version} · Offline-first breathing practice</Copy>
      </View>
      <SaveError />
    </BackScreen>
  );
}
