import { protocolTitle, message, t } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import { Alert } from "../src/localized-native";
import { router } from "expo-router";

import { BackScreen, Button, Card, Copy, Label, Title } from "../src/ui";
import { SaveError, useSession } from "../src/provider";
import { experienceFor } from "../src/experience";
import { planFor, isCyclic } from "@inout/protocols";
import { totalDuration } from "@inout/breathing-engine";
import { practiceDuration } from "../src/format";
export default function Rituals() {
  useLanguage();
  const controller = useSession();
  const e = experienceFor(controller.preferences);
  return <BackScreen title="MY RITUALS">
    <Title>A familiar place to return.</Title>
    <Copy>Save a protocol, length, sound and appearance together. Start in one tap, with no rating required.</Copy>
    {e.rituals.map(ritual => <Card key={ritual.id}>
      <Label>{e.favoriteRitualId === ritual.id ? "★ FAVORITE RITUAL" : "PERSONAL RITUAL"}</Label>
      <Title translate={false}>{ritual.name}</Title><Copy translate={false}>{protocolTitle(ritual.protocol)} · {isCyclic(ritual.protocol) ? message(ritual.cycles === 1 ? "Up to {0} · 1 round" : "Up to {0} · {1} rounds", [practiceDuration(totalDuration(planFor(ritual.protocol, ritual.cycles))), ritual.cycles]) : practiceDuration(totalDuration(planFor(ritual.protocol, ritual.cycles)))}</Copy>
      {isCyclic(ritual.protocol) && <Copy>Safety confirmation is required each time.</Copy>}
      <Button translate={false} title={message("Start {0}", [ritual.name])} disabled={!!controller.error || (!!controller.current && controller.current.stage !== "result")} onPress={() => { if (isCyclic(ritual.protocol)) router.push({ pathname: "/pre", params: { ritualId: ritual.id } }); else if (controller.startRitual(ritual.id)) router.push("/session"); }} />
      <Button title="Edit ritual" secondary onPress={() => router.push({ pathname: "/ritual-edit", params: { ritualId: ritual.id } })} />
      <Button title={e.favoriteRitualId === ritual.id ? "Unpin from Today" : "Pin to Today"} secondary onPress={() => controller.updateExperience({ favoriteRitualId: e.favoriteRitualId === ritual.id ? undefined : ritual.id })} />
      <Button title="Remove ritual" secondary danger onPress={() => Alert.alert("Remove this ritual?", "Your practice history and badges will stay.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => controller.removeRitual(ritual.id) }])} />
    </Card>)}
    {!e.rituals.length && <Copy>Try “My morning practice” or “Before sleep.”</Copy>}
    <Button title="Create a ritual" disabled={e.rituals.length >= 20} onPress={() => router.push("/ritual-edit")} />
    <Button title="Practice reminders" secondary onPress={() => router.push("/reminders")} />
    <Copy>Use a safe, comfortable place. Never practice while driving or in water. Stop if unwell.</Copy>
    <SaveError />
  </BackScreen>;
}
