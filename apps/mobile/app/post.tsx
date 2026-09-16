import { useEffect, useState } from "react";
import { BackHandler, Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Screen, Title, Label, Copy, Button, StateScale, s } from "../src/ui";
import { useSession, SaveError } from "../src/provider";
import { colors } from "@inout/design-tokens";
export default function Post() {
  const controller = useSession();
  const record = controller.current;
  const [rating, setRating] = useState<number | null>(null);
  const [effect, setEffect] = useState<string | null>(null);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);
  if (!record) return <Redirect href="/(tabs)" />;
  if (record.stage === "active") return <Redirect href="/session" />;
  if (record.stage === "result")
    return (
      <Redirect href={{ pathname: "/result", params: { id: record.id } }} />
    );
  const finish = (post: number | null) => {
    controller.answer(post, post === null ? null : effect);
    if (!controller.error)
      router.replace({ pathname: "/result", params: { id: record.id } });
  };
  return (
    <Screen title="STATE SHIFT · POST">
      <View style={s.flowHeader}>
        <Label>SESSION COMPLETE</Label>
        <Title>{record.protocolName}</Title>
        <Copy style={{ color: colors.accent }}>
          {Math.round(record.engine.elapsedAtAnchor / 1000)} sec · {record.engine.plan.blocks.reduce((sum, block) => sum + block.cycles, 0)} cycles
        </Copy>
      </View>
      <Title>How tense are you now?</Title>
      <StateScale value={rating} onChange={setRating} timing="After the practice" />
      <Label>WHAT DID YOU NOTICE? · OPTIONAL</Label>
      <View style={s.row}>
        {["Calmer", "Clearer", "More energized", "No change", "Worse"].map(
          (text) => (
            <Pressable
              key={text}
              accessibilityRole="button"
              accessibilityState={{ selected: effect === text }}
              onPress={() => setEffect(effect === text ? null : text)}
              style={[
                s.button,
                s.secondaryButton,
                {
                  backgroundColor:
                    effect === text ? colors.blue : colors.raised,
                },
              ]}
            >
              <Copy>{text}</Copy>
            </Pressable>
          ),
        )}
      </View>
      <Copy style={s.small}>
        This is your own assessment, not a biometric measurement.
      </Copy>
      <SaveError />
      <Button
        title="SEE MY STATE SHIFT  →"
        disabled={rating === null}
        onPress={() => finish(rating)}
      />
      <Button
        title="Skip & save session"
        secondary
        onPress={() => finish(null)}
      />
    </Screen>
  );
}
