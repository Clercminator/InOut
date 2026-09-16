// Selected Stitch HTML/screens take precedence over the conflicting prose palette in DESIGN.md.
export const colors = {
  background: "#111317",
  lowest: "#0c0e12",
  card: "#1a1c20",
  raised: "#1e2024",
  border: "#282a2e",
  text: "#ffffff",
  secondaryText: "#c4c7c9",
  muted: "#8e9193",
  accent: "#adc6ff",
  blue: "#0566d9",
  onAccent: "#002e6a",
  danger: "#ffb4ab",
  dangerSurface: "#300c10",
  sessionSurface: "#101d30",
  sessionBorder: "#263a53",
  inhale: "#adc6ff",
  hold: "#c9baff",
  exhale: "#8ddbc9",
  rest: "#a6b8ce",
} as const;
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
export const radii = { button: 12, card: 16, pill: 9999 } as const;
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
