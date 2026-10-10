import { FeatureCard } from "../src/feature-card";
import { useLanguage } from "../src/use-language";
import { View } from "react-native";
import { router } from "expo-router";
import { BackScreen, ProtocolRow, Title, Copy, Label, Card, Button, ActionRow } from "../src/ui";
import { protocols } from "@inout/protocols";
import { useSession } from "../src/provider";

export default function Custom() {
  useLanguage();
  const controller = useSession();
  const saved = protocols.filter((protocol) => protocol.availability === "enabled" && controller.isFavorite(protocol.id));

  return (
    <BackScreen title="CREATE">
      <View style={{ gap: 8 }}>
      <Title>Your saved cadence.</Title>
      <Copy>
        Build a pattern for the moment, or combine routines into a mix that is
        yours.
      </Copy>
      </View>
      <View style={{ gap: 12 }}>
        <FeatureCard title="Create Pattern" description="Choose your own breathing phases and timing." icon="tune" action="Create Pattern" onPress={() => router.push("/custom-pattern")} />
        <FeatureCard title="Create Mix" description="Bring your favorite routines together in one practice." icon="playlist-play" tone="exhale" action="Create Mix" onPress={() => router.push("/custom-mix")} />
      </View>
      <Card>
        <Label>SAVED</Label>
        <ActionRow icon="auto-awesome" title="My rituals" onPress={() => router.push("/rituals")} />
        <ActionRow icon="bookmark-border" title="Saved Presets" onPress={() => router.push("/presets")} />
        <ActionRow icon="queue-music" title="Saved Mixes" onPress={() => router.push("/mixes")} />
      </Card>
      {!saved.length && (
        <Card>
          <Title>No favorite protocols yet.</Title>
          <Copy>
            Save a protocol from its detail screen and it will appear here for
            quick access.
          </Copy>
          <Button
            title="Browse protocols"
            onPress={() => router.push("/protocols")}
          />
        </Card>
      )}
      {!!saved.length && <Label>FAVORITES</Label>}
      {saved.map(protocol => <ProtocolRow key={protocol.id} protocol={protocol} purpose="Saved practice" favorite onPress={() => router.push({ pathname: "/protocol", params: { id: protocol.id } })} />)}
    </BackScreen>
  );
}
