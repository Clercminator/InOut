export const darkColors = {
  reward: "#F5B62D", onReward: "#164F59",
  background: "#111317", lowest: "#0B0C10", card: "#191923", raised: "#242334",
  border: "#3D394F", text: "#F8F5FF", secondaryText: "#CEC7DF", muted: "#AAA3BE",
  accent: "#C4A1FF", blue: "#5B2DFF", onAccent: "#191025", danger: "#FF918A",
  dangerSurface: "#381A2A", sessionSurface: "#241B38", sessionBorder: "#655184",
  inhale: "#C4A1FF", hold: "#F49AD0", exhale: "#60B5FA", rest: "#2DD4BF", gold: "#F4C654",
  accentSurface: "#272035", accentBorder: "#705295", shadow: "#000000",
};
export type ThemeColors = typeof darkColors;
export const lightColors: ThemeColors = {
  reward: "#F5B62D", onReward: "#164F59",
  background: "#FAFCFC", lowest: "#FFFFFF", card: "#FFFFFF", raised: "#EAF5F6",
  border: "#D7E7E8", text: "#123E46", secondaryText: "#41636A", muted: "#527078",
  accent: "#124F59", blue: "#205CB3", onAccent: "#FFFFFF", danger: "#B42F46",
  dangerSurface: "#FCEEF0", sessionSurface: "#EFF5FA", sessionBorder: "#A9C6E2",
  inhale: "#205CB3", hold: "#7351A8", exhale: "#197658", rest: "#886019", gold: "#886019",
  accentSurface: "#EAF5F6", accentBorder: "#8FC5CB", shadow: "#124F59",
};
export const colors = darkColors;
export type ThemePreference = "system" | "light" | "dark";
export function resolveTheme(preference: ThemePreference, system: "light" | "dark" | "unspecified" | null | undefined) {
  return preference === "system" ? system === "dark" ? "dark" : "light" : preference;
}
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  compact: 12,
  gutter: 20,
  spacious: 40,
} as const;
export const radii = { button: 16, card: 22, pill: 9999 } as const;
export const typography = {
  body: "Inter_400Regular",
  medium: "Inter_600SemiBold",
  heading: "Inter_700Bold",
  display: "Inter_800ExtraBold",
  label: "SpaceGrotesk_500Medium",
  metric: "SpaceGrotesk_700Bold",
} as const;
export const motion = {
  pressMs: 150,
  transitionMs: 200,
  reducedMotionScale: 1,
} as const;
