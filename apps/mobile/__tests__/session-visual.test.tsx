import React from "react";
import { AccessibilityInfo, Animated } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { start, snapshot } from "@inout/breathing-engine";
import { protocols, planFor } from "@inout/protocols";
import { SessionVisual, rendererFor } from "../src/session-visual";
import { PulseArtwork } from "../src/pulse-orb";
import { pacerThemes } from "../src/pacer-theme";

afterEach(() => jest.restoreAllMocks());
test("Box geometry survives every theme and customized four-phase timings", async () => {
  const original = protocols.find(p => p.id === "box")!;
  const p = { ...original, phases: original.phases.map((phase, i) => ({ ...phase, durationMs: [3000, 6000, 5000, 2000][i] })) };
  const state = start(planFor(p), 0);
  const timing = jest.spyOn(Animated, "timing").mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  const r = await render(<SessionVisual protocolId="box" view={snapshot(state, 1000)} phases={p.phases} running />);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 2000, toValue: 1, isInteraction: false }));
  for (const theme of pacerThemes) {
    await r.rerender(<SessionVisual protocolId="box" view={snapshot(state, 4000)} phases={p.phases} running pacerTheme={theme.id} />);
    expect(screen.getByTestId("box-session-geometry", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("pulse-orb", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("box-orb-container", { includeHiddenElements: true })).toHaveStyle({ alignItems: "center", justifyContent: "center" });
  }
  expect(rendererFor("box-2", p.phases)).toBe("box");
});
test("Pulse uses the approved untinted artwork on Home and in every pacer theme", async () => {
  const p = protocols.find(p => p.id === "coherent")!;
  const view = snapshot(start(planFor(p), 0), 1000);
  const r = await render(<><PulseArtwork /><SessionVisual protocolId={p.id} view={view} phases={p.phases} running /></>);
  for (const theme of pacerThemes) {
    await r.rerender(<><PulseArtwork theme={theme.id} /><SessionVisual protocolId={p.id} view={view} phases={p.phases} running pacerTheme={theme.id} /></>);
    for (const id of ["pulse-artwork", "pulse-branded-art"]) {
      const art = screen.getByTestId(id, { includeHiddenElements: true });
      expect(art.props.source).toEqual(require("../assets/pulse-orb.png"));
      expect(art).not.toHaveStyle({ tintColor: theme.preview.ring });
    }
  }
});
test("approved specialized geometry is retained; unregistered/custom stays Pulse", () => {
  for (const [id, renderer] of [["physiological-sigh", "sigh"], ["nadi-shodhana", "alternating"], ["bhramari", "ripple"]]) {
    const p = protocols.find(p => p.id === id)!;
    expect(rendererFor(id, p.phases, p.animationType)).toBe(renderer);
  }
  const phases = protocols.find(p => p.id === "coherent")!.phases;
  expect(rendererFor("custom", phases)).toBe("pulse");
  expect(rendererFor("triangle", phases)).toBe("pulse");
  const triangle = protocols.find(p => p.id === "box-2")!;
  expect(rendererFor(triangle.id, triangle.phases, triangle.animationType)).toBe("triangle");
});
