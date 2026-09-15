import React from "react";
import { act, render } from "@testing-library/react-native";
import { AppState, AccessibilityInfo } from "react-native";
import { NativeSessionEffects } from "../src/session-effects";
import { SessionController } from "../src/session-controller";
import type { LocalStore } from "../src/storage";

let mockController: SessionController;
let now = 0;
const mockHaptic = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockAwake = jest.fn(() => Promise.resolve());
const mockSleep = jest.fn(() => Promise.resolve());
const mockPlayers: {
  loop: boolean;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  listener?: (mockStatus: object) => void;
}[] = [];
jest.mock("../src/provider", () => ({
  useSession: () => {
    const React = require("react");
    React.useSyncExternalStore(
      mockController.subscribe,
      mockController.getRevision,
    );
    return mockController;
  },
}));
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockHaptic(...args),
  notificationAsync: (...args: unknown[]) => mockHaptic(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Soft: "soft" },
  NotificationFeedbackType: { Success: "success" },
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: () => mockAwake(),
  deactivateKeepAwake: () => mockSleep(),
}));
jest.mock("expo-audio", () => ({
  setAudioModeAsync: () => Promise.resolve(),
  setIsAudioActiveAsync: () => Promise.resolve(),
  createAudioPlayer: () => {
    const player = {
      loop: false,
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      listener: undefined as undefined | ((mockStatus: object) => void),
      addListener: (_event: string, fn: (mockStatus: object) => void) => {
        player.listener = fn;
        return { remove: jest.fn() };
      },
    };
    mockPlayers.push(player);
    return player;
  },
}));
beforeEach(() => {
  jest.useFakeTimers();
  now = 0;
  mockPlayers.length = 0;
  mockHaptic.mockClear();
  mockAwake.mockClear();
  mockSleep.mockClear();
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    value: "active",
  });
  jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
  mockController = new SessionController(
    {
      preferences: () => ({ audio: "tones", haptics: true, keepAwake: true }),
      pending: () => null,
      save: () => {},
    } as unknown as LocalStore,
    () => now,
    () => "native-test",
  );
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
test("native cue delivery, pause cleanup, and no stale phase backlog", async () => {
  mockController.start(null);
  await render(<NativeSessionEffects />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockAwake).toHaveBeenCalled();
  expect(mockHaptic).toHaveBeenCalled();
  expect(mockPlayers[0].play).toHaveBeenCalled();
  const priorHaptics = mockHaptic.mock.calls.length;
  await act(async () => {
    now = 20000;
    mockController.tick();
  });
  expect(mockHaptic.mock.calls.length).toBe(priorHaptics + 1);
  await act(async () => {
    mockController.pause("background");
  });
  expect(mockSleep).toHaveBeenCalled();
  expect(mockPlayers[0].pause).toHaveBeenCalled();
  const count = mockHaptic.mock.calls.length;
  await act(async () => {
    now = 1000000;
    jest.advanceTimersByTime(10000);
  });
  expect(mockController.view()?.sessionElapsedMs).toBe(20000);
  expect(mockHaptic.mock.calls.length).toBe(count);
});
test("native audio-focus loss requires explicit resume", async () => {
  mockController.start(null);
  await render(<NativeSessionEffects />);
  await act(async () => {
    await Promise.resolve();
  });
  const guard = mockPlayers.find((p) => p.loop)!;
  expect(guard).toBeTruthy();
  await act(async () => {
    guard.listener?.({ playing: true });
    now = 2500;
    guard.listener?.({ playing: false, isBuffering: false });
  });
  expect(mockController.current?.engine.status).toBe("paused");
  expect(mockController.current?.engine.pauseReason).toBe("interruption");
  await act(async () => {
    now = 90000;
    mockController.tick();
  });
  expect(mockController.view()?.sessionElapsedMs).toBe(2500);
});

test("an audio seek resolving after its phase elapsed does not play a stale cue", async () => {
  mockController.start(null);
  await render(<NativeSessionEffects />);
  await act(async () => {
    await Promise.resolve();
  });
  let finishSeek!: () => void;
  mockPlayers[1].seekTo.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishSeek = resolve;
      }),
  );
  await act(async () => {
    now = 4000;
    mockController.tick();
  });
  // No render has occurred for the new phase yet; the authoritative clock has advanced.
  await act(async () => {
    now = 6500;
    finishSeek();
  });
  expect(mockPlayers[1].play).not.toHaveBeenCalled();
  expect(mockController.current?.engine.status).toBe("running");
});

test("a cancelled cue's late error cannot pause a resumed session", async () => {
  mockController.start(null);
  await render(<NativeSessionEffects />);
  await act(async () => {
    await Promise.resolve();
  });
  let rejectSeek!: (error: Error) => void;
  mockPlayers[1].seekTo.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, reject) => {
        rejectSeek = reject;
      }),
  );
  await act(async () => {
    now = 4000;
    mockController.tick();
  });
  await act(async () => {
    mockController.pause();
  });
  await act(async () => {
    mockController.resume();
  });
  await act(async () => {
    rejectSeek(new Error("cancelled seek"));
  });
  expect(mockController.current?.engine.status).toBe("running");
});
