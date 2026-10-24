import React from "react";
import * as Native from "react-native";
import { render, screen, fireEvent, within } from "@testing-library/react-native";
import { start, snapshot } from "@inout/breathing-engine";
import { planFor, protocols } from "@inout/protocols";
import { SessionVisual } from "../src/session-visual";
import { ThemeSurface } from "../src/theme";
import { setLanguage, t, message } from "../src/i18n";
import { breathingGuidance } from "../src/breathing-guidance";

afterEach(() => { jest.restoreAllMocks(); setLanguage("en"); });

test.each(["en", "es", "pt"] as const)("%s readout separates every phase, digits, cycle, guidance and next phase", async language => {
  setLanguage(language);
  jest.spyOn(Native.AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const original = protocols.find(p => p.id === "box")!;
  const phases = [...original.phases.map(p => ({ ...p, durationMs: 12000 })), { ...original.phases[0], type: "freeBreathing" as const, label: "Rest", durationMs: 3000 }];
  const state = start(planFor({ ...original, phases, defaultCycles: 12 }), 0);
  const renderAt = (time: number, mode: "light" | "dark", running = true) => <ThemeSurface mode={mode}><SessionVisual
    protocolId="custom" view={snapshot(state, time)} phases={phases} running={running} availableHeight={480} nextLabel="Exhale · 3s" /></ThemeSurface>;
  const result = await render(renderAt(0, "dark"));
  for (const mode of ["light", "dark"] as const) for (const time of [0, 3000, 12000, 24000, 36000, 48000, 51000]) {
    await result.rerender(renderAt(time, mode));
    const view = snapshot(state, time);
    const text = breathingGuidance(phases, view.phaseIndex, view.phaseElapsedMs);
    expect(within(screen.getByTestId("session-phase-row")).getByText(t(text.label))).toBeTruthy();
    expect(within(screen.getByTestId("session-countdown-row")).getByText(String(Math.ceil(view.phaseRemainingMs / 1000)))).toBeTruthy();
    expect(within(screen.getByTestId("session-cycle-row")).getByText(message("Cycle {0} of {1}", [view.currentCycle, 12]))).toBeTruthy();
    for (const name of ["phase", "countdown", "cycle", "guidance", "next"]) {
      const style = Native.StyleSheet.flatten(screen.getByTestId(`session-${name}-row`).props.style);
      expect(style.minHeight).toBeGreaterThan(0);
      expect(style.position).not.toBe("absolute");
      expect(style.height).toBeUndefined();
    }
    expect(screen.getByTestId("session-readout").props.accessibilityLabel).toContain(t(text.label));
  }
  await result.rerender(renderAt(12000, "dark", false));
  expect(screen.getByText(t("Paused"))).toBeTruthy();
  expect(screen.getByText(t("Breathe naturally while paused"))).toBeTruthy();
  await result.rerender(renderAt(12000, "dark", true));
  expect(screen.getByText(t("Hold"))).toBeTruthy();
});

test.each([[320,568,2],[390,844,1],[768,1024,1.5]])("%s×%s at font scale %s uses measured viewport and text height", async (width, height, fontScale) => {
  jest.spyOn(Native, "useWindowDimensions").mockReturnValue({ width, height, fontScale, scale: 3 });
  jest.spyOn(Native.AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const p = protocols.find(p => p.id === "coherent")!;
  await render(<SessionVisual protocolId={p.id} view={snapshot(start(planFor(p), 0), 0)} phases={p.phases} running availableHeight={450} />);
  const area = screen.getByTestId("session-animation-area");
  await fireEvent(area, "layout", { nativeEvent: { layout: { width: width-56, height: 200 } } });
  await fireEvent(screen.getByTestId("session-readout"), "layout", { nativeEvent: { layout: { width: width-56, height: 190*fontScale } } });
  const stageSize = Native.StyleSheet.flatten(area.props.style).height;
  expect(stageSize).toBeLessThanOrEqual(width-56);
  expect(stageSize).toBeLessThanOrEqual(420);
  expect(screen.getByTestId("pulse-orb", { includeHiddenElements: true })).toHaveStyle({ width: stageSize*.96, height: stageSize*.96, overflow: "visible" });
});
