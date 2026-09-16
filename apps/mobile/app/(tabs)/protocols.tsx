import { router } from "expo-router";
import { Screen, Title, Label, ProtocolRow } from "../../src/ui";
import { protocols } from "@inout/protocols";
import { useSession } from "../../src/provider";

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  return seconds < 60 ? `${seconds} sec` : `${Math.round(seconds / 60)} min`;
}
const purposes: Record<string, string> = {
  "physiological-sigh": "Quick reset",
  box: "Steady concentration",
  coherent: "Easy, balanced rhythm",
  "extended-exhale": "Downshift gently",
  "4-7-8": "Prepare for sleep",
  diaphragmatic: "Restore natural breathing",
  equal: "Quiet mental focus",
  "nadi-shodhana": "Alternate and settle",
  bhramari: "Soften tension",
  "high-intensity-cyclic": "Energize your body",
};

export default function Protocols() {
  const controller = useSession();
  return (
    <Screen>
      <Label>PROTOCOLS</Label>
      <Title>Find your rhythm.</Title>
      {!!controller.preferences.favoriteProtocolIds?.length && (
        <Label>
          SAVED ROUTINES · {controller.preferences.favoriteProtocolIds.length}
        </Label>
      )}
      {protocols.map((protocol) => {
        const available = protocol.availability === "enabled";
        return available ? (
          <ProtocolRow
            key={protocol.id}
            protocol={protocol}
            purpose={purposes[protocol.id] ?? protocol.goalTags.join(" · ")}
            onPress={() => router.push({ pathname: "/protocol", params: { id: protocol.id } })}
          />
        ) : null;
      })}
    </Screen>
  );
}
