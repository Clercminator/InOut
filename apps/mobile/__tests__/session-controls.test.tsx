import React, { useSyncExternalStore } from "react";
import { AppState, BackHandler } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SessionControls } from "../src/session-controls";
import { SessionController } from "../src/session-controller";
import type { LocalStore } from "../src/storage";
import type { SessionRecord } from "@inout/shared-types";
import { protocols } from "@inout/protocols";
import { setLanguage } from "../src/i18n";
jest.mock("expo-router", () => ({ useFocusEffect: (effect: () => () => void) => require("react").useEffect(effect, [effect]) }));
let c: SessionController, now: number, back: () => boolean, app: (state: string) => void;
const removed = jest.fn();
function Harness() {
  useSyncExternalStore(c.subscribe, c.getRevision, c.getRevision);
  return <SessionControls controller={c} running={c.current?.engine.status === "running"} disabled={!!c.error} compact={false} />;
}
beforeEach(() => {
  now = 0; removed.mockClear();
  let saved: SessionRecord | null = null;
  c = new SessionController({ preferences: () => ({ audio: "silent", haptics: false }), pending: () => null,
    save: (r: SessionRecord) => { saved = r; }, history: () => saved?.stage === "result" ? [saved] : [] } as unknown as LocalStore, () => now, () => "session");
  c.start(null, undefined, protocols.find(p => p.id === "coherent")!);
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_, listener) => { back = listener as () => boolean; return { remove: removed }; });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => { app = listener as (state: string) => void; return { remove: removed }; });
});
afterEach(() => { setLanguage("en"); jest.restoreAllMocks(); });
test("Pause and Resume are immediate and preserve the exact phase without counting downtime", async () => {
  await render(<Harness />); now = 2200;
  await fireEvent.press(screen.getByRole("button", { name: "Pause" }));
  expect(c.current?.engine.status).toBe("paused");
  expect(c.view()?.phaseElapsedMs).toBe(2200);
  now += 30000;
  await fireEvent.press(screen.getByRole("button", { name: "Resume" }));
  expect(c.current?.engine.status).toBe("running");
  expect(c.view()?.phaseElapsedMs).toBe(2200);
});
test("End opens immediately, Continue resumes, and confirmation never earns completion", async () => {
  await render(<Harness />); now = 3000;
  await fireEvent.press(screen.getByRole("button", { name: "End session" }));
  expect(screen.getByText("End your session?")).toBeTruthy();
  expect(c.current?.engine.status).toBe("paused");
  await fireEvent.press(screen.getByRole("button", { name: "Continue breathing" }));
  expect(c.current?.engine.status).toBe("running");
  expect(screen.queryByText("End your session?")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "End session" }));
  await fireEvent.press(screen.getByTestId("confirm-end-session"));
  expect(c.current?.endReason).toBe("ended");
  expect(c.current?.engine.status).not.toBe("completed");
  expect(c.latestAwards).toHaveLength(0);
});
test("Android Back opens and dismisses the dialog; background dismisses it permanently", async () => {
  const r = await render(<Harness />);
  await act(() => { expect(back()).toBe(true); });
  expect(screen.getByText("End your session?")).toBeTruthy();
  await act(() => back());
  expect(screen.queryByText("End your session?")).toBeNull();
  await act(() => back());
  await act(() => app("background"));
  await act(() => app("active"));
  expect(screen.queryByText("End your session?")).toBeNull();
  expect(c.current?.engine.status).toBe("paused");
  await r.unmount(); expect(removed).toHaveBeenCalledTimes(2);
});
test.each([["es", "¿Terminar la sesión?", "Continuar respirando"], ["pt", "Encerrar a sessão?", "Continuar respirando"]] as const)("confirmation is localized in %s", async (lang, title, keep) => {
  setLanguage(lang); await render(<Harness />);
  await act(() => back());
  expect(screen.getByText(title)).toBeTruthy();
  expect(screen.getByRole("button", { name: keep })).toBeTruthy();
});
