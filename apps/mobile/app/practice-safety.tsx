import { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { BackScreen, Title, Copy, Card, Label, Button, Chip, ActionFooter } from "../src/ui";
import { SaveError, useSession } from "../src/provider";
import { includesHighIntensity } from "@inout/protocols";
import { CyclicSafety } from "../src/cyclic-content";
import { protocolTitle } from "../src/i18n";
import { useLanguage } from "../src/use-language";
import content from "../../../release/content.json";

export default function PracticeSafety() {
  useLanguage();
  const c = useSession(), pending = c.pendingSafety;
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => () => c.cancelSafety(), [c]);
  if (!pending) return <Redirect href={c.current?.stage === "active" ? "/session" : "/pre"} />;
  const intense = pending.protocol && includesHighIntensity(pending.protocol);
  return <BackScreen title="Breathing safety" footer={<ActionFooter>
    <SaveError />
    <Button title="Start practice" disabled={!!c.error || (!!intense && !confirmed)} onPress={() => {
      c.confirmSafety();
      if (c.current?.stage === "active") router.replace("/session");
      else if (c.pendingTest()) router.back();
      else router.replace("/pre");
    }} />
  </ActionFooter>}>
    <Title>Breathe comfortably.</Title>
    {pending.protocol && <Copy translate={false}>{protocolTitle(pending.protocol)}</Copy>}
    {content.safety.map(section => <Card key={section.title}><Label>{section.title}</Label><Copy>{section.body}</Copy></Card>)}
    {pending.warning && <Card><Label>STAY SAFE</Label><Copy>{pending.warning}</Copy></Card>}
    {intense && <Card><CyclicSafety /><Chip title="I have read the precautions and I am in a safe place" selected={confirmed} onPress={() => setConfirmed(!confirmed)} /></Card>}
  </BackScreen>;
}
