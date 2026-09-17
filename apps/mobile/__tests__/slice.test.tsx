import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, screen } from "@testing-library/react-native";
import Pre from "../app/pre";
import Post from "../app/post";
import Result from "../app/result";
import Session from "../app/session";
import Custom from "../app/(tabs)/custom";
import ProtocolLibrary from "../app/(tabs)/protocols";
import Progress from "../app/(tabs)/progress";
import { RoutineEditor } from "../src/routine-editor";
import { SessionController } from "../src/session-controller";
import type { LocalStore } from "../src/storage";
import type { SessionRecord, SavedRoutine } from "@inout/shared-types";
import { protocols } from "@inout/protocols";

let mockController: SessionController;
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: { id?: string } = {};
jest.mock("expo-router", () => ({
  Redirect: () => null,
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
    canGoBack: () => false,
  },
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/progress",
  useFocusEffect: (effect: () => () => void) => {
    require("react").useEffect(effect, [effect]);
  },
}));
jest.mock("../src/sigh-visual", () => ({ SighVisual: () => null }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "draft-id" }));
jest.mock("../src/provider", () => ({
  useSession: () => mockController,
  SaveError: () => null,
}));

let now = 0;
beforeEach(() => {
  let record: SessionRecord | null = null;
  const routines = new Map<string, SavedRoutine>();
  let storedPreferences = {
    audio: "silent" as const,
    haptics: false,
    keepAwake: false,
    favoriteProtocolIds: [] as string[],
  };
  now = 0;
  mockParams = {};
  mockReplace.mockClear();
  mockPush.mockClear();
  const store = {
    preferences: () => storedPreferences,
    pending: () => null,
    save: (r: SessionRecord) => {
      record = r;
    },
    savePreferences: (preferences: typeof storedPreferences) => {
      storedPreferences = preferences;
    },
    clearHistory: () => {
      record = null;
    },
    history: () => (record?.stage === "result" ? [record] : []),
    routines: () => [...routines.values()],
    saveRoutine: (routine: SavedRoutine) => routines.set(routine.id, routine),
    removeRoutine: (id: string) => routines.delete(id),
  } as unknown as LocalStore;
  mockController = new SessionController(
    store,
    () => now,
    () => "test-session",
  );
});

test("Progress history button navigates to the durable session list", async () => {
  mockController.start(7);
  now = 48000;
  mockController.tick();
  mockController.answer(3, null);
  await render(<Progress />);
  await fireEvent.press(screen.getByRole("button", { name: "View session history" }));
  expect(mockPush).toHaveBeenCalledWith("/history");
  expect(mockController.history()).toHaveLength(1);
});
test("pre rating requires a deliberate selection and keeps skip available", async () => {
  await render(<Pre />);
  expect(screen.getByRole("button", { name: "START RESET  →" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("radio", { name: "7 of 10" }));
  await fireEvent.press(screen.getByRole("button", { name: "START RESET  →" }));
  expect(mockController.current?.pre).toBe(7);
  expect(mockReplace).toHaveBeenCalledWith("/session");
});

test("pattern editor changes durations, reorders phases and saves the executed cadence", async () => {
  await render(<RoutineEditor kind="pattern" />);
  await fireEvent.changeText(screen.getByLabelText("Name"), "Evening pattern");
  await fireEvent.changeText(screen.getByLabelText("Phase 1 seconds"), "3");
  await fireEvent.press(screen.getByRole("button", { name: "Move down 1" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save routine" }));
  const saved = mockController.routines()[0];
  expect(saved.protocol.name).toBe("Evening pattern");
  expect(saved.protocol.phases.map((p) => p.durationMs)).toEqual([6000, 3000]);
  await fireEvent.press(screen.getByRole("button", { name: "Use this routine" }));
  expect(mockController.customProtocol?.phases).toEqual(saved.protocol.phases);
});

test("invalid duration blocks saving and running a custom pattern", async () => {
  await render(<RoutineEditor kind="pattern" />);
  await fireEvent.changeText(screen.getByLabelText("Phase 1 seconds"), "");
  expect(screen.getByRole("button", { name: "Save routine" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Use this routine" })).toBeDisabled();
});

test("mix editor supports duplicated ordered blocks and repeat counts", async () => {
  await render(<RoutineEditor kind="mix" />);
  await fireEvent.press(screen.getByRole("button", { name: "Add Physiological Sigh" }));
  await fireEvent.press(screen.getByRole("button", { name: "Duplicate 1" }));
  await fireEvent.changeText(screen.getByLabelText("Block 2 cycles"), "2");
  await fireEvent.changeText(screen.getByLabelText("Repeats"), "2");
  await fireEvent.press(screen.getByRole("button", { name: "Save routine" }));
  const saved = mockController.routines()[0].protocol;
  expect(saved.plan?.blocks.map((b) => b.cycles)).toEqual([3, 2]);
  expect(saved.defaultDuration).toBe(160000);
});
test("post hides the prior score/comparison until an explicit answer", async () => {
  mockController.start(7);
  now = 48000;
  mockController.tick();
  await render(<Post />);
  expect(screen.queryByText(/Tension down/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "SEE MY STATE SHIFT  →" }),
  ).toBeDisabled();
  await fireEvent.press(screen.getByRole("radio", { name: "3 of 10" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "SEE MY STATE SHIFT  →" }),
  );
  expect(mockController.current?.post).toBe(3);
  expect(mockController.current?.stage).toBe("result");
});
test("result presents raw scores and honest negative shift", async () => {
  mockParams = { id: "test-session" };
  mockController.start(3);
  now = 48000;
  mockController.tick();
  mockController.answer(7, "Worse");
  await render(<Result />);
  expect(screen.getByText("Tension up 4 points")).toBeTruthy();
  expect(screen.getByText("Self-reported tension · 1–10")).toBeTruthy();
});
test("skip saves null rather than the visual default", async () => {
  await render(<Pre />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Skip rating & start" }),
  );
  expect(mockController.current?.pre).toBeNull();
});

test("an expired custom draft never silently starts a sigh", async () => {
  mockParams = { id: "custom" };
  await render(<Pre />);
  expect(screen.getByText("This pattern is unavailable.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Skip rating & start" })).toBeNull();
});

test("result opens History and restores custom replay data", async () => {
  mockParams = { id: "test-session" };
  const custom = { ...protocols[0], id: "custom-pattern", name: "My pattern" };
  mockController.start(null, 6, custom);
  mockController.end("ended");
  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "DONE · VIEW HISTORY  →" }));
  expect(mockReplace).toHaveBeenCalledWith("/history");
  await fireEvent.press(screen.getByRole("button", { name: "Do it again" }));
  expect(mockController.customProtocol?.defaultCycles).toBe(6);
  expect(mockController.customProtocol?.id).toBe("custom-pattern");
});

test("pre-session loadout changes the selected cycle count", async () => {
  await render(<Pre />);
  await fireEvent.press(
    screen.getByRole("button", { name: /1:36 · 6 cycles/ }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Skip rating & start" }),
  );
  expect(mockController.current?.engine.plan.blocks[0].cycles).toBe(6);
});

test("saved routines persist through the session controller", () => {
  mockController.toggleFavorite("coherent");
  expect(mockController.isFavorite("coherent")).toBe(true);
  mockController.toggleFavorite("coherent");
  expect(mockController.isFavorite("coherent")).toBe(false);
});

test("Custom shows a saved routine and starts it with its protocol id", async () => {
  mockController.toggleFavorite("coherent");
  await render(<Custom />);
  expect(screen.getByText("Coherent Breathing")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Start routine" }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/pre",
    params: { id: "coherent" },
  });
});

test("library filters saved routines and goals without losing navigation", async () => {
  mockController.toggleFavorite("coherent");
  await render(<ProtocolLibrary />);
  await fireEvent.press(screen.getByRole("button", { name: "Saved" }));
  expect(screen.getByText("Coherent Breathing")).toBeTruthy();
  expect(screen.queryByText("Box Breathing")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Sleep" }));
  expect(screen.getByText("4-7-8 Breathing")).toBeTruthy();
  expect(screen.queryByText("Coherent Breathing")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: /4-7-8 Breathing, Prepare for sleep/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/protocol", params: { id: "4-7-8" } });
});

test("clearing history removes a completed current record", () => {
  mockController.start(null);
  mockController.end("ended");
  expect(mockController.current?.stage).toBe("result");
  mockController.clearHistory();
  expect(mockController.current).toBeNull();
});

test("enabled gentle protocols use their own plan and metadata", () => {
  const coherent = protocols.find((protocol) => protocol.id === "coherent")!;
  mockController.start(null, coherent.defaultCycles, coherent);
  expect(mockController.current?.protocolId).toBe("coherent");
  expect(mockController.current?.protocolName).toBe("Coherent Breathing");
  expect(mockController.current?.engine.plan.blocks[0].phases).toEqual(
    coherent.phases,
  );
});

test("high-intensity definitions stay unavailable even after safety confirmation", () => {
  const box = protocols.find((protocol) => protocol.id === "box")!;
  const cyclic = protocols.find(
    (protocol) => protocol.id === "high-intensity-cyclic",
  )!;
  expect(box.availability).toBe("enabled");
  expect(cyclic.availability).toBe("definitionOnly");
  mockController.start(null, cyclic.defaultCycles, cyclic);
  expect(mockController.current).toBeNull();
  mockController.start(null, cyclic.defaultCycles, cyclic, true);
  expect(mockController.current).toBeNull();
  mockController.start(null, box.defaultCycles, box);
  expect(mockController.current?.protocolId).toBe("box");
});

test("discomfort pauses immediately before the user confirms ending", async () => {
  mockController.start(7);
  now = 2000;
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<Session />);
  await fireEvent.press(screen.getByRole("button", { name: "I feel unwell" }));
  expect(mockController.current?.engine.status).toBe("paused");
  expect(mockController.view()?.sessionElapsedMs).toBe(2000);
  alert.mock.calls[0][2]?.[0].onPress?.();
  expect(mockController.current?.endReason).toBe("unwell");
  expect(mockController.current?.post).toBeNull();
  alert.mockRestore();
});

test("leaving the active route pauses without discarding the session", async () => {
  mockController.start(null);
  now = 1500;
  const rendered = await render(<Session />);
  await rendered.unmount();
  expect(mockController.current?.engine.status).toBe("paused");
  expect(mockController.current?.stage).toBe("active");
  expect(mockController.view()?.sessionElapsedMs).toBe(1500);
});
