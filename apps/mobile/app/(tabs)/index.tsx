import { router } from "expo-router";
import { View } from "react-native";
import { Screen, Title, Label, Card, Copy, Button, s } from "../../src/ui";
import { useSession } from "../../src/provider";
export default function Today() {
  const { current } = useSession();
  return (
    <Screen>
      <Label>TODAY</Label>
      <Title>Breathe for what's next.</Title>
      {current?.stage === "active" && (
        <Button
          title="Return to paused session"
          onPress={() => router.push("/session")}
        />
      )}
      {current?.stage === "post" && (
        <Button
          title="Finish your State Shift"
          onPress={() => router.push("/post")}
        />
      )}
      <Card>
        <Label>CALM NOW</Label>
        <Copy style={s.subtitle}>A moment to reset.</Copy>
        <Copy>Two inhales. One long exhale.</Copy>
        <Button title="Calm Now  →" onPress={() => router.push("/calm")} />
      </Card>
      <Card>
        <Label>QUICK RESET · 48 SEC</Label>
        <Copy style={s.subtitle}>Physiological Sigh</Copy>
        <Copy>3 guided cycles. No account needed.</Copy>
        <Button
          title="Start reset"
          secondary
          onPress={() => router.push("/pre")}
        />
      </Card>
      <View style={s.row}>
        <Copy style={s.small}>Your breathing. Your pace.</Copy>
        <Button
          title="Settings"
          secondary
          onPress={() => router.push("/settings")}
        />
      </View>
    </Screen>
  );
}
