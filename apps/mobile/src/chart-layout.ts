import { colors } from "@inout/design-tokens";

export const chartColors: Record<string, string> = {
  Calm: colors.exhale, Focus: colors.accent, Perform: colors.hold,
  Recover: "#f4cb7a", Sleep: "#f0a696", Energize: colors.rest,
  "In-app": colors.accent, Manual: colors.exhale,
};
export function chartLayout(width: number, count: number, fontScale: number) {
  const axisWidth = Math.min(width * 0.38, 58 * Math.max(1, fontScale));
  const available = Math.max(1, width - axisWidth - 8);
  const scroll = count > 24 || fontScale > 1.4;
  return { axisWidth, plotWidth: scroll ? Math.max(available, count * 52) : available, scroll };
}
