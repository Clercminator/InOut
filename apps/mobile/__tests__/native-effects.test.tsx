import React from "react";
import { act, render } from "@testing-library/react-native";
import { AppState, AccessibilityInfo } from "react-native";
import { NativeSessionEffects } from "../src/session-effects";
import { SessionController } from "../src/session-controller";
import type { LocalStore } from "../src/storage";
import { protocols } from "@inout/protocols";

let mockController: SessionController;
let now = 0;
const mockHaptic = jest.fn((..._args: unknown[]) => Promise.resolve());
const mockAwake = jest.fn(() => Promise.resolve());
const mockSleep = jest.fn(() => Promise.resolve());
const mockActivate = jest.fn((_active: boolean) => Promise.resolve());
const mockAudioMode = jest.fn((_mode: object) => Promise.resolve());
const mockPlayers: {
  volume: number;
  loop: boolean;
  updateInterval: number;
  isLoaded: boolean;
  duration: number;
  currentTime: number;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  listener?: (mockStatus: object) => void;
}[] = [];
jest.mock("../src/session-context", () => ({
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
  performAndroidHapticsAsync: (...args: unknown[]) => mockHaptic(...args),
  AndroidHaptics: { Context_Click: "light", Clock_Tick: "soft" },
  notificationAsync: (...args: unknown[]) => mockHaptic(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Soft: "soft" },
  NotificationFeedbackType: { Success: "success" },
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: () => mockAwake(),
  deactivateKeepAwake: () => mockSleep(),
}));
jest.mock("expo-audio", () => ({
  setAudioModeAsync: (mode: object) => mockAudioMode(mode),
  setIsAudioActiveAsync: (active: boolean) => mockActivate(active),
  createAudioPlayer: (_source: number, options: { updateInterval?: number } = {}) => {
    const player = {
      volume: 1,
      loop: false,
      updateInterval: options.updateInterval ?? 0,
      isLoaded: true,
      duration: 4,
      currentTime: 0,
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
  mockActivate.mockReset().mockResolvedValue(undefined);
  mockAudioMode.mockClear();
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    value: "active",
  });
  jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
  mockController = new SessionController(
    {
      preferences: () => ({ audio: "voice", haptics: true, keepAwake: true }),
      pending: () => null,
      history: () => [],
      save: () => {},
      savePreferences: () => {},
    } as unknown as LocalStore,
    () => now,
    () => "native-test",
  );
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
test("voice holds and alternating nostrils use their own cues", async () => {
  mockController.preferences.audio = "voice";
  const box = protocols.find((p) => p.id === "box")!;
  mockController.start(null, 1, box);
  await render(<NativeSessionEffects />);
  await act(async () => { now = 4000; mockController.tick(); });
  expect(mockPlayers[4].play).toHaveBeenCalled();
  expect(mockPlayers[2].play).not.toHaveBeenCalled();
  await act(async () => { mockController.end("ended"); });
  const nadi = protocols.find((p) => p.id === "nadi-shodhana")!;
  await act(async () => { mockController.start(null, 1, nadi); });
  expect(mockPlayers[9].play).toHaveBeenCalled();
});

test("native cue delivery, pause cleanup, and no stale phase backlog", async () => {
  mockController.start(null);
  await render(<NativeSessionEffects />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockAwake).toHaveBeenCalled();
  expect(mockAudioMode).toHaveBeenCalledWith({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
  expect(mockHaptic).toHaveBeenCalled();
  expect(mockPlayers[0].play).toHaveBeenCalled();
  const priorHaptics = mockHaptic.mock.calls.length;
  await act(async () => {
    now = 20000;
    mockController.tick();
    jest.advanceTimersByTime(1000);
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
  const guard = mockPlayers.find((p) => p.loop && p.updateInterval === 100)!;
  expect(guard).toBeTruthy();
  await act(async () => {
    guard.listener?.({ playing: true });
    now = 2500;
    guard.listener?.({ playing: false, isBuffering: false });
    jest.advanceTimersByTime(250);
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

test("starting from Today waits for native audio activation before the first cue", async () => {
  await render(<NativeSessionEffects />);
  await act(async () => {
    await Promise.resolve();
  });
  let activate!: () => void;
  mockActivate.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        activate = resolve;
      }),
  );
  await act(async () => {
    mockController.start(null);
  });
  expect(mockPlayers[0].play).not.toHaveBeenCalled();
  expect(mockHaptic).toHaveBeenCalled();
  await act(async () => {
    activate();
  });
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
});

test("airflow reuses decoded players, stays quiet in holds and resumes from the paused position", async () => {
  mockController.preferences.audio = "tones";
  mockController.start(null, 2, protocols.find(p => p.id === "box")!);
  await render(<NativeSessionEffects />);
  const loops = mockPlayers.filter(p => p.loop && p.updateInterval === 50);
  expect(loops).toHaveLength(6);
  const inhalation = loops[0];
  expect(inhalation.play).toHaveBeenCalled();
  expect(inhalation.volume).toBe(0);
  await act(async () => { now = 2000; mockController.tick(); jest.advanceTimersByTime(32); });
  expect(inhalation.volume).toBeCloseTo(0.35);
  await act(async () => { mockController.pause(); });
  expect(inhalation.volume).toBe(0);
  expect(inhalation.remove).not.toHaveBeenCalled();
  await act(async () => { now = 50000; mockController.resume(); });
  const resumed = inhalation;
  expect(resumed.volume).toBeCloseTo(0.35);
  await act(async () => { now = 52000; mockController.tick(); jest.advanceTimersByTime(32); });
  expect(resumed.volume).toBe(0);
  expect(resumed.pause).toHaveBeenCalled();
  await act(async () => { now = 56000; mockController.tick(); jest.advanceTimersByTime(32); });
  const exhalation = loops[2];
  expect(exhalation).not.toBe(resumed);
  await act(async () => { now = 60000; mockController.tick(); jest.advanceTimersByTime(32); });
  expect(exhalation.volume).toBe(0);
  expect(exhalation.pause).toHaveBeenCalled();
});

test("silent guidance uses gentle transitions and never vibrates during holds", async () => {
  mockController.preferences.audio = "silent";
  mockController.start(null, 1, protocols.find(p => p.id === "box")!);
  await render(<NativeSessionEffects />);
  expect(mockPlayers).toHaveLength(0);
  expect(mockHaptic).toHaveBeenCalledTimes(1);
  await act(async () => { now = 140; jest.advanceTimersByTime(140); });
  expect(mockHaptic).toHaveBeenCalledTimes(2);
  await act(async () => { now = 4000; jest.advanceTimersByTime(3860); });
  expect(mockHaptic).toHaveBeenCalledTimes(2);
  await act(async () => { now = 6000; jest.advanceTimersByTime(2000); });
  expect(mockHaptic).toHaveBeenCalledTimes(2);
  await act(async () => { now = 8000; jest.advanceTimersByTime(2000); });
  expect(mockHaptic).toHaveBeenCalledTimes(3);
  await act(async () => { mockController.pause(); now = 12000; mockController.tick(); });
  expect(mockHaptic).toHaveBeenCalledTimes(3);
});

test("ending a session silences every breath loop and never restarts it on later ticks", async () => {
  mockController.start(null);
  await render(<NativeSessionEffects />);
  const texture = mockPlayers.find(p => p.loop && p.updateInterval === 50)!;
  await act(async () => { now = 1000; mockController.tick(); jest.advanceTimersByTime(32); });
  expect(texture.volume).toBeGreaterThan(0);
  await act(async () => { mockController.end("unwell"); });
  expect(texture.volume).toBe(0);
  expect(texture.pause).toHaveBeenCalled();
  const playCount = texture.play.mock.calls.length;
  await act(async () => { now = 999999; jest.advanceTimersByTime(10000); });
  expect(texture.play).toHaveBeenCalledTimes(playCount);
});

test("voice skips a phrase that cannot fit inside a short custom breath", async () => {
  const box = protocols.find(p => p.id === "box")!;
  mockController.start(null, 1, { ...box, id: "short-custom", phases: box.phases.map(p => ({ ...p, durationMs: 500 })) });
  expect(mockController.current?.engine.status).toBe("running");
  await render(<NativeSessionEffects />);
  expect(mockPlayers[0].play).not.toHaveBeenCalled();
});

test.each(protocols)("$id breath-sound mode has no phase beeps and releases its pool on unmount", async protocol => {
  mockController.preferences.audio = "tones";
  mockController.start(null, 1, protocol, true);
  const screen = await render(<NativeSessionEffects />);
  const textures = mockPlayers.filter(p => p.loop && p.updateInterval === 50);
  expect(textures).toHaveLength(6);
  const nonLooping = mockPlayers.filter(p => !p.loop);
  expect(nonLooping).toHaveLength(1); // Completion chime only.
  for (const phase of protocol.phases) {
    await act(async () => { now += phase.durationMs; mockController.tick(); });
    if (mockController.current?.engine.status === "running") {
      expect(nonLooping[0].play).not.toHaveBeenCalled();
    }
  }
  expect(mockPlayers.filter(p => p.loop && p.updateInterval === 50)).toEqual(textures);
  await screen.unmount();
  textures.forEach(p => expect(p.remove).toHaveBeenCalledTimes(1));
});


test.each([[true, true], [true, false], [false, true], [false, false]])("independent voice=%s nature=%s create only requested players", async (voice, nature) => {
  mockController.preferences.guidance = { voice, nature };
  mockController.start(null, 1, protocols.find(p => p.id === "box")!);
  const screen = await render(<NativeSessionEffects />);
  expect(mockPlayers.filter(p => p.loop && p.updateInterval === 50)).toHaveLength(nature ? 6 : 0);
  expect(mockPlayers.filter(p => !p.loop)).toHaveLength(voice ? 13 : nature ? 1 : 0);
  await screen.unmount();
  mockPlayers.forEach(p => expect(p.remove).toHaveBeenCalledTimes(1));
});

test("music pause and resume keep position and session termination releases both decoders", async () => {
  mockController.preferences.guidance = { voice: false, nature: false, music: true, musicId: "bliss-breath", musicVolume: 0.4 };
  mockController.start(null);
  const screen = await render(<NativeSessionEffects />);
  let musicPlayers = mockPlayers.filter(p => p.loop && p.updateInterval === 50);
  expect(musicPlayers).toHaveLength(2);
  expect(musicPlayers[0].play).toHaveBeenCalledTimes(1);
  expect(musicPlayers[0].volume).toBe(0.4);
  await act(async () => {
    mockController.setPreferences({
      ...mockController.preferences,
      guidance: { ...mockController.preferences.guidance, musicVolume: 0.2 },
    });
  });
  expect(mockController.preferences.guidance?.musicVolume).toBe(0.2);
  await act(async () => {
    jest.advanceTimersByTime(25);
  });
  expect(musicPlayers[0].volume).toBe(0.2);
  musicPlayers[0].currentTime = 42;
  await act(async () => { mockController.pause(); });
  expect(musicPlayers[0].pause).toHaveBeenCalled();
  await act(async () => { mockController.resume(); });
  expect(musicPlayers[0].currentTime).toBe(42);
  expect(musicPlayers[0].play).toHaveBeenCalledTimes(2);
  await act(async () => {
    mockController.setPreferences({
      ...mockController.preferences,
      guidance: { ...mockController.preferences.guidance, musicId: "westerpark" },
    });
  });
  expect(musicPlayers.every(player => player.remove.mock.calls.length === 1)).toBe(true);
  musicPlayers = mockPlayers.filter(p => p.loop && p.updateInterval === 50 && p.remove.mock.calls.length === 0);
  expect(musicPlayers).toHaveLength(2);
  expect(musicPlayers[0].play).toHaveBeenCalledTimes(1);
  await act(async () => { mockController.end("ended"); });
  musicPlayers.forEach(player => expect(player.remove).toHaveBeenCalledTimes(1));
  const playCount = musicPlayers.reduce((sum, player) => sum + player.play.mock.calls.length, 0);
  await act(async () => { now = 999999; jest.advanceTimersByTime(5000); });
  expect(musicPlayers.reduce((sum, player) => sum + player.play.mock.calls.length, 0)).toBe(playCount);
  await screen.unmount();
});


test("brief focus-probe gaps do not stop breathing, music or vibration", async () => {
  mockController.start(null);
  await render(<NativeSessionEffects />);
  const guard = mockPlayers.find(p => p.loop && p.updateInterval === 100)!;
  await act(async () => {
    guard.listener?.({ playing: true });
    guard.listener?.({ playing: false, isBuffering: false });
    jest.advanceTimersByTime(150);
    guard.listener?.({ playing: true });
    jest.advanceTimersByTime(300);
  });
  expect(mockController.current?.engine.status).toBe("running");
});

test("Android finished voice players repeat over ten cycles despite isLoaded becoming false", async () => {
  mockController.preferences.guidance = { voice: true, nature: false };
  mockController.start(null, 12, protocols.find(p => p.id === "box")!);
  await render(<NativeSessionEffects />);
  for (let cycle = 0; cycle < 10; cycle++) {
    for (const [offset, index] of [[0, 0], [4000, 4], [8000, 2], [12000, 6]]) {
      const before = mockPlayers[index].play.mock.calls.length;
      if (cycle === 0 && offset === 0) {
        mockPlayers[index].isLoaded = false;
        mockPlayers[index].listener?.({ didJustFinish: true, isLoaded: true });
        continue;
      }
      await act(async () => {
        now = cycle * 16000 + offset + 450;
        jest.advanceTimersByTime(50);
      });
      expect(mockPlayers[index].play).toHaveBeenCalledTimes(before + 1);
      mockPlayers[index].isLoaded = false;
      mockPlayers[index].listener?.({ didJustFinish: true, isLoaded: true });
      await act(async () => { jest.advanceTimersByTime(100); });
      expect(mockPlayers[index].play).toHaveBeenCalledTimes(before + 1);
    }
  }
  expect(mockController.current?.engine.status).toBe("running");
});

test("decoder errors pause once and explicit Resume recreates music players", async () => {
  mockController.preferences.guidance = { voice: false, nature: false, music: true };
  mockController.start(null);
  await render(<NativeSessionEffects />);
  const old = mockPlayers.filter(p => p.loop && p.updateInterval === 50);
  await act(async () => { old[0].listener?.({ error: "decoder reset" }); });
  expect(mockController.current?.engine.status).toBe("paused");
  expect(old[0].remove).toHaveBeenCalled();
  const fresh = mockPlayers.filter(p => p.loop && p.updateInterval === 50 && !p.remove.mock.calls.length);
  expect(fresh).toHaveLength(2);
  expect(fresh[0].play).not.toHaveBeenCalled();
  await act(async () => { mockController.resume(); });
  expect(fresh[0].play).toHaveBeenCalled();
});


test("idle and paused sessions never disable the global engine used by audio previews", async () => {
  await render(<NativeSessionEffects />);
  expect(mockActivate).not.toHaveBeenCalled();
  await act(async () => { mockController.start(null); });
  expect(mockActivate).toHaveBeenCalledWith(true);
  await act(async () => { mockController.pause(); mockController.setPreferences({ ...mockController.preferences, audio: "silent", guidance: { voice: false, nature: false, music: false } }); });
  expect(mockActivate).not.toHaveBeenCalledWith(false);
});

test.each(["en", "es", "pt"] as const)("supplied %s voices guide ten minutes with music and release every player on End", async language => {
  mockController.preferences.guidance = { voice: true, nature: false, music: true, language, voiceId: "female" };
  mockController.start(null, 60, protocols.find(p => p.id === "sleep-wind-down")!);
  const screen = await render(<NativeSessionEffects />);
  const inhale = mockPlayers[0], exhale = mockPlayers[1]; // Missing slots do not create players.
  for (let cycle = 0; cycle < 60; cycle++) {
    for (const [offset, player] of [[0, inhale], [4000, exhale]] as const) {
      if (!(cycle === 0 && offset === 0)) await act(async () => {
        now = cycle * 10000 + offset; mockController.tick();
      });
      player.isLoaded = false;
      player.listener?.({ didJustFinish: true, isLoaded: true });
    }
  }
  expect(inhale.play).toHaveBeenCalledTimes(60);
  expect(exhale.play).toHaveBeenCalledTimes(60);
  await act(async () => { now = 600000; mockController.tick(); });
  // Sleep ends without a completion chime or reward vibration.
  expect(mockPlayers[2].play).not.toHaveBeenCalled();
  await screen.unmount();
  mockPlayers.forEach(player => expect(player.remove).toHaveBeenCalledTimes(1));
});


test("audio recovery can continue silently without changing the saved audio selection", async () => {
  mockController.preferences.guidance = { voice: true, nature: false, music: true };
  mockController.start(null);
  await render(<NativeSessionEffects />);
  await act(async () => { mockPlayers[0].listener?.({ error: "decoder" }); });
  expect(mockController.audioFailure).toBe(true);
  await act(async () => { mockController.recoverAudio(true); });
  expect(mockController.current?.engine.status).toBe("running");
  expect(mockController.sessionSilent).toBe(true);
  expect(mockController.audioFailure).toBe(false);
  expect(mockController.preferences.guidance.voice).toBe(true);
  expect(mockPlayers.every(p => p.remove.mock.calls.length > 0)).toBe(true);
});
