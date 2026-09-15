import { router } from "expo-router";
import { Screen, Title, Card, Label, Copy, Button } from "../../src/ui";
export default function Protocols() {
  return (
    <Screen>
      <Label>PROTOCOLS</Label>
      <Title>Find your rhythm.</Title>
      <Card>
        <Title>Physiological Sigh</Title>
        <Copy>Calm · 48 sec · 3 cycles</Copy>
        <Button
          title="View protocol"
          onPress={() => router.push("/protocol")}
        />
      </Card>
    </Screen>
  );
}
