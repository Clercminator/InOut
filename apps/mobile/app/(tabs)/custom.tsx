import { Alert, View } from "react-native";
import { router } from "expo-router";
import { Screen, Title, Copy, Label, Card, Button } from "../../src/ui";
import { protocols } from "@inout/protocols";
import { useSession } from "../../src/provider";

export default function Custom() {
  const controller = useSession();
  const saved = protocols.filter((protocol) => protocol.availability === "enabled" && controller.isFavorite(protocol.id));

  return (
    <Screen>
      <Label>CUSTOM</Label>
      <Title>Your saved cadence.</Title>
      <Copy>
        Build a pattern for the moment, or combine routines into a mix that is
        yours.
      </Copy>
      <View style={{ gap: 10 }}>
        <Button title="Create Pattern" onPress={() => router.push("/custom-pattern")} />
        <Button title="Create Mix" secondary onPress={() => router.push("/custom-mix")} />
      </View>
      <Card>
        <Label>SAVED</Label>
        <Copy>Presets and mixes you create will live here.</Copy>
        <Button title="Saved Presets" secondary onPress={() => router.push("/presets")} />
        <Button title="Saved Mixes" secondary onPress={() => router.push("/mixes")} />
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
