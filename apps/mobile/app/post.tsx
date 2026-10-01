import { useTheme } from "../src/theme";
import { recordTitle, message, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Pressable } from "../src/localized-native";
import { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Screen, Title, Label, Copy, Button, StateScale, ActionFooter, useStyles } from "../src/ui";
import { useSession, SaveError } from "../src/provider";

import { Celebration } from "../src/celebration";
export default function Post() {
  const { colors } = useTheme();
  const s = useStyles();
  useLanguage();
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
      <Redirect href={{ pathname: "/result", params: { id: record.id, saved: "1" } }} />
    );
  const finish = (post: number | null) => {
    controller.answer(post, post === null ? null : effect);
    if (!controller.error)
      router.replace({ pathname: "/result", params: { id: record.id, saved: "1" } });
  };
  return (
    <Screen title="STATE SHIFT · POST" footer={<ActionFooter>
      <SaveError />
      <Button title="SEE MY STATE SHIFT  →" disabled={rating === null || !!controller.error} onPress={() => finish(rating)} />
      <Button title="Skip & save session" secondary disabled={!!controller.error} onPress={() => finish(null)} />
    </ActionFooter>}>
      {record.endReason === "completed" && <Celebration title="Congratulations!" message="You made time for yourself. Take a moment to feel proud." />}
      <View style={s.flowHeader}>
        <Label>{record.endReason === "completed" ? "SESSION COMPLETE" : "SESSION ENDED"}</Label>
        <Title translate={false}>{recordTitle(record)}</Title>
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
                    effect === text ? colors.accent : colors.raised,
                },
              ]}
            >
              <Copy style={{ color: effect === text ? colors.onAccent : colors.text }}>{text}</Copy>
            </Pressable>
          ),
        )}
      </View>
      <Copy style={s.small}>
        This is your own assessment, not a biometric measurement.
      </Copy>
    </Screen>
  );
}
