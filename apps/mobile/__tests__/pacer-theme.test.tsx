import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { SessionRecord } from "@inout/shared-types";
import { EntitlementService } from "../src/entitlements";
import { LocalStore, type Database } from "../src/storage";
import { AnalyticsService } from "../src/analytics";
import { SessionController } from "../src/session-controller";
import { PacerThemePicker } from "../src/theme-picker";
import {
  earnedPacerThemeIds,
  pacerThemes,
  qualifyingPacerPracticeDays,
  type PacerThemeId,
} from "../src/pacer-theme";
import { setLanguage } from "../src/i18n";

beforeEach(() => setLanguage("en"));

function record(id: string, day: string, overrides: Partial<SessionRecord> = {}): SessionRecord {
  const [year, month, date] = day.split("-").map(Number);
  const finishedAt = new Date(year, month - 1, date, 12).getTime();
  return {
    id,
    protocolId: "coherent",
    protocolVersion: 1,
    protocolName: "Coherent Breathing",
    goal: "Calm",
    engine: { status: "completed", startedAt: finishedAt - 60_000, elapsedAtAnchor: 60_000 } as SessionRecord["engine"],
    pre: null,
    post: null,
    stage: "result",
    finishedAt,
    completionLocalDay: day,
    effect: null,
    endReason: "completed",
    source: "app",
    ...overrides,
  } as SessionRecord;
}

class MemoryDatabase implements Database {
  readonly settings = new Map<string, string>();
  execSync() {}
  runSync(sql: string, payload?: string | number | null) {
    const key = /VALUES\('([^']+)',\?\)/.exec(sql)?.[1];
    if (key && typeof payload === "string") this.settings.set(key, payload);
  }
  getAllSync<T>(): T[] { return []; }
  getFirstSync<T>(sql: string, ...params: (string | number | null)[]): T | null {
    if (sql.startsWith("PRAGMA user_version")) return { user_version: 0 } as T;
    if (sql.includes("FROM settings WHERE key=")) {
      const key = /key='([^']+)'/.exec(sql)?.[1] ?? String(params[0]);
      const payload = this.settings.get(key);
      return payload ? { payload } as T : null;
    }
    return null;
  }
  withTransactionSync(action: () => void) { action(); }
}

test("the ten pacer themes use the required Free thresholds", () => {
  expect(pacerThemes.map(({ id, unlockDays }) => [id, unlockDays])).toEqual([
    ["default", 0], ["dark-muted", 0], ["light", 0], ["sky", 3], ["mono", 5],
    ["mustard", 7], ["neon", 14], ["ember", 21], ["aurora", 30], ["matcha", 45],
  ]);
  expect(earnedPacerThemeIds(0)).toEqual([]);
  expect(earnedPacerThemeIds(3)).toEqual(["sky"]);
  expect(earnedPacerThemeIds(5)).toEqual(["sky", "mono"]);
  expect(earnedPacerThemeIds(45)).toEqual(pacerThemes.filter(theme => theme.unlockDays > 0).map(theme => theme.id));
  expect(earnedPacerThemeIds(0, ["sky"])).toEqual(["sky"]);
});

test("only completed in-app breathing records count unique saved local practice dates", () => {
  const now = new Date(2026, 9, 18, 23).getTime();
  const completed = record("a", "2026-10-10");
  const timezoneRecorded = record("timezone", "2026-10-19", {
    finishedAt: new Date(2026, 9, 18, 20).getTime(),
    engine: { status: "completed", startedAt: new Date(2026, 9, 18, 19).getTime(), elapsedAtAnchor: 60_000 } as SessionRecord["engine"],
  });
  const records = [
    completed,
    record("b", "2026-10-10"),
    timezoneRecorded,
    record("manual", "2026-10-11", { source: "manual" }),
    record("abandoned", "2026-10-12", { endReason: "ended" }),
    record("pending", "2026-10-13", { stage: "post" }),
    record("empty", "2026-10-14", { engine: { status: "completed", startedAt: completed.engine.startedAt, elapsedAtAnchor: 0 } as SessionRecord["engine"] }),
    record("future", "2026-10-19"),
  ];
  expect(qualifyingPacerPracticeDays(records, now)).toEqual(["2026-10-10", "2026-10-19"]);
  expect(completed.completionLocalDay).toBe("2026-10-10");
  expect(timezoneRecorded.completionLocalDay).toBe("2026-10-19");
  expect(record("legacy", "2026-10-10", { completionLocalDay: undefined }).completionLocalDay).toBeUndefined();
});

test("earned theme unlocks persist in local storage and remain permanent after history changes", () => {
  const database = new MemoryDatabase();
  const store = new LocalStore(database);
  const now = new Date(2026, 9, 18, 23).getTime();
  const dates = Array.from({ length: 45 }, (_, index) => {
    const date = new Date(2026, 7, 1 + index, 12);
    return record(`session-${index}`, `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  });

  expect(store.pacerThemeProgress(dates, now)).toMatchObject({
    practiceDays: 45,
    earnedThemeIds: pacerThemes.filter(theme => theme.unlockDays > 0).map(theme => theme.id),
  });

  const restarted = new LocalStore(database);
  expect(restarted.pacerThemeUnlocks()).toContain("matcha");
  expect(restarted.pacerThemeProgress([], now).earnedThemeIds).toContain("matcha");
});

test("gallery exposes all ten localized previews, free progress, lock choices and earned apply actions", async () => {
  const onApply = jest.fn(), onUpgrade = jest.fn(), onLockedTap = jest.fn(), onPreview = jest.fn(), onGalleryOpened = jest.fn();
  const props = {
    value: "default" as PacerThemeId,
    progress: { practiceDays: 5, earnedThemeIds: ["sky", "mono"] as PacerThemeId[] },
    pro: false,
    onApply,
    onUpgrade,
    onLockedTap,
    onPreview,
    onGalleryOpened,
    onDismissNotice: jest.fn(),
    noticeThemeIds: [] as PacerThemeId[],
  };
  await render(<PacerThemePicker {...props} />);
  expect(onGalleryOpened).toHaveBeenCalledTimes(1);
  expect(pacerThemes.map(theme => screen.getByText(theme.name))).toHaveLength(10);
  expect(screen.getByText("5 of 7 practice days")).toBeTruthy();
  expect(screen.getByText("5 of 14 practice days")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /^Preview / })).toHaveLength(10);

  await fireEvent.press(screen.getByRole("button", { name: "Neon" }));
  expect(onLockedTap).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Continue practicing to unlock")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Unlock all themes instantly with IN/OUT Pro" }));
  expect(onUpgrade).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByRole("button", { name: "Mono" }));
  expect(onApply).toHaveBeenCalledWith("mono");
  await fireEvent.press(screen.getAllByRole("button", { name: /^Preview / })[0]);
  expect(onPreview).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Pacer theme preview")).toBeTruthy();
});

test("gallery translation includes Brazilian Portuguese theme names and actions", async () => {
  const rendered = await render(<PacerThemePicker
    value="default"
    progress={{ practiceDays: 0, earnedThemeIds: [] }}
    pro={false}
    onApply={jest.fn()}
    onUpgrade={jest.fn()}
    onLockedTap={jest.fn()}
    onPreview={jest.fn()}
    onGalleryOpened={jest.fn()}
    onDismissNotice={jest.fn()}
    noticeThemeIds={[]}
  />);
  await act(async () => { setLanguage("es"); });
  expect(screen.getByText("Pulso predeterminado")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /^Vista previa de / })).toHaveLength(10);
  await act(async () => { setLanguage("pt"); });
  expect(screen.getByText("Pulso padrão")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /^Prévia de / })).toHaveLength(10);
  await act(async () => { setLanguage("en"); });
  rendered.unmount();
});

test("active Pro can apply every theme and the offline cache follows its freshness and expiration limits", async () => {
  const apply = jest.fn();
  const rendered = await render(<PacerThemePicker
    value="default"
    progress={{ practiceDays: 0, earnedThemeIds: [] }}
    pro
    onApply={apply}
    onUpgrade={jest.fn()}
    onLockedTap={jest.fn()}
    onPreview={jest.fn()}
    onGalleryOpened={jest.fn()}
    onDismissNotice={jest.fn()}
    noticeThemeIds={[]}
  />);
  for (const theme of pacerThemes) await fireEvent.press(screen.getByRole("button", { name: theme.name }));
  expect(apply.mock.calls.map(([id]) => id)).toEqual(pacerThemes.map(theme => theme.id));
  rendered.unmount();

  let now = 1_000_000;
  const cachedGrant = {
    source: "store" as const,
    status: "active" as const,
    active: true,
    verifiedAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    graceUntil: null,
  };
  const entitlements = new EntitlementService(false, () => now, { read: () => cachedGrant, write: () => {} });
  expect(entitlements.state.pro).toBe(true);
  now += 72 * 60 * 60 * 1000 + 1;
  expect(entitlements.state.pro).toBe(false);
});

test("Pro access unlocks all themes, while expiry falls back without replacing the saved preference", () => {
  let now = 1_000_000;
  let preferences = {
    audio: "silent" as const,
    haptics: false,
    keepAwake: false,
    pacerTheme: "default" as PacerThemeId,
  };
  const unlocks: PacerThemeId[] = [];
  const store = {
    preferences: () => preferences,
    savePreferences: (next: typeof preferences) => { preferences = next; },
    pending: () => null,
    history: () => [],
    pacerThemeUnlocks: () => unlocks,
    pacerThemeProgress: () => ({ practiceDays: 0, earnedThemeIds: unlocks }),
  };
  const entitlements = new EntitlementService(true, () => now);
  const controller = new SessionController(store as unknown as LocalStore, () => now, () => "test-theme", entitlements, new AnalyticsService());

  expect(controller.isPacerThemeAvailable("sky")).toBe(false);
  entitlements.simulate("active");
  expect(controller.applyPacerTheme("sky")).toBe(true);
  expect(unlocks).toEqual([]);
  expect(controller.effectivePacerTheme()).toBe("sky");
  entitlements.simulate("expired");
  expect(controller.effectivePacerTheme()).toBe("default");
  expect(controller.preferences.pacerTheme).toBe("sky");
  entitlements.simulate("active");
  expect(controller.effectivePacerTheme()).toBe("sky");
});

test("historical practice unlock analytics are emitted once, never on subscription alone", () => {
  const now = new Date(2026, 9, 18, 23).getTime();
  const records = [record("one", "2026-10-10"), record("two", "2026-10-11"), record("three", "2026-10-12")];
  let unlocked: PacerThemeId[] = [];
  const events: string[] = [];
  const store = {
    preferences: () => ({ audio: "silent" as const, haptics: false, keepAwake: false, pacerTheme: "default" as PacerThemeId }),
    pending: () => null,
    history: () => records,
    pacerThemeUnlocks: () => unlocked,
    pacerThemeProgress: (saved: SessionRecord[], time: number) => {
      const practiceDays = qualifyingPacerPracticeDays(saved, time).length;
      unlocked = earnedPacerThemeIds(practiceDays, unlocked);
      return { practiceDays, earnedThemeIds: unlocked };
    },
  };
  const analytics = new AnalyticsService({ record: event => events.push(event) });
  const controller = new SessionController(store as unknown as LocalStore, () => now, () => "history", undefined, analytics);
  controller.pacerThemeProgress();
  expect(events.filter(event => event === "theme_earned")).toHaveLength(1);
  expect(unlocked).toEqual(["sky"]);
});
