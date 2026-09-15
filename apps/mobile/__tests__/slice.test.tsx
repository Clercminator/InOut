import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import Pre from "../app/pre";
import Post from "../app/post";
import Result from "../app/result";
import { SessionController } from "../src/session-controller";
import type { LocalStore } from "../src/storage";
import type { SessionRecord } from "@inout/shared-types";

let mockController: SessionController;
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  Redirect: () => null,
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    canGoBack: () => false,
  },
  useLocalSearchParams: () => ({ id: "test-session" }),
}));
jest.mock("../src/provider", () => ({
  useSession: () => mockController,
  SaveError: () => null,
}));

let now = 0;
beforeEach(() => {
  let record: SessionRecord | null = null;
  now = 0;
  mockReplace.mockClear();
  const store = {
    preferences: () => ({ audio: "silent", haptics: false, keepAwake: false }),
    pending: () => null,
    save: (r: SessionRecord) => {
      record = r;
    },
    history: () => (record?.stage === "result" ? [record] : []),
  } as unknown as LocalStore;
  mockController = new SessionController(
    store,
    () => now,
    () => "test-session",
  );
});
test("pre rating requires a deliberate selection and keeps skip available", async () => {
  await render(<Pre />);
  expect(screen.getByRole("button", { name: "START RESET  →" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("radio", { name: "7 of 10" }));
  await fireEvent.press(screen.getByRole("button", { name: "START RESET  →" }));
  expect(mockController.current?.pre).toBe(7);
  expect(mockReplace).toHaveBeenCalledWith("/session");
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
