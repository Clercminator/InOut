import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Screen, Title, Label, Card, Copy, Button, s } from "../../src/ui";
import { useSession } from "../../src/provider";
import { duration, shiftText } from "../../src/format";
import { stateShift } from "@inout/shared-types";
import { colors } from "@inout/design-tokens";
export default function History() {
  const controller = useSession();
  const all = controller.history();
  const [filter, setFilter] = useState("All");
  const records = all.filter((r) => filter === "All" || r.goal === filter);
  const shifts = all
    .filter((r) => r.endReason === "completed")
    .map((r) => stateShift(r.pre, r.post))
    .filter((v): v is number => v !== null);
  return (
    <Screen>
      <Label>LOGGED SESSIONS · ON THIS PHONE</Label>
      <Title>HISTORY</Title>
      <Card>
        <View style={s.row}>
          <View>
            <Label>SESSIONS</Label>
            <Title>{all.length}</Title>
          </View>
          <View>
            <Label>TOTAL TIME</Label>
            <Title>
              {duration(
                all.reduce((sum, r) => sum + r.engine.elapsedAtAnchor, 0),
              )}
            </Title>
          </View>
          <View>
            <Label>AVG TENSION DROP</Label>
            <Title>
              {shifts.length
                ? (shifts.reduce((a, b) => a + b, 0) / shifts.length).toFixed(1)
                : "—"}
            </Title>
          </View>
        </View>
        <Copy style={s.small}>
          State Shift is self-reported. Only paired ratings from completed
          sessions contribute to the average.
        </Copy>
      </Card>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[
          "All",
          "Calm",
          "Focus",
          "Perform",
          "Recover",
          "Sleep",
          "Energize",
        ].map((goal) => (
          <Pressable
            key={goal}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === goal }}
            onPress={() => setFilter(goal)}
            style={[
              s.button,
              {
                backgroundColor: filter === goal ? colors.text : colors.raised,
              },
            ]}
          >
            <Copy
              style={{
                color: filter === goal ? colors.background : colors.text,
              }}
            >
              {goal}
            </Copy>
          </Pressable>
        ))}
      </ScrollView>
      {!records.length && (
        <Card>
          <Title>No sessions yet.</Title>
          <Copy>Your completed and ended sessions will appear here.</Copy>
          <Button title="Start a reset" onPress={() => router.push("/pre")} />
        </Card>
      )}
      {records.map((record) => (
        <Card key={record.id}>
          <Label>{new Date(record.engine.startedAt).toLocaleString()}</Label>
          <Copy style={s.subtitle}>{record.protocolName}</Copy>
          <Copy>
            {duration(record.engine.elapsedAtAnchor)} ·{" "}
            {record.endReason === "completed" ? "Completed" : "Ended early"}
          </Copy>
          <Copy style={{ color: colors.accent }}>{shiftText(record)}</Copy>
          <Button
            title="View session"
            secondary
            onPress={() =>
              router.push({ pathname: "/result", params: { id: record.id } })
            }
          />
          <Button
            title="Delete"
            secondary
            onPress={() =>
              Alert.alert(
                "Delete this session?",
                "This removes the local record permanently.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      try {
                        controller.remove(record.id);
                      } catch {
                        Alert.alert("Could not delete", "Please try again.");
                      }
                    },
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
