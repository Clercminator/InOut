export const darkColors = {
  background: "#060F20", lowest: "#040B18", card: "#0D2038", raised: "#142E4A",
  border: "#284764", text: "#F5FAFF", secondaryText: "#BDD0E5", muted: "#93AEC8",
  accent: "#5EA9FF", blue: "#246FF0", onAccent: "#041426", danger: "#FF918A",
  dangerSurface: "#381A2A", sessionSurface: "#102E54", sessionBorder: "#32669C",
  inhale: "#5EA9FF", hold: "#BE9BFF", exhale: "#36E5AC", rest: "#F4C654", gold: "#F4C654",
  accentSurface: "#142E4A", accentBorder: "#32669C", shadow: "#000000",
};
export type ThemeColors = typeof darkColors;
export const lightColors: ThemeColors = {
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
