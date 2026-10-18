import type { ComponentProps } from "react";
import type { Phase, Protocol } from "@inout/shared-types";
import { PulseSessionVisual } from "./pulse-session-visual";
import { SighVisual } from "./sigh-visual";

export const approvedRenderers = {
  pulse: { component: PulseSessionVisual, artwork: "assets/pulse-orb.png" },
  box: { component: PulseSessionVisual, artwork: null },
  sigh: { component: SighVisual, artwork: null },
  alternating: { component: SighVisual, artwork: null },
  ripple: { component: SighVisual, artwork: null },
} as const;
export type RendererId = keyof typeof approvedRenderers;
export function rendererFor(protocolId: string, phases: Phase[], animationType?: Protocol["animationType"]): RendererId {
  const box = phases.length === 4 && phases.map(p => p.type).join(",") === "inhale,hold,exhale,hold";
  if (box && (["box", "box-2"].includes(protocolId) || animationType === "box")) return "box";
  if (protocolId === "physiological-sigh") return "sigh";
  if (protocolId === "nadi-shodhana") return "alternating";
  if (protocolId === "bhramari") return "ripple";
  return "pulse";
}
export function SessionVisual({ protocolId, animationType, ...props }: ComponentProps<typeof PulseSessionVisual> & {
  protocolId: string; animationType?: Protocol["animationType"];
}) {
  const renderer = rendererFor(protocolId, props.phases, animationType);
  if (renderer === "pulse" || renderer === "box") return <PulseSessionVisual {...props} geometry={renderer} />;
  return <SighVisual {...props} animationType={renderer} />;
}
