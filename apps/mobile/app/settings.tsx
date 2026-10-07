import { useShareLinks } from "../src/share-links-context";
import { useReminders } from "../src/reminder-context";
import { ThemePicker } from "../src/theme-picker";
import { useTheme } from "../src/theme";
import { useLanguage } from "../src/use-language";
import { Alert, Switch } from "../src/localized-native";
import { languages, t } from "../src/i18n";
import Constants from "expo-constants";
import { View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, Chip, Disclosure, ActionRow, useStyles } from "../src/ui";
import { useSession, SaveError } from "../src/provider";

import { SoundControls } from "../src/sound-controls";
import { clearProfilePhotos } from "../src/profile-photo";
import { useCommercial } from "../src/commercial-context";
export default function Settings() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
  const controller = useSession();
  const shares = useShareLinks(), reminders = useReminders();
  const commercial = useCommercial();
  const preferences = controller.preferences;
  const historyCount = controller.history().length;
  const savedCount = controller.routines().length;
  return (
    <BackScreen title="SETTINGS">
      <ThemePicker value={preferences.theme ?? "system"} onChange={theme => controller.setPreferences({ ...preferences, theme })} />
      <Card>
        <Label>LANGUAGE</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {languages.map(language => <Chip key={language.id} title={language.name}
            selected={(preferences.language ?? "en") === language.id}
            onPress={() => controller.setPreferences({ ...preferences, language: language.id })} />)}
        </View>
      </Card>
      <Disclosure title="Plan & privacy" icon="credit-card">
        <Copy>{commercial?.entitlements.state.pro ? "Pro" : "Free"} · All ten breathing protocols included</Copy>
        <ActionRow title="Pro & subscriptions" icon="credit-card" onPress={() => router.push("/pro")} />
        <ActionRow title="Ad privacy options" icon="privacy-tip" onPress={() => {
          if (!commercial || commercial.ads.mode === "preview") { Alert.alert("Native build required", "Ad privacy choices are available in a native development build."); return; }
          void commercial.ads.privacyOptions().then(() => Alert.alert("Privacy options", "Your available ad privacy choices have been reviewed.")).catch(() => Alert.alert("Privacy options unavailable", "No new ad request was made. Try again when connected."));
        }} />
      </Disclosure>
      <Disclosure title="Your practice" icon="person-outline">
        <ActionRow title="Shared links" icon="link" onPress={() => router.push("/shared-links")} />
        <ActionRow title="Practice reminders" icon="notifications-none" onPress={() => router.push("/reminders")} />
        <Copy>IN/OUT · {historyCount} sessions</Copy>
        <ActionRow title="Open Profile" icon="person-outline" onPress={() => router.push("/profile")} />
        <ActionRow title="Personalize my experience" icon="palette" onPress={() => router.push("/personalize")} />
      </Disclosure>
      <Disclosure title="Sound" icon="volume-up" summary={preferences.audio === "silent" ? "Silent" : preferences.audio === "voice" ? "Voice + breath" : "Breath sounds"}>
        <SoundControls />
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
      <Disclosure title="Your library" icon="folder-open">
        <Copy>
          {savedCount} saved {savedCount === 1 ? "routine" : "routines"} · {historyCount}{" "}
          logged {historyCount === 1 ? "session" : "sessions"}
        </Copy>
        <ActionRow title="View saved routines" icon="folder-open"
          onPress={() => router.push("/(tabs)/custom")} />
        <ActionRow title="View history & progress" icon="history"
          onPress={() => router.push("/(tabs)/progress")} />
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
      <Disclosure title="Local data" icon="storage">
        <Copy style={s.small}>
          Your routines, preferences, and history are stored on this phone.
          Clearing history cannot be undone.
        </Copy>
        <ActionRow title="Delete local history" icon="delete-outline"
          danger
          disabled={!historyCount}
          onPress={() =>
            Alert.alert(
              "Delete local history?",
              "All completed and ended sessions will be removed from this phone. Saved routines, settings and earned badges will remain.",
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
      <Disclosure title="Help & privacy" icon="help-outline">
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
