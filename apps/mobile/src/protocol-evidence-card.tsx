import { useState } from "react";
import { Linking, View } from "react-native";
import type { Protocol } from "@inout/shared-types";
import { Card, Copy, Button, Disclosure } from "./ui";
import { evidenceFor } from "./protocol-evidence";

export function ProtocolEvidenceCard({ protocol }: { protocol: Protocol }) {
  const evidence = evidenceFor(protocol);
  const [failed, setFailed] = useState(false);
  return <Card><Disclosure title="Why this breathing pattern?">
    <Copy>{evidence.explanation}</Copy>
    <Copy>{evidence.rationale}</Copy>
    <Copy>{evidence.limitation}</Copy>
    {evidence.references.map(ref => <View key={ref.id} style={{ gap: 6 }}>
      <Copy>{ref.supportedClaim}</Copy><Copy>{ref.limitations}</Copy>
    </View>)}
    {!!evidence.references.length && <Disclosure title="Research & sources">
      {evidence.references.map(ref => <View key={ref.id} style={{ gap: 6 }}>
        <Copy translate={false}>{ref.title}</Copy>
        <Copy translate={false}>{ref.authors} · {ref.year}</Copy>
        <Copy>{ref.classification}</Copy>
        <Button title="Open research source" secondary onPress={() => {
          setFailed(false);
          void Linking.openURL(ref.url).catch(() => setFailed(true));
        }} />
      </View>)}
      {failed && <Copy accessibilityLiveRegion="polite">Unable to open the source. Check your connection and try again.</Copy>}
    </Disclosure>}
  </Disclosure></Card>;
}
