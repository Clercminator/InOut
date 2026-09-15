import { useState } from "react";
import { Redirect, router } from "expo-router";
import {
  BackScreen,
  Title,
  Label,
  Card,
  Copy,
  Button,
  StateScale,
} from "../src/ui";
import { useSession, SaveError } from "../src/provider";
export default function Pre() {
  const controller = useSession();
  const [rating, setRating] = useState<number | null>(null);
  if (controller.current?.stage === "active")
    return <Redirect href="/session" />;
  if (controller.current?.stage === "post") return <Redirect href="/post" />;
  const start = (value: number | null) => {
    controller.start(value);
    router.replace("/session");
  };
  return (
    <BackScreen title="STATE SHIFT · PRE">
      <Label>CALM NOW · PHYSIOLOGICAL SIGH · 48s</Label>
      <Title>How tense are you right now?</Title>
      <StateScale value={rating} onChange={setRating} />
      <Card>
        <Label>CADENCE</Label>
        <Copy>2 inhales · 1 long exhale</Copy>
        <Copy>Breathe comfortably. Stop if dizzy or unwell.</Copy>
      </Card>
      <SaveError />
      <Button
        title="START RESET  →"
        disabled={rating === null}
        onPress={() => start(rating)}
      />
      <Button
        title="Skip rating & start"
        secondary
        onPress={() => start(null)}
      />
      <Copy>Self-reported. Takes 1–2 seconds.</Copy>
    </BackScreen>
  );
}
