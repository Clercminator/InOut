import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { BackScreen, Title, Copy, Card, Button, Label } from "../src/ui";
import { useSession } from "../src/provider";
import { DailyResetCard } from "../src/daily-reset-card";
import { dailyResetStats } from "../src/daily-reset";
import { useProgressDate } from "../src/progress-ui";
import { dayKey } from "../src/progress";
import { message, locale } from "../src/i18n";
import { useLanguage } from "../src/use-language";
export default function DailyReset() {
  useLanguage(); const c = useSession(), today = dayKey(useProgressDate());
  useFocusEffect(useCallback(() => { c.analytics.track("daily_reset_opened"); }, [c]));
  const stats = dailyResetStats(c.dailyReset(), today);
  return <BackScreen title="Daily Reset"><DailyResetCard detail />
    <Card><Title>Small moments add up.</Title><Copy>{message("{0} completed days · Best streak: {1}", [stats.total, stats.best])}</Copy>
      <Copy>Completed resets count on their local completion date. Missed days never erase your history.</Copy>
      <Button title="Daily Reset reminders" secondary onPress={() => router.push("/settings")} />
    </Card>
    <Label>PERSONAL HISTORY</Label>
    {c.dailyReset().credits.slice().sort((a, b) => b.finishedAt - a.finishedAt).map(credit => <Card key={credit.sessionId}>
      <Copy translate={false}>{new Date(credit.localDay + "T12:00:00").toLocaleDateString(locale())}</Copy><Copy>Daily completion earned</Copy>
      <Button title="Share my result" secondary onPress={() => router.push({ pathname: "/challenge-share", params: { daily: credit.sessionId } })} />
    </Card>)}
  </BackScreen>;
}
