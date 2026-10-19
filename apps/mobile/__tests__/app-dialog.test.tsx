import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppAlertHost } from "../src/app-dialog";
import { Alert } from "../src/localized-native";
import { ThemeSurface } from "../src/theme";
import { setLanguage } from "../src/i18n";

beforeEach(() => { jest.useFakeTimers(); jest.replaceProperty(Platform, "OS", "android"); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); setLanguage("en"); });

test.each(["dark", "light"] as const)("%s app dialogs queue actions and execute each once after dismissal", async mode => {
  const first = jest.fn(), second = jest.fn();
  await render(<ThemeSurface mode={mode}><AppAlertHost /></ThemeSurface>);
  await act(() => { Alert.alert("About exercise sharing", "Private details", [{ text: "Close", onPress: first }]);
    Alert.alert("Delete this session?", "This removes the local record permanently.", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: second }]); });
  expect(screen.getByText("Private details")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(first).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(221));
  expect(first).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Delete this session?")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  await act(() => jest.advanceTimersByTime(221));
  expect(second).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Delete this session?")).toBeNull();
});

test("popup titles, messages and actions use the selected language", async () => {
  setLanguage("es"); await render(<AppAlertHost />);
  await act(() => Alert.alert("Restart session?", "The current attempt will reset to cycle 1.", [{ text: "Cancel" }]));
  expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  expect(screen.queryByText("Restart session?")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
  await act(() => jest.advanceTimersByTime(221));
});
