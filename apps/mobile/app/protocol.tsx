import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { BackScreen, Title, Label, Card, Copy, Button, s } from "../src/ui";
import { protocols, sigh } from "@inout/protocols";
import { SaveError, useSession } from "../src/provider";

export default function ProtocolDetail() {
  const controller = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const protocol = protocols.find((item) => item.id === id) ?? sigh;
  const cadence = protocol.phases
    .map((phase) => `${phase.durationMs / 1000}s ${phase.label.toLowerCase()}`)
    .join(" · ");
  const available = protocol.availability === "enabled";
  return (
    <BackScreen title="PROTOCOL">
      <Label>{protocol.goalTags.join(" · ").toUpperCase()}</Label>
      <Title>{protocol.name}</Title>
      <Copy>{protocol.phases.map((phase) => phase.label).join(" · ")}</Copy>
      <Card>
        <Label>CADENCE</Label>
        <Copy style={s.subtitle}>{cadence}</Copy>
        <Copy>
          Follow each phase gently and stop if you feel dizzy, faint or unwell.
        </Copy>
        <Label>
          {protocol.defaultCycles} CYCLES · {Math.round(protocol.defaultDuration / 1000)} SECONDS
        </Label>
      </Card>
      <Card>
        <Label>BEFORE YOU START</Label>
        <Copy>
          Sit comfortably. Breathe without forcing. Stop if you feel dizzy,
          faint or unwell.
        </Copy>
        {protocol.safetyCategory === "retention" && (
          <Copy>
            Keep holds comfortable. Never strain, compete with the timer, or
            push through air hunger.
          </Copy>
        )}
        {protocol.safetyCategory === "highIntensity" && (
          <Copy style={{ color: "#ffb4ab" }}>
            A safety confirmation is required before starting. Practice only
            seated or lying down, never in or near water.
          </Copy>
        )}
        <Copy style={s.small}>
          The timings are a guide, not a target to push through.
        </Copy>
      </Card>
      <Button
        title={
          controller.isFavorite(protocol.id)
            ? "Saved routine"
            : "Save routine"
        }
        secondary={!controller.isFavorite(protocol.id)}
        onPress={() => controller.toggleFavorite(protocol.id)}
      />
      <SaveError />
      <Button
        title={available ? "Start reset  →" : "Coming soon"}
        disabled={!available}
        onPress={() =>
          router.push({ pathname: "/pre", params: { id: protocol.id } })
        }
      />
    </BackScreen>
  );
}
