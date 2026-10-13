import { router } from "expo-router";
import { BackScreen, Title, Copy, Label, Card, ActionRow } from "../src/ui";
import { goalContent } from "../src/personalization";
import { ChallengeArt } from "../src/challenge-art";
export default function Learn() {
  return <BackScreen title="Learn breathing"><ChallengeArt art="dawn" /><Title>A little understanding before you begin.</Title>
    {Object.entries(goalContent).map(([id, content]) => <Card key={id}><Label>{content.title}</Label><Copy>{content.body}</Copy></Card>)}
    <ActionRow title="Explore protocols" icon="air" onPress={() => router.push("/protocols")} /><ActionRow title="Breathing safety" icon="health-and-safety" onPress={() => router.push("/safety")} />
  </BackScreen>;
}
