import PracticeSafety from "../app/practice-safety";
import React from "react";
import { Alert, Share } from "react-native";
import { render, fireEvent, screen, waitFor, act } from "@testing-library/react-native";
import { NotificationSettings } from "../src/notification-settings";
import Insights from "../app/insights";
import { ReminderContext } from "../src/reminder-context";
import { ReminderService } from "../src/reminders";
import Pre from "../app/pre";
import Post from "../app/post";
import Result from "../app/result";
import Session from "../app/session";
import Custom from "../app/(tabs)/custom";
import ProtocolLibrary from "../app/(tabs)/protocols";
import Progress from "../app/(tabs)/progress";
import Stats from "../app/stats";
import AddSession from "../app/add-session";
import History from "../app/history";
import { dayKey } from "../src/progress";
import { PracticeChart } from "../src/progress-charts";
import { manualSession } from "../src/manual-session";
import { chartColors } from "../src/chart-layout";
import { RoutineEditor } from "../src/routine-editor";
import { SessionController } from "../src/session-controller";
import type { LocalStore } from "../src/storage";
import type { SessionRecord, SavedRoutine } from "@inout/shared-types";
import { catalogProtocols, protocols } from "@inout/protocols";
import { CommercialContext, type CommercialServices } from "../src/commercial-context";

let mockController: SessionController;
const mockNotificationPermission = jest.fn(async (..._args: unknown[]) => true);
jest.mock("../src/reminder-native", () => ({
  nativeReminderAdapter: () => ({ permission: (...args: unknown[]) => mockNotificationPermission(...args) }),
  configureEngagementNotifications: jest.fn(async () => {}),
}));
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: { id?: string; date?: string; saved?: string } = {};
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
jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: (props: object) => require("react").createElement(require("react-native").View, { ...props, testID: "native-date-picker" }),
  DateTimePickerAndroid: { open: jest.fn() },
}));
jest.mock("../src/sigh-visual", () => ({ SighVisual: () => null }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "draft-id" }));
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ volume: 1, play: jest.fn(), pause: jest.fn(), remove: jest.fn(), addListener: jest.fn() })),
  setAudioModeAsync: jest.fn(async () => {}), setIsAudioActiveAsync: jest.fn(async () => {}),
}));
jest.mock("../src/provider", () => ({
  useSession: () => mockController,
  SaveError: () => null,
}));

let now = 0;
let mockDiskFull = false;
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
  mockDiskFull = false;
  mockParams = {};
  mockReplace.mockClear();
  mockPush.mockClear();
  const store = {
    preferences: () => storedPreferences,
    pending: () => null,
    save: (r: SessionRecord) => {
      if (mockDiskFull) throw new Error("disk full");
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

test("progress exposes period stats, calendar navigation, refresh and manual entry", async () => {
  await render(<Progress />);
  await fireEvent.press(screen.getByRole("button", { name: "Calendar" }));
  expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Previous month" }));
  expect(screen.getByRole("button", { name: "Next month" })).not.toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Overview" }));
  await fireEvent.press(screen.getByRole("button", { name: "See all stats" }));
  expect(mockPush).toHaveBeenCalledWith("/stats");
  expect(screen.queryByText("Longest session duration")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Refresh data" }));
  expect(screen.getByText("Local session data refreshed.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Add session" }));
  expect(mockPush).toHaveBeenCalledWith("/add-session");
});

test("progress reserves sharing for milestones and calendar days open their session logs", async () => {
  now = Date.now();
  const startedAt = now - 60000;
  mockController.addManualSession({ goal: "Calm", startedAt, durationMs: 30000 });
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
  await render(<Progress />);
  expect(screen.queryByRole("button", { name: "Share streak" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Badges" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/milestone", params: { badge: "sessions-1" } });
  await fireEvent.press(screen.getByRole("button", { name: "Calendar" }));
  const key = dayKey(new Date(startedAt));
  await fireEvent.press(screen.getByRole("button", { name: `${key}, practiced, view sessions, 1 practice day` }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/history", params: { date: key } });
  share.mockRestore();
});

test("dedicated stats screen switches periods and labels scoped totals", async () => {
  await render(<Stats />);
  for (const period of ["Weeks", "Months", "All time", "Days"]) {
    await fireEvent.press(screen.getByRole("button", { name: period }));
    expect(screen.getByRole("button", { name: period })).toBeSelected();
  }
  expect(screen.getByText("Longest session duration")).toBeTruthy();
  expect(screen.getAllByText("Period total")).toHaveLength(2);
});

test("chart colors stay attached to goals and accessible controls inspect periods", async () => {
  const calm = manualSession({ goal: "Calm", startedAt: 0, durationMs: 60000 }, "calm", 300000);
  const focus = manualSession({ goal: "Focus", startedAt: 0, durationMs: 120000 }, "focus", 300000);
  const buckets = [{ key: "first", label: "First day", records: [calm, focus] }, { key: "second", label: "Second day", records: [calm] }];
  await render(<PracticeChart title="Time" buckets={buckets} metric="time" by="goal" />);
  expect(screen.getByTestId("segment-first-Calm")).toHaveStyle({ backgroundColor: chartColors.Calm });
  expect(screen.getByTestId("segment-first-Focus")).toHaveStyle({ backgroundColor: chartColors.Focus });
  expect(screen.getByRole("button", { name: "Next period" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Previous period" }));
  expect(screen.getByRole("adjustable", { name: "First day: 3m" })).toBeTruthy();
  await fireEvent(screen.getByRole("adjustable"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  expect(screen.getByRole("adjustable", { name: "Second day: 1m" })).toBeTruthy();
  await screen.rerender(<PracticeChart title="Time" buckets={[{ ...buckets[0], records: [calm] }]} metric="time" by="goal" />);
  expect(screen.getByTestId("segment-first-Calm")).toHaveStyle({ backgroundColor: chartColors.Calm });
});

test("leaving a failed manual draft cancels its pending write", async () => {
  now = Date.now();
  const rendered = await render(<AddSession />);
  mockDiskFull = true;
  await fireEvent.press(screen.getByRole("button", { name: "Save session" }));
  expect(mockController.error).toBeTruthy();
  await rendered.unmount();
  mockDiskFull = false;
  mockController.retry();
  expect(mockController.history()).toHaveLength(0);
  expect(mockController.error).toBeNull();
});

test("native picker cancellation keeps the original timestamp", async () => {
  now = Date.now();
  await render(<AddSession />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose date" }));
  await fireEvent(screen.getByTestId("native-date-picker"), "valueChange", {}, new Date(2000, 0, 1));
  await fireEvent.press(screen.getByRole("button", { name: "Cancel picker" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save session" }));
  expect(mockController.history()[0].engine.startedAt).toBeGreaterThan(now - 120000);
});

test("storage retry transitions directly to saved confirmation", async () => {
  now = Date.now();
  await render(<AddSession />);
  mockDiskFull = true;
  await fireEvent.press(screen.getByRole("button", { name: "Save session" }));
  expect(mockController.error).toBeTruthy();
  expect(mockController.history()).toHaveLength(0);
  mockDiskFull = false;
  await fireEvent.press(screen.getByRole("button", { name: "Retry saving" }));
  expect(screen.getByText("Session saved")).toBeTruthy();
  expect(mockController.history()).toHaveLength(1);
  expect(mockController.error).toBeNull();
});

test("cancelling manual entry does not save a session", async () => {
  await render(<AddSession />);
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(mockController.history()).toHaveLength(0);
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)/progress");
});

test("manual session form validates input then saves the selected goal, time and duration", async () => {
  now = new Date(2026, 8, 21, 12).getTime();
  await render(<AddSession />);
  await fireEvent.changeText(screen.getByLabelText("Minutes"), "60");
  await fireEvent.press(screen.getByRole("button", { name: "Save session" }));
  expect(screen.getByText("Use whole numbers; minutes and seconds must be 0–59.")).toBeTruthy();
  expect(mockController.history()).toHaveLength(0);
  await fireEvent.press(screen.getByRole("button", { name: "Choose date" }));
  await fireEvent(screen.getByTestId("native-date-picker"), "valueChange", {}, new Date(2026, 8, 20));
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  await fireEvent.press(screen.getByRole("button", { name: "Choose time" }));
  await fireEvent(screen.getByTestId("native-date-picker"), "valueChange", {}, new Date(2026, 8, 20, 9, 30));
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  await fireEvent.changeText(screen.getByLabelText("Minutes"), "12");
  await fireEvent.changeText(screen.getByLabelText("Seconds"), "30");
  await fireEvent.press(screen.getByRole("button", { name: "Focus" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save session" }));
  const record = mockController.history()[0];
  expect(record.source).toBe("manual"); expect(record.goal).toBe("Focus");
  expect(record.engine.elapsedAtAnchor).toBe(750000);
  expect(record.engine.startedAt).toBe(new Date(2026, 8, 20, 9, 30).getTime());
  expect(screen.getByText("Session saved")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "View session history" }));
  expect(mockReplace).toHaveBeenCalledWith("/history");
});

test("history date filter and manual result preserve provenance without offering replay", async () => {
  now = new Date(2026, 8, 21, 12).getTime();
  const id = mockController.addManualSession({ goal: "Calm", startedAt: new Date(2026, 8, 20, 12).getTime(), durationMs: 60000 });
  mockParams = { date: "2026-09-19" };
  const rendered = await render(<History />);
  expect(screen.queryByText("Manual breathing")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Show all dates" }));
  expect(mockReplace).toHaveBeenCalledWith("/history");
  await rendered.unmount(); mockParams = { id: id! };
  await render(<Result />);
  expect(screen.getByText(/Manually logged/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Do it again" })).toBeNull();
});
test("pre rating requires a deliberate selection and keeps skip available", async () => {
  await render(<Pre />);
  expect(screen.getByRole("button", { name: "Continue to safety" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("radio", { name: "7 of 10" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue to safety" }));
  await act(async () => { mockController.confirmSafety(); });
  expect(mockController.current?.pre).toBe(7);
  expect(mockPush).toHaveBeenCalledWith("/practice-safety");
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
  expect(screen.getByText("Congratulations!")).toBeTruthy();
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
test("fresh saved improvement celebrates, history and failed saves do not", async () => {
  mockController.start(7);
  now = 48000;
  mockController.tick();
  mockController.answer(3, null);
  mockParams = { id: "test-session", saved: "1" };
  const rendered = await render(<Result />);
  expect(screen.getByText("A little lighter.")).toBeTruthy();
  mockParams = { id: "test-session" };
  await rendered.rerender(<Result />);
  expect(screen.queryByText("A little lighter.")).toBeNull();
  mockController.start(7);
  now += 48000;
  mockController.tick();
  mockDiskFull = true;
  mockController.answer(3, null);
  mockParams = { id: "test-session", saved: "1" };
  await rendered.rerender(<Result />);
  expect(screen.queryByText("A little lighter.")).toBeNull();
  expect(screen.queryByText("Session saved!")).toBeNull();
});

test("successful saved results present the completion ad automatically and show its thank-you", async () => {
  mockController.setPreferences({ ...mockController.preferences, freeAdsNoticeSeen: true });
  mockController.start(7); now = 48000; mockController.tick(); mockController.answer(3, null);
  mockParams = { id: "test-session", saved: "1" };
  const idle = { subscribe: () => () => {}, getRevision: () => 0 };
  const presentCompletion = jest.fn(async () => true), cancelCompletion = jest.fn();
  const commercial = {
    entitlements: { ...idle, has: () => false, accessReady: true, billingReady: true, state: { pro: false } },
    subscriptions: idle,
    ads: { ...idle, mode: "test", setContext: jest.fn(), presentCompletion, cancelCompletion },
    analytics: mockController.analytics,
  } as unknown as CommercialServices;
  await render(<CommercialContext.Provider value={commercial}><Result /></CommercialContext.Provider>);
  await waitFor(() => expect(presentCompletion).toHaveBeenCalledWith("test-session", expect.any(Function)));
  expect(screen.getByText("Thank you for helping us make the app better by watching this ad.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Return to Home" }));
  expect(cancelCompletion).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
});

test("sharing privacy details appear only from the adjacent info button", async () => {
  mockController.start(7); now = 48000; mockController.tick(); mockController.answer(3, null);
  mockParams = { id: "test-session" };
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<Result />);
  expect(screen.queryByText(/Only the breathing cadence is uploaded/)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "About exercise sharing" }));
  expect(alert).toHaveBeenCalledWith("About exercise sharing", expect.stringContaining("Names, ratings and notes stay private"), expect.any(Array));
  alert.mockRestore();
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
    screen.getByRole("button", { name: "Skip rating & continue" }),
  );
  await act(async () => { mockController.confirmSafety(); });
  expect(mockController.current?.pre).toBeNull();
});

test("an expired custom draft never silently starts a sigh", async () => {
  mockParams = { id: "custom" };
  await render(<Pre />);
  expect(screen.getByText("This pattern is unavailable.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Skip rating & continue" })).toBeNull();
});

test("result returns Home and restores custom replay data", async () => {
  mockParams = { id: "test-session" };
  const custom = { ...protocols[0], id: "custom-pattern", name: "My pattern" };
  mockController.start(null, 6, custom);
  mockController.end("ended");
  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "Return to Home" }));
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
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
    screen.getByRole("button", { name: "Skip rating & continue" }),
  );
  await act(async () => { mockController.confirmSafety(); });
  expect(mockController.current?.engine.plan.blocks[0].cycles).toBe(6);
});

test("saved routines persist through the session controller", () => {
  mockController.toggleFavorite("coherent");
  expect(mockController.isFavorite("coherent")).toBe(true);
  mockController.toggleFavorite("coherent");
  expect(mockController.isFavorite("coherent")).toBe(false);
});

test("Custom opens a saved routine detail with its protocol id", async () => {
  mockController.toggleFavorite("coherent");
  await render(<Custom />);
  expect(screen.getByText("Coherent Breathing")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Coherent Breathing, Saved practice, Saved" }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/protocol",
    params: { id: "coherent" },
  });
});

test("library filters saved routines and goals without losing navigation", async () => {
  mockController.toggleFavorite("coherent");
  await render(<ProtocolLibrary />);
  await fireEvent.press(screen.getByRole("button", { name: "Saved" }));
  expect(screen.getByText("Coherent Breathing")).toBeTruthy();
  expect(screen.queryByText("Box Breathing")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Calm & Unwind" }));
  expect(screen.getByText("4-7-8 Breathing")).toBeTruthy();
  expect(screen.queryByText("Coherent Breathing")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: /4-7-8 Breathing, Prepare for sleep/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/protocol", params: { id: "4-7-8" } });
});

test("actual 14 preset catalog is visible, searchable and launches working sessions", async () => {
  const required = [
    { id: "coherent", name: "Coherent Breathing", phases: [5, 5] },
    { id: "box", name: "Box Breathing", phases: [4, 4, 4, 4] },
    { id: "meditation-breathing", name: "Meditation Breathing", phases: [6, 2, 6, 2] },
    { id: "traditional-yogic", name: "Traditional Yogic", phases: [4, 16, 8] },
    { id: "equal", name: "Equal Breathing", phases: [4, 4] },
    { id: "box-2", name: "Triangle Breathing", phases: [4, 4, 4] },
    { id: "4-7-8", name: "4-7-8 Breathing", phases: [4, 7, 8] },
    { id: "three-stage-breath", name: "Three-Stage Breath", phases: [3, 1, 5, 1] },
    { id: "runner-rhythm", name: "Runner's Rhythm", phases: [3, 3] },
    { id: "high-intensity-cyclic", name: "Stimulating Breath", phases: [2, 2] },
    { id: "athletic", name: "Athletic Preparation", phases: [3, 3, 6, 3] },
    { id: "endurance", name: "Endurance Pattern", phases: [4, 8, 4] },
    { id: "swimmer", name: "Swimmer's Rhythm", phases: [4, 8, 6, 2] },
    { id: "measured", name: "Measured Breathing", phases: [4, 1, 7] },
  ] as const;

  const visible = catalogProtocols.filter((protocol) => protocol.availability === "enabled");
  expect(visible).toHaveLength(14);

  const rendered = await render(<ProtocolLibrary />);
  for (const preset of required) {
    expect(screen.getByText(preset.name)).toBeTruthy();
    const protocol = visible.find((item) => item.id === preset.id)!;
    expect(protocol).toBeTruthy();
    const cycle = protocol.phases.filter((phase) => phase.durationMs > 0).map((phase) => phase.durationMs / 1000);
    expect(cycle).toEqual(preset.phases);
    const expectedDuration = preset.id === "high-intensity-cyclic" ? 648000 : cycle.reduce((sum, value) => sum + value, 0) * protocol.defaultCycles * 1000;
    expect(protocol.defaultDuration).toBe(expectedDuration);
    mockController.start(null, protocol.defaultCycles, protocol, preset.id === "high-intensity-cyclic");
    expect(mockController.current?.protocolId).toBe(protocol.id);
    mockController.end("ended");
  }

  await fireEvent.changeText(screen.getByPlaceholderText("Search protocols"), "yogic");
  expect(screen.getByText("Traditional Yogic")).toBeTruthy();
  expect(screen.queryByText("Coherent Breathing")).toBeNull();
  await fireEvent.changeText(screen.getByPlaceholderText("Search protocols"), "");
  mockController.toggleFavorite("box");
  await fireEvent.press(screen.getByRole("button", { name: "Saved" }));
  expect(screen.getByText("Box Breathing")).toBeTruthy();
  rendered.unmount();
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

test("cyclic breathing requires explicit safety confirmation", () => {
  const box = protocols.find((protocol) => protocol.id === "box")!;
  const cyclic = protocols.find(
    (protocol) => protocol.id === "high-intensity-cyclic",
  )!;
  expect(box.availability).toBe("enabled");
  expect(cyclic.availability).toBe("enabled");
  mockController.start(null, cyclic.defaultCycles, cyclic);
  expect(mockController.current).toBeNull();
  mockController.start(null, cyclic.defaultCycles, cyclic, true);
  expect(mockController.current?.protocolId).toBe(cyclic.id);
  mockController.end("ended");
  mockController.start(null, box.defaultCycles, box);
  expect(mockController.current?.protocolId).toBe("box");
});

test("result sharing opens a private preview before any data leaves the device", async () => {
  mockParams = { id: "test-session" };
  mockController.start(7); now = 48000; mockController.tick(); mockController.answer(3, "Calmer");
  const share = jest.spyOn(Share, "share");
  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "Share result" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/result-share", params: { id: "test-session" } });
  expect(share).not.toHaveBeenCalled();
  share.mockRestore();
});

test("cyclic pre-session requires precautions and lets the user end each hold immediately", async () => {
  mockParams = { id: "high-intensity-cyclic" };
  const rendered = await render(<Pre />);
  expect(mockController.current).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Up to 3:36 · 1 round" }));
  await fireEvent.press(screen.getByRole("button", { name: "Skip rating & continue" }));
  expect(mockController.current).toBeNull();
  await rendered.rerender(<PracticeSafety />);
  expect(screen.getByRole("button", { name: "Start practice" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "I have read the precautions and I am in a safe place" }));
  await fireEvent.press(screen.getByRole("button", { name: "Start practice" }));
  expect(mockController.current?.safetyConfirmed).toBe(true);
  now = 130000;
  await rendered.rerender(<Session />);
  await fireEvent.press(screen.getByRole("button", { name: "Breathe in now" }));
  expect(mockController.view()?.phase.type).toBe("inhale");
  expect(mockController.view()?.sessionElapsedMs).toBe(130000);
  now = 138000;
  await rendered.rerender(<Session />);
  await fireEvent.press(screen.getByRole("button", { name: "Release now" }));
  expect(mockController.view()?.phase.type).toBe("exhale");
  mockController.pause("background");
  mockController.restart();
  expect(mockController.view()?.sessionElapsedMs).toBe(0);
  expect(mockController.view()?.sessionRemainingMs).toBe(216000);
});

test("legacy cyclic snapshots and high-intensity mixes cannot bypass the guided protocol", () => {
  const p = protocols.find(p => p.id === "high-intensity-cyclic")!;
  mockController.start(null, 1, { ...p, version: 1 }, true);
  expect(mockController.current).toBeNull();
  mockController.start(null, 1, { ...p, id: "custom-mix" }, true);
  expect(mockController.current).toBeNull();
  mockController.start(null, 4, p, true);
  expect(mockController.current).toBeNull();
});

test("resuming a paused cyclic hold releases it instead of asking for another hold", () => {
  const p = protocols.find(p => p.id === "high-intensity-cyclic")!;
  mockController.start(null, 1, p, true);
  now = 130000;
  mockController.pause("background");
  now = 999999;
  mockController.resume();
  expect(mockController.view()?.phase.type).toBe("inhale");
  expect(mockController.view()?.sessionElapsedMs).toBe(130000);
});

test("discomfort ends immediately and the result presents safety guidance", async () => {
  mockController.start(7);
  now = 2000;
  const rendered = await render(<Session />);
  await fireEvent.press(screen.getByRole("button", { name: "I feel unwell" }));
  expect(mockController.current?.engine.status).toBe("ended");
  expect(mockController.view()?.sessionElapsedMs).toBe(2000);
  expect(mockController.current?.endReason).toBe("unwell");
  expect(mockController.current?.post).toBeNull();
  expect(screen.queryByTestId("confirm-end-session")).toBeNull();
  mockParams = { id: mockController.current!.id };
  await rendered.rerender(<Result />);
  expect(screen.getByText("Stop and breathe naturally")).toBeTruthy();
  expect(screen.getByText("Let go of the pacing. Sit or lie somewhere safe. Do not push through discomfort.")).toBeTruthy();
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


test("notification settings preserve preferences after permission denial and can retry", async () => {
  mockNotificationPermission.mockResolvedValueOnce(false).mockResolvedValue(true);
  await render(<NotificationSettings />);
  await fireEvent(screen.getByLabelText("Daily Reset"), "valueChange", true);
  await waitFor(() => expect(screen.getByText("Notifications are off. Enable them in phone settings, then try again.")).toBeTruthy());
  expect(mockController.preferences.notifications?.dailyReset).not.toBe(true);
  await fireEvent(screen.getByLabelText("Daily Reset"), "valueChange", true);
  await waitFor(() => expect(mockController.preferences.notifications?.dailyReset).toBe(true));
});

test("insight entry explains the Pro feature without blocking basic progress", async () => {
  await render(<Insights />);
  expect(screen.getByText("Explore Pro")).toBeTruthy();
  await fireEvent.press(screen.getByText("View history & progress"));
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)/progress");
});


test("practice audio opens a focused route while the pre-session draft stays mounted", async () => {
  mockParams = { id: "box" };
  await render(<Pre />);
  const preset = screen.getAllByRole("button").find(b => String(b.props.children?.props?.children ?? "").includes("5:00"));
  if (preset) await fireEvent.press(preset);
  await fireEvent.press(screen.getByRole("button", { name: "Audio & haptics" }));
  expect(mockPush).toHaveBeenCalledWith("/practice-audio");
  expect(screen.getByText("How tense are you right now?")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Breath sounds" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Skip rating & continue" }));
  await act(async () => { mockController.confirmSafety(); });
  expect(mockController.current?.protocolId).toBe("box");
});


test("dedicated safety is required for a new gentle session and cannot replay its confirmation", async () => {
  const view = await render(<Pre />);
  await fireEvent.press(screen.getByRole("button", { name: "Skip rating & continue" }));
  expect(mockController.current).toBeNull();
  expect(mockPush).toHaveBeenCalledWith("/practice-safety");
  await view.rerender(<PracticeSafety />);
  expect(screen.getByText("Choose a safe place")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Start practice" }));
  const record = mockController.current;
  expect(record?.stage).toBe("active");
  expect(mockReplace).toHaveBeenCalledWith("/session");
  mockController.confirmSafety();
  expect(mockController.current).toBe(record);
});
