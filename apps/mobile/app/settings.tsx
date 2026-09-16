import { Alert, Switch, View } from "react-native";
import { router } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { colors } from "@inout/design-tokens";
export default function Settings() {
  const controller = useSession();
  const preferences = controller.preferences;
  const historyCount = controller.history().length;
  const savedCount = preferences.favoriteProtocolIds?.length ?? 0;
  return (
    <BackScreen title="SETTINGS">
      <Title>Your guidance.</Title>
      <Card>
        <Label>ACCOUNT</Label>
        <Copy>IN/OUT Preview · {historyCount} sessions</Copy>
        <Button title="Open Profile" secondary onPress={() => router.push("/profile")} />
        <Button title="Explore planned Pro features" secondary onPress={() => router.push("/pro")} />
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
          Breathe comfortably. Stop if dizzy, faint, or unwell. High-intensity
          breathing is for seated or lying practice only, never driving or in
          or near water.
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
        <Label>IN/OUT</Label>
        <Copy style={s.small}>Version 0.1.0 · Offline-first breathing practice</Copy>
      </Card>
      <SaveError />
    </BackScreen>
  );
}
