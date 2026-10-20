import { useState } from "react";
import { Linking } from "react-native";
import type { Protocol } from "@inout/shared-types";
import { Card, Copy, Button, Disclosure } from "./ui";
import { presentationFor } from "./protocol-evidence";

export function ProtocolEvidenceCard({ protocol }: { protocol: Protocol }) {
  const content = presentationFor(protocol);
  const [failed, setFailed] = useState(false);
  const url = content.category === "Research-supported" ? content.source.url : content.category === "Expert-recommended" ? content.url : null;
  return <Card><Disclosure title={content.category}>
    <Copy>{content.purpose}</Copy>
    {content.category === "Research-supported" && <Copy>{content.rationale}</Copy>}
    {content.category === "Expert-recommended" && <><Copy>{content.recommendation}</Copy><Copy translate={false}>{content.attribution}</Copy></>}
    {content.category === "General wellness" && <><Copy>{content.instructions}</Copy><Copy>{content.feeling}</Copy></>}
    {url && <Button title="Open research source" secondary onPress={() => {
      setFailed(false);
      void Linking.openURL(url).catch(() => setFailed(true));
    }} />}
    {failed && <Copy accessibilityLiveRegion="polite">Unable to open the source. Check your connection and try again.</Copy>}
  </Disclosure></Card>;
}
