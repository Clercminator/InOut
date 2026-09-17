import Constants from "expo-constants";
import { Alert, Switch, View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { colors } from "@inout/design-tokens";
import { useCommercial } from "../src/commercial-context";
export default function Settings() {
  const controller = useSession();
  const commercial = useCommercial();
  const preferences = controller.preferences;
  const historyCount = controller.history().length;
  const savedCount = preferences.favoriteProtocolIds?.length ?? 0;
  return (
    <BackScreen title="SETTINGS">
      <Title>Your guidance.</Title>
      <Card>
        <Label>PLAN & PRIVACY</Label>
        <Copy>{commercial?.entitlements.state.pro ? "Pro" : "Free"} · All nine breathing protocols included</Copy>
        <Button title="Pro & subscriptions" secondary onPress={() => router.push("/pro")} />
        <Button title="Ad privacy options" secondary onPress={() => {
          if (!commercial || commercial.ads.mode === "preview") { Alert.alert("Native build required", "Ad privacy choices are available in a native development build."); return; }
          void commercial.ads.privacyOptions().then(() => Alert.alert("Privacy options", "Your available ad privacy choices have been reviewed.")).catch(() => Alert.alert("Privacy options unavailable", "No new ad request was made. Try again when connected."));
        }} />
      </Card>
      <Card>
        <Label>YOUR PRACTICE</Label>
        <Copy>IN/OUT · {historyCount} sessions</Copy>
        <Button title="Open Profile" secondary onPress={() => router.push("/profile")} />
      </Card>
      <Card>
        <Label>AUDIO</Label>
        {(["tones", "voice", "silent"] as const).map((audio) => (
          <Button
            key={audio}
            title={`${preferences.audio === audio ? "✓ " : ""}${audio === "tones" ? "Sound cues" : audio === "voice" ? "Concise voice" : "Silent"}`}
            secondary={preferences.audio !== audio}
            onPress={() => controller.setPreferences({ ...preferences, audio })}
          />
        ))}
        <Copy style={s.small}>
          Audio follows your phone volume and iPhone silent switch. Audible
          guidance pauses other audio while the session runs. Headphone
          disconnection or audio interruption pauses guidance.
        </Copy>
      </Card>
      <Card>
        {(
          [
            { key: "haptics", label: "Phase haptics" },
            { key: "keepAwake", label: "Keep screen awake" },
          ] as const
        ).map((item) => (
          <View key={item.key} style={s.row}>
            <Copy>{item.label}</Copy>
            <Switch
              accessibilityLabel={item.label}
              value={preferences[item.key]}
              onValueChange={(value) =>
                controller.setPreferences({ ...preferences, [item.key]: value })
              }
              trackColor={{ true: colors.blue }}
            />
          </View>
        ))}
        <Copy style={s.small}>
          App switching and screen lock pause sessions. Reduced motion follows
          your system setting.
        </Copy>
      </Card>
      <Card>
        <Label>YOUR LIBRARY</Label>
        <Copy>
          {savedCount} saved {savedCount === 1 ? "routine" : "routines"} · {historyCount}{" "}
          logged {historyCount === 1 ? "session" : "sessions"}
        </Copy>
        <Button
          title="View saved routines"
          secondary
          onPress={() => router.push("/(tabs)/protocols")}
        />
        <Button
          title="View history & progress"
          secondary
          onPress={() => router.push("/(tabs)/progress")}
        />
      </Card>
      <Card>
        <Label>SAFETY</Label>
        <Copy>
          Breathe comfortably. Stop if dizzy, faint, or unwell. Never practice while driving, operating machinery, swimming, bathing, or near water.
        </Copy>
        <Copy style={s.small}>
          State Shift ratings are private, self-reported notes, not biometric
          measurements.
        </Copy>
      </Card>
      <Card>
        <Label>LOCAL DATA</Label>
        <Copy style={s.small}>
          Your routines, preferences, and history are stored on this phone.
          Clearing history cannot be undone.
        </Copy>
        <Button
          title="Delete local history"
          secondary
          danger
          disabled={!historyCount}
          onPress={() =>
            Alert.alert(
              "Delete local history?",
              "All completed and ended sessions will be removed from this phone. Saved routines and settings will remain.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete history",
                  style: "destructive",
                  onPress: () => controller.clearHistory(),
                },
              ],
            )
          }
        />
      </Card>
      <Card>
        <Label>HELP & PRIVACY</Label>
        <Button title="Help & support" secondary onPress={() => router.push("/support")} />
        <Button title="Privacy policy" secondary onPress={() => router.push("/privacy")} />
        <Button title="Breathing safety" secondary onPress={() => router.push("/safety")} />
        <Button title="Delete all local data" danger secondary onPress={() => Alert.alert("Delete all local data?", "This permanently removes sessions, ratings, routines, favorites and settings on this phone, including the current session.", [{ text: "Cancel", style: "cancel" }, { text: "Delete everything", style: "destructive", onPress: () => { if (controller.resetLocalData()) router.replace("/onboarding"); } }])} />
      </Card>
      <Card>
        <Label>IN/OUT</Label>
        <Copy style={s.small}>Version {Constants.expoConfig?.version} · Offline-first breathing practice</Copy>
      </Card>
      <SaveError />
    </BackScreen>
  );
}
