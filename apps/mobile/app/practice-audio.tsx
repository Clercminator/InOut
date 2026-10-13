import { BackScreen, Button } from "../src/ui";
import { SoundControls } from "../src/sound-controls";
import { router } from "expo-router";

export default function PracticeAudio() {
  return <BackScreen title="Audio & haptics">
    <SoundControls compact />
    <Button title="Done" onPress={() => router.back()} />
  </BackScreen>;
}
