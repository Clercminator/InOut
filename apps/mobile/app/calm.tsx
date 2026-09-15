import { router } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
export default function Calm() {
  return (
    <BackScreen title="CALM NOW">
      <Title>Make room for calm.</Title>
      <Label>RECOMMENDED FOR THIS MOMENT</Label>
      <Card>
        <Label>PHYSIOLOGICAL SIGH</Label>
        <Copy style={s.subtitle}>Two inhales. One long release.</Copy>
        <Copy>
          Follow a comfortable inhale, a small top-up, then an easy, longer
          exhale.
        </Copy>
        <Label>48 SEC · 3 CYCLES</Label>
        <Button
          title="Physiological Sigh  →"
          onPress={() => router.push("/protocol")}
        />
      </Card>
    </BackScreen>
  );
}
