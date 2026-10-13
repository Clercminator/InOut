import React, { useEffect, useState } from "react";
import { Appearance, View } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { darkColors, lightColors, type ThemePreference } from "@inout/design-tokens";
import { ThemeProvider, useTheme } from "../src/theme";
import { ThemePicker } from "../src/theme-picker";
import { Button, Copy, useStyles } from "../src/ui";

jest.mock("expo-router", () => ({ router: {} }));
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(async () => {}) }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
let mounts = 0;
function Probe() {
  const { colors, mode } = useTheme();
  const s = useStyles();
  useEffect(() => { mounts++; }, []);
  return <View testID="surface" style={s.card}><Copy testID="ink">{mode}</Copy><Button title="Practice" onPress={() => {}} /><View testID="accent" style={{ backgroundColor: colors.accent }} /></View>;
}
function Harness() {
  const [theme, setTheme] = useState<ThemePreference>("system");
  return <ThemeProvider preference={theme}><ThemePicker value={theme} onChange={setTheme} /><Probe /></ThemeProvider>;
}
beforeEach(() => { mounts = 0; jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

test("theme selection updates mounted surfaces and text without resetting screen state", async () => {
  await render(<Harness />);
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  expect(screen.getByRole("radio", { name: "Light", selected: true })).toBeTruthy();
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: lightColors.card });
  expect(screen.getByTestId("ink")).toHaveStyle({ color: lightColors.text });
  await fireEvent.press(screen.getByRole("radio", { name: "Dark" }));
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: darkColors.card });
  expect(screen.getByTestId("ink")).toHaveStyle({ color: darkColors.text });
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("dark");
  expect(mounts).toBe(1);
});

test("system appearance changes propagate live; explicit preferences remain selected", async () => {
  let scheme: "light" | "dark" = "light";
  const callbacks = new Set<(value: { colorScheme: "light" | "dark" }) => void>();
  jest.spyOn(Appearance, "getColorScheme").mockImplementation(() => scheme);
  jest.spyOn(Appearance, "addChangeListener").mockImplementation(callback => {
    callbacks.add(callback);
    return { remove: () => callbacks.delete(callback) };
  });
  const change = async (next: "light" | "dark") => { await act(() => {
    scheme = next; callbacks.forEach(callback => callback({ colorScheme: next }));
  }); };
  await render(<Harness />);
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: lightColors.card });
  await change("dark");
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: darkColors.card });
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  await change("light"); await change("dark");
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: lightColors.card });
  await fireEvent.press(screen.getByRole("radio", { name: "System" }));
  expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("unspecified");
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: darkColors.card });
  expect(mounts).toBe(1);
});

test("returning to System reads the phone theme even if the native override emits no event", async () => {
  let override: "light" | "dark" | "unspecified" = "unspecified";
  jest.spyOn(Appearance, "getColorScheme").mockImplementation(() => override === "unspecified" ? "light" : override);
  jest.spyOn(Appearance, "setColorScheme").mockImplementation(value => { override = value; });
  await render(<Harness />);
  await fireEvent.press(screen.getByRole("radio", { name: "Dark" }));
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: darkColors.card });
  await fireEvent.press(screen.getByRole("radio", { name: "System" }));
  expect(screen.getByTestId("surface")).toHaveStyle({ backgroundColor: lightColors.card });
});
