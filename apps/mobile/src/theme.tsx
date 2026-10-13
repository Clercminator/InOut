import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { Appearance } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { darkColors, lightColors, resolveTheme, type ThemeColors, type ThemePreference } from "@inout/design-tokens";
import { useExperience } from "./experience-context";

const darkPalettes = {
  sky: { accent: darkColors.accent, hold: darkColors.hold, exhale: darkColors.exhale },
  mint: { accent: "#36E5AC", hold: "#69BDFF", exhale: "#A1ED6A" },
  dusk: { accent: "#BE9BFF", hold: "#FF8DCF", exhale: "#62CFEE" },
  sunrise: { accent: "#F4C654", hold: "#FF9B77", exhale: "#58E2B1" },
};
const lightPalettes = {
  sky: { accent: lightColors.accent, hold: lightColors.hold, exhale: lightColors.exhale },
  mint: { accent: "#087B54", hold: "#125DB5", exhale: "#39741B" },
  dusk: { accent: "#7540AD", hold: "#AD286F", exhale: "#087188" },
  sunrise: { accent: "#896000", hold: "#AC441F", exhale: "#087B54" },
};
function makeTheme(mode: "dark" | "light") {
  const colors = mode === "dark" ? darkColors : lightColors;
  return { mode, colors, palettes: mode === "dark" ? darkPalettes : lightPalettes,
    backgrounds: mode === "dark"
      ? { midnight: colors.background, "deep-sea": "#052329", plum: "#201035" }
      : { midnight: colors.background, "deep-sea": "#F0F6F2", plum: "#F6F2F8" },
    chartColors: { Calm: colors.exhale, Focus: colors.accent, Perform: colors.hold,
      Recover: colors.gold, Sleep: colors.danger, Energize: colors.rest,
      "In-app": colors.accent, Manual: colors.exhale } as Record<string, string>,
  };
}
const themes = { dark: makeTheme("dark"), light: makeTheme("light") };
const ThemeContext = createContext(themes.dark);
export const useTheme = () => useContext(ThemeContext);
const styleCache = new WeakMap<Function, WeakMap<ThemeColors, unknown>>();
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  let byPalette = styleCache.get(factory);
  if (!byPalette) { byPalette = new WeakMap(); styleCache.set(factory, byPalette); }
  if (!byPalette.has(colors)) byPalette.set(colors, factory(colors));
  return byPalette.get(colors) as T;
}
export function ThemeProvider({ preference = "system", children }: PropsWithChildren<{ preference?: ThemePreference }>) {
  const [system, setSystem] = useState(Appearance.getColorScheme);
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    return () => subscription.remove();
  }, []);
  const mode = resolveTheme(preference, system);
  const theme = themes[mode];
  const { experience } = useExperience();
  const background = theme.backgrounds[experience.background];
  useEffect(() => {
    Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
    // Resetting the native override does not always emit an appearance event.
    setSystem(Appearance.getColorScheme());
  }, [preference]);
  useEffect(() => { void SystemUI.setBackgroundColorAsync(background).catch(() => {}); }, [background]);
  return <ThemeContext.Provider value={theme}>
    <StatusBar style={mode === "dark" ? "light" : "dark"} />
    {children}
  </ThemeContext.Provider>;
}
