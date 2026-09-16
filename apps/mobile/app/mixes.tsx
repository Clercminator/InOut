import { router } from "expo-router";
import { BackScreen, Button, Card, Copy, Title } from "../src/ui";

export default function Mixes() {
  return <BackScreen title="SAVED MIXES"><Title>Your mixes.</Title><Card><Title>No mixes yet.</Title><Copy>Saving mixes is not available yet. You can try a mix now.</Copy><Button title="Create Mix" onPress={() => router.push("/custom-mix")} /></Card></BackScreen>;
}