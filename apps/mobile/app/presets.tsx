import { router } from "expo-router";
import { BackScreen, Button, Card, Copy, Title } from "../src/ui";

export default function Presets() {
  return <BackScreen title="SAVED PRESETS"><Title>Your presets.</Title><Card><Title>No presets yet.</Title><Copy>Saved presets are not available yet. You can try a custom pattern now.</Copy><Button title="Create Pattern" onPress={() => router.push("/custom-pattern")} /></Card></BackScreen>;
}