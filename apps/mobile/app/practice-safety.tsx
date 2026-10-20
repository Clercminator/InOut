import { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { BackScreen, Title, Copy, Card, Label, Button, Chip, ActionFooter } from "../src/ui";
import { SaveError, useSession } from "../src/provider";
import { includesHighIntensity } from "@inout/protocols";
import { CyclicSafety } from "../src/cyclic-content";
import { protocolTitle } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import content from "../../../release/content.json";
import { mandatorySafety, showSessionSafety } from "../src/safety-policy";

export default function PracticeSafety() {
  useLanguage();
  const c = useSession(), pending = c.pendingSafety;
  const [confirmed, setConfirmed] = useState(false);
  const show = pending && showSessionSafety(c.preferences, pending.protocol, pending.warning);
  useEffect(() => {
    if (pending && !show) {
      c.confirmSafety();
      router.replace(c.current?.stage === "active" ? "/session" : "/pre");
    }
  }, [c, pending, show]);
  useEffect(() => () => c.cancelSafety(), [c]);
  if (pending && !show) return null;
  if (!pending) return <Redirect href={c.current?.stage === "active" ? "/session" : "/pre"} />;
  const intense = pending.protocol && includesHighIntensity(pending.protocol);
  const mandatory = mandatorySafety(pending.protocol, pending.warning);
  return <BackScreen title="Breathing safety" footer={<ActionFooter>
    <SaveError />
    <Button title="Start practice" disabled={!!c.error || (mandatory && !confirmed)} onPress={() => {
      c.confirmSafety();
      if (c.current?.stage === "active") router.replace("/session");
      else if (c.pendingTest()) router.back();
      else router.replace("/pre");
    }} />
  </ActionFooter>}>
    <Title>Breathe comfortably.</Title>
    {pending.protocol && <Copy translate={false}>{protocolTitle(pending.protocol)}</Copy>}
    {c.preferences.showSafetyReminders !== false && content.safety.map(section => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}
    {pending.warning && <Card><Label>STAY SAFE</Label><Copy>{pending.warning}</Copy></Card>}
    {mandatory && <Card>{intense ? <CyclicSafety /> : <Copy>Keep holds comfortable. Never strain, compete with the timer, or push through air hunger.</Copy>}<Chip title="I have read the precautions and I am in a safe place" selected={confirmed} onPress={() => setConfirmed(!confirmed)} /></Card>}
  </BackScreen>;
}
