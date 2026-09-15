import { Switch, View } from "react-native";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { colors } from "@inout/design-tokens";
export default function Settings() {
  const controller = useSession();
  const preferences = controller.preferences;
  return (
    <BackScreen title="SETTINGS">
      <Title>Your guidance.</Title>
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
      <SaveError />
    </BackScreen>
  );
}
