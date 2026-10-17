import { loopedAudio } from "../src/looped-audio";
const mockPlayers: any[] = [];
jest.mock("expo-audio", () => ({ createAudioPlayer: () => {
  const player = { isLoaded: true, duration: 1, currentTime: 0, volume: 0, loop: false,
    play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn(async () => { player.currentTime = 0; }),
    addListener: jest.fn(() => ({ remove: jest.fn() })) };
  mockPlayers.push(player); return player;
} }));
beforeEach(() => { jest.useFakeTimers(); mockPlayers.length = 0; });
afterEach(() => jest.useRealTimers());
test("short MP3 boundaries overlap repeatedly using two players and dispose completely", async () => {
  let volume = 0.5;
  const fail = jest.fn(), stop = loopedAudio(1, () => volume, fail);
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 8; i++) {
    const current = mockPlayers[i % 2], next = mockPlayers[1 - i % 2];
    current.currentTime = .7;
    jest.advanceTimersByTime(25); await Promise.resolve();
    expect(next.play).toHaveBeenCalled();
    next.currentTime = .09; jest.advanceTimersByTime(25);
    expect(current.volume).toBeCloseTo(volume / 2);
    expect(next.volume).toBeCloseTo(volume / 2);
    next.currentTime = .2; jest.advanceTimersByTime(25);
    expect(current.pause).toHaveBeenCalled();
  }
  volume = .25; jest.advanceTimersByTime(25);
  expect(mockPlayers[0].volume).toBe(.25);
  stop(); jest.advanceTimersByTime(5000);
  expect(mockPlayers).toHaveLength(2);
  mockPlayers.forEach(p => expect(p.remove).toHaveBeenCalledTimes(1));
  expect(fail).not.toHaveBeenCalled();
});
test("disposing during asynchronous seek cannot restart a player", async () => {
  const stop = loopedAudio(1, () => 1, jest.fn());
  mockPlayers[0].currentTime = .8; jest.advanceTimersByTime(25);
  stop(); await Promise.resolve();
  expect(mockPlayers[1].play).not.toHaveBeenCalled();
});

test("pausing during an asynchronous crossfade invalidates the stale seek on resume", async () => {
  const stop = loopedAudio(1, () => 1, jest.fn());
  const current = mockPlayers[0], next = mockPlayers[1];
  const finishes: (() => void)[] = [];
  next.seekTo.mockImplementation(() => new Promise<void>(resolve => finishes.push(resolve)));
  current.currentTime = 0.8;
  jest.advanceTimersByTime(25);
  stop.pause();
  stop.resume();
  jest.advanceTimersByTime(25);
  expect(next.seekTo).toHaveBeenCalledTimes(2);
  finishes[0]();
  await Promise.resolve();
  expect(next.play).not.toHaveBeenCalled();
  finishes[1]();
  await Promise.resolve();
  expect(next.play).toHaveBeenCalledTimes(1);
  stop();
});

test("pause and resume preserve the selected player position without creating another player", () => {
  const stop = loopedAudio(1, () => 0.4, jest.fn());
  mockPlayers[0].currentTime = 0.42;
  stop.pause();
  expect(mockPlayers.map(p => p.pause.mock.calls.length)).toEqual([1, 1]);
  stop.resume();
  expect(mockPlayers).toHaveLength(2);
  expect(mockPlayers[0].currentTime).toBe(0.42);
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(2);
  expect(mockPlayers[1].play).not.toHaveBeenCalled();
  stop();
  mockPlayers.forEach(p => expect(p.remove).toHaveBeenCalledTimes(1));
});

test("a deliberately paused loop gets a fresh load timeout on resume", () => {
  const fail = jest.fn();
  const stop = loopedAudio(1, () => 0.4, fail, 180, false);
  jest.advanceTimersByTime(20000);
  expect(fail).not.toHaveBeenCalled();
  stop.resume();
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  stop();
});

test("a decoder load failure reports once and cannot restart or leak after cleanup", () => {
  const fail = jest.fn(), stop = loopedAudio(1, () => 1, fail);
  // A native error can arrive after load, independently of the breathing clock.
  const status = mockPlayers[1].addListener.mock.calls[0][1];
  status({ error: "decode failed" });
  status({ error: "decode failed" });
  jest.advanceTimersByTime(20000);
  expect(fail).toHaveBeenCalledTimes(1);
  mockPlayers.forEach(p => expect(p.volume).toBe(0));
  stop();
  mockPlayers.forEach(p => expect(p.remove).toHaveBeenCalledTimes(1));
});
