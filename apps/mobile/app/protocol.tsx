import { router } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
export default function ProtocolDetail() {
  return (
    <BackScreen title="PROTOCOL">
      <Label>CALM NOW</Label>
      <Title>Physiological Sigh</Title>
      <Copy>Two inhales · one long exhale</Copy>
      <Card>
        <Label>CADENCE</Label>
        <Copy style={s.subtitle}>4s in · 2s top-up · 10s out</Copy>
        <Copy>
          Inhale gently through your nose, add a small second inhale, then
          release slowly. Follow only as far as feels comfortable.
        </Copy>
        <Label>3 CYCLES · 48 SECONDS</Label>
      </Card>
      <Card>
        <Label>BEFORE YOU START</Label>
        <Copy>
          Sit comfortably. Breathe without forcing. Stop if you feel dizzy,
          faint or unwell.
        </Copy>
        <Copy style={s.small}>
          The timings are a guide, not a target to push through.
        </Copy>
      </Card>
      <Button title="Start reset  →" onPress={() => router.push("/pre")} />
    </BackScreen>
  );
}
