import { AppState } from "react-native";
import { createAudioPreview } from "../src/preview-audio";

const mockPlayers: any[] = [];
let mockMediaAllowed = false;
jest.mock("expo-audio", () => ({
  setAudioModeAsync: async (mode: { playsInSilentMode: boolean }) => { mockMediaAllowed = mode.playsInSilentMode; }, setIsAudioActiveAsync: async () => {},
  createAudioPlayer: (source: number) => {
    const p = { source, isLoaded: false, play: jest.fn(), pause: jest.fn(), remove: jest.fn(), unsubscribe: jest.fn(),
      addListener: (_: string, fn: (status: object) => void) => { p.status = fn; return { remove: p.unsubscribe }; }, status: (_: object) => {} };
    mockPlayers.push(p); return p;
  },
}));
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
beforeEach(() => { jest.useFakeTimers(); mockPlayers.length = 0; Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" }); });
afterEach(() => jest.useRealTimers());

test("explicit previews can start independently of the Android ringtone mode", async () => {
  mockMediaAllowed = false;
  const fail = jest.fn(), state = jest.fn();
  const preview = createAudioPreview(fail, jest.fn(), state);
  void preview.start([{ source: 1, volume: .7, at: 0 }], 6200); await flush();
  const player = mockPlayers[0];
  // Mirrors Expo Android's play() gate when the ringer is not NORMAL.
  player.play.mockImplementation(() => {
    if (mockMediaAllowed) player.status({ isLoaded: true, playing: true });
  });
  player.status({ isLoaded: true, playing: false }); await flush();
  jest.advanceTimersByTime(2000);
  expect(state).toHaveBeenCalledWith("playing");
  expect(fail).not.toHaveBeenCalled();
  preview.stop();
});

test.each([1, 2, 3])("style %s waits for native loading and releases all resources", async source => {
  const fail = jest.fn(), done = jest.fn();
  const preview = createAudioPreview(fail, done);
  void preview.start([{ source, volume: .7, at: 0 }, { source: 4, volume: .7, at: 3000 }], 6200);
  await flush();
  expect(mockPlayers[0].play).not.toHaveBeenCalled();
  mockPlayers.forEach(p => p.status({ isLoaded: true })); await flush();
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  mockPlayers[0].status({ playing: true });
  jest.advanceTimersByTime(3000);
  expect(mockPlayers[1].play).toHaveBeenCalledTimes(1);
  mockPlayers[1].status({ playing: true });
  jest.advanceTimersByTime(3200);
  mockPlayers.forEach(p => { expect(p.remove).toHaveBeenCalledTimes(1); expect(p.unsubscribe).toHaveBeenCalledTimes(1); });
  expect(done).toHaveBeenCalledTimes(1); expect(fail).not.toHaveBeenCalled();
});
test("stopping during loading cancels late playback", async () => {
  const preview = createAudioPreview(jest.fn(), jest.fn());
  void preview.start([{ source: 1, volume: 1, at: 0 }], 6200); await flush();
  preview.stop(); mockPlayers[0].status({ isLoaded: true }); await flush(); jest.advanceTimersByTime(10000);
  expect(mockPlayers[0].play).not.toHaveBeenCalled(); expect(mockPlayers[0].remove).toHaveBeenCalledTimes(1);
});
test("load timeout reports an error and releases the player", async () => {
  const fail = jest.fn(), preview = createAudioPreview(fail, jest.fn());
  void preview.start([{ source: 1, volume: 1, at: 0 }], 6200); await flush(); jest.advanceTimersByTime(5000); await flush();
  expect(fail).toHaveBeenCalledTimes(1); expect(mockPlayers[0].remove).toHaveBeenCalledTimes(1);
});
test("background prevents queued voice playback", async () => {
  const preview = createAudioPreview(jest.fn(), jest.fn());
  void preview.start([{ source: 1, volume: 1, at: 3000 }], 6200); await flush();
  mockPlayers[0].status({ isLoaded: true }); await flush();
  Object.defineProperty(AppState, "currentState", { configurable: true, value: "background" });
  jest.advanceTimersByTime(3000);
  expect(mockPlayers[0].play).not.toHaveBeenCalled(); expect(mockPlayers[0].remove).toHaveBeenCalledTimes(1);
});

test("playing requires native evidence and loaded-but-silent playback times out", async () => {
  const fail = jest.fn(), state = jest.fn();
  const preview = createAudioPreview(fail, jest.fn(), state);
  void preview.start([{ source: 1, volume: .5, at: 0 }], 6200); await flush();
  expect(state).toHaveBeenCalledWith("loading");
  mockPlayers[0].status({ isLoaded: true, playing: false }); await flush();
  expect(state).not.toHaveBeenCalledWith("playing");
  expect(mockPlayers[0].volume).toBe(.5);
  jest.advanceTimersByTime(2000);
  expect(fail).toHaveBeenCalledTimes(1);
  expect(mockPlayers[0].remove).toHaveBeenCalledTimes(1);
});
test("native playback, buffering and finish drive status; replacing cancels the prior preview", async () => {
  const state = jest.fn(), done = jest.fn();
  const preview = createAudioPreview(jest.fn(), done, state);
  void preview.start([{ source: 1, volume: 1, at: 0 }], 6200); await flush();
  mockPlayers[0].status({ isLoaded: true }); await flush();
  mockPlayers[0].status({ playing: true }); expect(state).toHaveBeenLastCalledWith("playing");
  mockPlayers[0].status({ playing: false, isBuffering: true }); expect(state).toHaveBeenLastCalledWith("loading");
  mockPlayers[0].status({ playing: false, didJustFinish: true }); expect(state).toHaveBeenLastCalledWith("ready");
  const next = createAudioPreview(jest.fn(), jest.fn());
  expect(done).toHaveBeenCalledTimes(1); expect(mockPlayers[0].remove).toHaveBeenCalledTimes(1);
  next.stop();
});
