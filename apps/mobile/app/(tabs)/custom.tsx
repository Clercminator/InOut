import { FeatureCard } from "../../src/feature-card";
import { useLanguage } from "../../src/use-language";
import { Alert } from "../../src/localized-native";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen, Title, Copy, Label, Card, Button, ActionRow } from "../../src/ui";
import { protocols } from "@inout/protocols";
import { useSession } from "../../src/provider";

export default function Custom() {
  useLanguage();
  const controller = useSession();
  const saved = protocols.filter((protocol) => protocol.availability === "enabled" && controller.isFavorite(protocol.id));

  return (
    <Screen tabScreen>
      <View style={{ gap: 8 }}>
      <Label>CUSTOM</Label>
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
            onPress={() => router.push("/(tabs)/protocols")}
          />
        </Card>
      )}
      {saved.map((protocol) => (
        <Card key={protocol.id}>
          <Label>{protocol.goalTags.join(" · ").toUpperCase()}</Label>
          <Title>{protocol.name}</Title>
          <Copy>
            {Math.round(protocol.defaultDuration / 1000)} sec · {protocol.defaultCycles} cycles
          </Copy>
          <Button
            title="Start routine"
            onPress={() =>
              router.push({ pathname: "/pre", params: { id: protocol.id } })
            }
          />
          <Button
            title="Remove from saved"
            secondary
            onPress={() =>
              Alert.alert(
                "Remove saved routine?",
                `${protocol.name} will remain available in Protocols.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => controller.toggleFavorite(protocol.id),
                  },
                ],
              )
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
