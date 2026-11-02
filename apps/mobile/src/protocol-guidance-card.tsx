import { Card, Copy, Disclosure, Label } from "./ui";
import { protocolGuidance } from "./protocol-guidance";

export function ProtocolGuidanceCard({ protocolId }: { protocolId: string }) {
  const guidance = protocolGuidance[protocolId];
  if (!guidance) return null;
  return <Card>
    <Label>What it helps with</Label>
    <Copy>{guidance.purpose}</Copy>
    <Label>Best time to use it</Label>
    <Copy>{guidance.when}</Copy>
    {guidance.who && <><Label>Who it is for</Label><Copy>{guidance.who}</Copy></>}
    {guidance.expectation && <><Label>What to expect</Label><Copy>{guidance.expectation}</Copy></>}
    <Disclosure compact title="Why it may help"><Copy>{guidance.why}</Copy></Disclosure>
  </Card>;
}
