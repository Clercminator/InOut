import { emptyTestStore, appendAttempt, selectDaily, type TestStore, type PendingTest, type ChallengeAttempt, type TestId } from "../src/challenge-tests";
import ChallengeTest from "../app/challenge-test";
import ChallengeAttemptResult from "../app/challenge-attempt";
import ChallengeBest from "../app/challenge-best";
import Challenges from "../app/(tabs)/challenges";
import ChallengeDetail from "../app/challenge";
import ChallengeComplete from "../app/challenge-complete";
import ChallengeShare from "../app/challenge-share";
import { challengeCatalog, enrollChallenge, type UserChallenge } from "../src/challenges";
import Onboarding from "../app/onboarding";
import Milestone from "../app/milestone";
import ProtocolLibrary from "../app/(tabs)/protocols";
import Settings from "../app/settings";
import Today from "../app/(tabs)/index";
import Progress from "../app/(tabs)/progress";
import TabLayout from "../app/(tabs)/_layout";
import ProtocolDetail from "../app/protocol";
import { setLanguage, t } from "../src/i18n";
import React from "react";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { AccessibilityInfo, AppState, Alert, Platform, Share } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { Preferences, SessionRecord } from "@inout/shared-types";
import type { LocalStore } from "../src/storage";
import { SessionController } from "../src/session-controller";
import { SessionContext } from "../src/session-context";
import { ExperienceProvider } from "../src/experience-context";
import { experienceFor } from "../src/experience";
import EditProfile from "../app/edit-profile";
import Profile from "../app/profile";
import Personalize from "../app/personalize";
import RitualEdit from "../app/ritual-edit";
import Rituals from "../app/rituals";
import { SoundControls } from "../src/sound-controls";
import { Celebration } from "../src/celebration";

let mockController: SessionController;
let mockParams = {};
const mockPush = jest.fn(), mockReplace = jest.fn();
const mockTouch = jest.fn(async () => {});
jest.mock("../src/breath-haptics", () => ({
  ...jest.requireActual("../src/breath-haptics"),
  emitBreathHaptic: () => mockTouch(),
}));
const mockChoosePhoto = jest.fn(), mockRemovePhoto = jest.fn();
const mockShare = jest.fn(async () => {}), mockCapture = jest.fn(async (..._args: unknown[]) => "file:///card.png");
const mockPlayers: { volume: number; play: jest.Mock; pause: jest.Mock; remove: jest.Mock; addListener: jest.Mock }[] = [];
jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => require("react").createElement(require("react-native").Text, null, `Redirect: ${href}`),
  Tabs: Object.assign(({ children }: { children: React.ReactNode }) => children, {
    Screen: ({ options }: { options: { title: string } }) => require("react").createElement(require("react-native").Text, null, options.title),
  }),
  router: { push: (...args: unknown[]) => mockPush(...args), replace: (...args: unknown[]) => mockReplace(...args), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/",
  useFocusEffect: (fn: () => () => void) => require("react").useEffect(fn, [fn]),
}));
jest.mock("../src/provider", () => ({
  useSession: () => { require("react").useSyncExternalStore(mockController.subscribe, mockController.getRevision); return mockController; },
  SaveError: () => null,
}));
jest.mock("../src/profile-photo", () => ({ chooseProfilePhoto: () => mockChoosePhoto(), removeProfilePhoto: (...args: unknown[]) => mockRemovePhoto(...args), photoUri: (name: string) => `file:///${name}` }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: async () => true, shareAsync: (...args: unknown[]) => mockShare(...args as []) }));
jest.mock("react-native-view-shot", () => ({ captureRef: (...args: unknown[]) => mockCapture(...args), releaseCapture: jest.fn() }));
jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => {}, setIsAudioActiveAsync: async () => {},
  createAudioPlayer: () => {
    const player = { volume: 1, play: jest.fn(), pause: jest.fn(), remove: jest.fn(), addListener: jest.fn() };
    mockPlayers.push(player); return player;
  },
}));
const wrap = (child: React.ReactNode) => <SessionContext.Provider value={mockController}><ExperienceProvider>{child}</ExperienceProvider></SessionContext.Provider>;
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" });
  mockParams = {}; mockPlayers.length = 0;
  mockTouch.mockClear();
  mockChoosePhoto.mockReset().mockResolvedValue(null); mockRemovePhoto.mockClear(); mockShare.mockClear(); mockPush.mockClear(); mockReplace.mockClear();
  let preferences: Preferences = { audio: "tones", haptics: false, keepAwake: false };
  const history = new Map<string, SessionRecord>();
  let id = 0;
  let challenges: UserChallenge[] = [];
  let testState = emptyTestStore();
  mockController = new SessionController({
    testStore: () => testState, setPendingTest: (pending: PendingTest | null) => { testState = { ...testState, pending }; },
    saveTestAttempt: (a: ChallengeAttempt) => { testState = { ...appendAttempt(testState, a), pending: null }; },
    excludeTest: (id: TestId, excluded: boolean) => { testState = { ...testState, excluded: excluded ? [...testState.excluded, id] : testState.excluded.filter(v => v !== id) }; },
    dailyChallenge: (pro: boolean, now: number) => { testState = selectDaily(testState, pro, challenges, now); return testState.daily.at(-1)?.id; },
    preferences: () => preferences, pending: () => null,
    challenges: () => challenges, enrollChallenge: (id: string, pro: boolean, at: number) => { challenges = enrollChallenge(id, challenges, pro, at); },
    acknowledgeChallenge: (id: string) => { challenges = challenges.map(s => s.challengeId === id ? { ...s, celebrationSeen: true } : s); },
    savePreferences: (p: Preferences) => { preferences = p; },
    history: () => [...history.values()].filter(r => r.stage === "result"),
    save: (r: SessionRecord) => history.set(r.id, r), routines: () => [],
  } as unknown as LocalStore, () => Date.now(), () => `id-${++id}`);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test("profile saves identity; cancelled photo selection leaves the profile untouched", async () => {
  await render(wrap(<EditProfile />));
  await fireEvent.changeText(screen.getByLabelText("Display name"), "Taylor");
  await fireEvent.changeText(screen.getByLabelText("About you"), "Finding my rhythm");
  await fireEvent.press(screen.getByRole("button", { name: "Choose profile photo" }));
  expect(experienceFor(mockController.preferences).photo).toBeUndefined();
  expect(mockRemovePhoto).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Save profile" }));
  expect(experienceFor(mockController.preferences).name).toBe("Taylor");
  expect(experienceFor(mockController.preferences).bio).toBe("Finding my rhythm");
});

test("locked cosmetic explains its requirement while background and celebration choices persist", async () => {
  await render(wrap(<Personalize />));
  await fireEvent.press(screen.getByRole("button", { name: "Your look" }));
  await fireEvent.press(screen.getByRole("button", { name: "Locked · dusk" }));
  expect(Alert.alert).toHaveBeenCalledWith("A little practice unlocks this", "Save 10 sessions");
  expect(experienceFor(mockController.preferences).palette).toBe("sky");
  await fireEvent.press(screen.getByRole("button", { name: "plum" }));
  await fireEvent.press(screen.getByRole("button", { name: "Celebrations" }));
  await fireEvent.press(screen.getByRole("button", { name: "quiet" }));
  expect(experienceFor(mockController.preferences).background).toBe("plum");
  expect(experienceFor(mockController.preferences).celebration).toBe("quiet");
});

test("a ritual saves the chosen length and starts without adding a rating step", async () => {
  const view = await render(wrap(<RitualEdit />));
  await fireEvent.changeText(screen.getByLabelText("Ritual name"), "Morning reset");
  await fireEvent.changeText(screen.getByLabelText("Ritual cycles"), "2");
  await fireEvent.press(screen.getByRole("button", { name: "Save ritual" }));
  expect(mockReplace).toHaveBeenCalledWith("/rituals");
  await view.rerender(wrap(<Rituals />));
  await fireEvent.press(screen.getByRole("button", { name: "Start Morning reset" }));
  expect(mockController.current?.stage).toBe("active");
  expect(mockController.current?.pre).toBeNull();
  expect(mockController.current?.engine.plan.blocks[0].cycles).toBe(2);
  expect(mockPush).toHaveBeenCalledWith("/session");
});

test("a lost custom draft cannot silently become a different ritual", async () => {
  mockParams = { protocolId: "custom" };
  await render(wrap(<RitualEdit />));
  expect(screen.getByText("This session draft is no longer available. Choose a protocol again.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Save ritual" })).toBeNull();
});

test("breath preview respects selected volume, stops on mode change and stays absent in silent mode", async () => {
  await render(wrap(<SoundControls />));
  await fireEvent.press(screen.getByRole("button", { name: "25%" }));
  await fireEvent.press(screen.getByRole("button", { name: "Preview breath sounds · 6 sec" }));
  expect(mockPlayers[0].play).toHaveBeenCalled();
  expect(mockPlayers[0].volume).toBe(0.25);
  await fireEvent.press(screen.getByRole("button", { name: "Silent" }));
  expect(mockPlayers[0].pause).toHaveBeenCalled(); expect(mockPlayers[0].remove).toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Preview breath sounds · 6 sec" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Preview chime" })).toBeNull();
});

test("quiet celebrations keep encouragement without reward playback", async () => {
  mockController.updateExperience({ celebration: "quiet" });
  await render(wrap(<Celebration variant="saved" title="Session saved" message="Every moment counts." />));
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(screen.getByText("Every moment counts.")).toBeTruthy();
  expect(mockPlayers).toHaveLength(0);
});

test("saved celebration plays once at the chosen volume and releases its player", async () => {
  mockController.updateExperience({ celebrationVolume: 0.2 });
  const view = await render(wrap(<Celebration variant="saved" title="Saved" message="Nice work." />));
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(mockPlayers).toHaveLength(1);
  expect(mockPlayers[0].volume).toBe(0.2);
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  await view.rerender(wrap(<Celebration variant="saved" title="Saved" message="Nice work." />));
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(mockPlayers).toHaveLength(1);
  expect(mockPlayers[0].remove).toHaveBeenCalledTimes(1);
});

test("an interrupted voice preview cancels the pending exhale cue", async () => {
  mockController.setPreferences({ ...mockController.preferences, audio: "voice" });
  await render(wrap(<SoundControls compact />));
  await fireEvent.press(screen.getByRole("button", { name: "Preview breath sounds · 6 sec" }));
  expect(mockPlayers).toHaveLength(2);
  const status = mockPlayers[0].addListener.mock.calls[0][1];
  await act(async () => {
    status({ playing: true }); status({ playing: false, isBuffering: false });
    jest.advanceTimersByTime(4000);
  });
  expect(mockPlayers).toHaveLength(2);
  expect(mockPlayers.every(p => p.remove.mock.calls.length === 1)).toBe(true);
});

test("profile shares a captured image through the OS sheet", async () => {
  mockController.updateExperience({ name: "Taylor", bio: "Finding my rhythm" });
  await render(wrap(<Profile />));
  await fireEvent.press(screen.getByRole("button", { name: "Share my practice card" }));
  await waitFor(() => expect(mockCapture).toHaveBeenCalled());
  await waitFor(() => expect(mockShare).toHaveBeenCalledWith("file:///card.png", { mimeType: "image/png", dialogTitle: "My IN/OUT practice" }));
});


test("Settings changes the whole interface immediately and can switch back to English", async () => {
  await render(wrap(<><Settings /><Today /></>));
  await fireEvent.press(screen.getByRole("button", { name: "Appearance & language" }));
  await fireEvent.press(screen.getByRole("button", { name: "Español" }));
  expect(mockController.preferences.language).toBe("es");
  expect(screen.getByText("Un espacio para respirar.")).toBeTruthy();
  expect(screen.getByText("¿QUÉ NECESITAS?")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Español" }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Português" }));
  expect(mockController.preferences.language).toBe("pt");
  expect(screen.getByText("Um espaço para respirar.")).toBeTruthy();
  expect(screen.getByText("CONFIGURAÇÕES")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "English" }));
  expect(mockController.preferences.language).toBe("en");
  expect(screen.getByText("A little space to breathe.")).toBeTruthy();
});

test("translated profile preserves user-written text even when it matches English UI copy", async () => {
  mockController.updateExperience({ name: "Focus", bio: "Sleep", intention: "A moment for myself" });
  mockController.setPreferences({ ...mockController.preferences, language: "es" });
  await render(wrap(<Profile />));
  expect(screen.getByText("Focus")).toBeTruthy();
  expect(screen.getByText("Sleep")).toBeTruthy();
  expect(screen.getByText("A moment for myself")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Editar perfil" })).toBeTruthy();
});

test("Portuguese protocol safety expands and translated dialogs keep their actions", async () => {
  mockParams = { id: "box" };
  mockController.setPreferences({ ...mockController.preferences, language: "pt" });
  const rendered = await render(wrap(<ProtocolDetail />));
  expect(screen.getByText("Respiração quadrada")).toBeTruthy();
  const safety = screen.getByRole("button", { name: "Antes de começar" });
  expect(safety.props.accessibilityState.expanded).toBe(false);
  await fireEvent.press(safety);
  expect(screen.getByText(/Mantenha as pausas confortáveis/)).toBeTruthy();
  await rendered.rerender(wrap(<Settings />));
  await fireEvent.press(screen.getByRole("button", { name: "Dados locais" }));
  await fireEvent.press(screen.getByRole("button", { name: "Excluir todos os dados locais" }));
  expect(Alert.alert).toHaveBeenLastCalledWith("Excluir todos os dados locais?", expect.any(String), expect.arrayContaining([expect.objectContaining({ text: "Cancelar" }), expect.objectContaining({ text: "Excluir tudo", onPress: expect.any(Function) })]));
});


test("settings disclosures hide secondary controls, retain language choice, and stop previews when closed", async () => {
  await render(wrap(<Settings />));
  expect(screen.queryByRole("button", { name: "Preview breath sounds · 6 sec" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Delete all local data" })).toBeNull();
  expect(screen.getByRole("button", { name: "Sound" }).props.accessibilityState.expanded).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Sound" }));
  await fireEvent.press(screen.getByRole("button", { name: "Preview breath sounds · 6 sec" }));
  expect(mockPlayers.length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole("button", { name: "Sound" }));
  expect(mockPlayers.every(player => player.remove.mock.calls.length === 1)).toBe(true);
  expect(screen.queryByRole("button", { name: "Stop preview" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Appearance & language" }));
  await fireEvent.press(screen.getByRole("button", { name: "Português" }));
  await fireEvent.press(screen.getByRole("button", { name: "Som" }));
  expect(screen.getByRole("button", { name: "Ouvir prévia · 6 s" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Som" }).props.accessibilityState.expanded).toBe(true);
});

test("Settings saves the selected appearance preference", async () => {
  await render(wrap(<Settings />));
  await fireEvent.press(screen.getByRole("button", { name: "Appearance & language" }));
  expect(screen.getByRole("radio", { name: "System", selected: true })).toBeTruthy();
  for (const [label, theme] of [["Light", "light"], ["Dark", "dark"], ["System", "system"]] as const) {
    await fireEvent.press(screen.getByRole("radio", { name: label }));
    expect(mockController.preferences.theme).toBe(theme);
    expect(screen.getByRole("radio", { name: label, selected: true })).toBeTruthy();
  }
});

test("home recommendation starts the selected goal and displays the user's own intention", async () => {
  mockController.updateExperience({ intention: "A quiet moment before work" });
  await render(wrap(<Today />));
  expect(screen.getByText("A quiet moment before work")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Focus" }));
  await fireEvent.press(screen.getByRole("button", { name: "Start practice" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/pre", params: { id: "box" } });
});

test("vibration preview follows the selected style and cancels immediately on stop or mode change", async () => {
  await render(wrap(<SoundControls compact />));
  await fireEvent.press(screen.getByRole("button", { name: "Gentle transitions" }));
  await fireEvent.press(screen.getByRole("button", { name: "Preview vibration · 6 sec" }));
  expect(mockTouch).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(150); });
  expect(mockTouch).toHaveBeenCalledTimes(2);
  await fireEvent.press(screen.getByRole("button", { name: "Stop preview" }));
  await act(async () => { jest.advanceTimersByTime(6000); });
  expect(mockTouch).toHaveBeenCalledTimes(2);
  await fireEvent.press(screen.getByRole("button", { name: "Rhythm pulses" }));
  expect(mockController.preferences.hapticMode).toBe("rhythm");
  await fireEvent.press(screen.getByRole("button", { name: "Preview vibration · 6 sec" }));
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(mockTouch).toHaveBeenCalledTimes(4);
  await fireEvent.press(screen.getByRole("button", { name: "Off" }));
  await act(async () => { jest.advanceTimersByTime(6000); });
  expect(mockTouch).toHaveBeenCalledTimes(4);
  expect(screen.queryByRole("button", { name: "Stop preview" })).toBeNull();
  expect(mockPlayers).toHaveLength(0);
});

test("protocol detail can save a favorite and the Saved filter shows it", async () => {
  mockParams = { id: "box" };
  const view = await render(wrap(<ProtocolDetail />));
  await fireEvent.press(screen.getByRole("button", { name: "Save protocol" }));
  expect(mockController.isFavorite("box")).toBe(true);
  expect(screen.getByRole("button", { name: "Remove from saved" })).toBeTruthy();
  await view.rerender(wrap(<ProtocolLibrary />));
  await fireEvent.press(screen.getByRole("button", { name: "Saved" }));
  expect(screen.getByText("Box Breathing")).toBeTruthy();
});

test.each(["en", "es", "pt"] as const)("Progress opens profile and rituals in %s", async language => {
  mockController.setPreferences({ ...mockController.preferences, language });
  await render(wrap(<Progress />));
  await fireEvent.press(screen.getByRole("button", { name: t("My practice profile") }));
  expect(mockPush).toHaveBeenLastCalledWith("/profile");
  await fireEvent.press(screen.getByRole("button", { name: t("My rituals") }));
  expect(mockPush).toHaveBeenLastCalledWith("/rituals");
});

test("mounted tabs update their titles when the language changes", async () => {
  mockController.setPreferences({ ...mockController.preferences, onboardingComplete: true });
  await render(wrap(<SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 24 }}><TabLayout /></SafeAreaInsetsContext.Provider>));
  for (const language of ["es", "pt", "en"] as const) {
    await act(() => mockController.setPreferences({ ...mockController.preferences, language }));
    for (const title of ["Results", "Home", "Challenges"]) {
      expect(screen.getByText(t(title))).toBeTruthy();
    }
  }
});

test("first launch does not mount browsing tabs before onboarding", async () => {
  await render(wrap(<SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 24 }}><TabLayout /></SafeAreaInsetsContext.Provider>));
  expect(screen.getByText("Redirect: /onboarding")).toBeTruthy();
  expect(screen.queryByText("Today")).toBeNull();
});

test("an unknown protocol link cannot offer a different breathing practice", async () => {
  mockParams = { id: "not-a-protocol" };
  await render(wrap(<ProtocolDetail />));
  expect(screen.getByText("Session unavailable")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start practice  →" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Browse protocols" }));
  expect(mockReplace).toHaveBeenCalledWith("/protocols");
});


test("onboarding quick path acknowledges safety before completing once", async () => {
  await render(wrap(<Onboarding />));
  await fireEvent.press(screen.getByRole("button", { name: "Start breathing" }));
  expect(mockController.preferences.onboardingComplete).not.toBe(true);
  expect(screen.getByText("Comfort comes first.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "I understand" }));
  expect(mockController.preferences.onboardingComplete).toBe(true);
  expect(mockController.preferences.journey?.safetyAcceptedAt).toBeTruthy();
  expect(mockReplace).toHaveBeenCalledWith({ pathname: "/pre", params: { id: "extended-exhale" } });
});

test("personalization resumes from saved value screen and paywall dismissal enters Home", async () => {
  const view = await render(wrap(<Onboarding />));
  await fireEvent.press(screen.getByRole("button", { name: "Personalize InOut" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Sleep better" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  await view.unmount();
  await render(wrap(<Onboarding />));
  expect(screen.getByText("Ease into your evening.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Let's get started" }));
  await fireEvent.press(screen.getByRole("button", { name: "I understand" }));
  expect(mockController.preferences.journey?.step).toBe("offer");
  await fireEvent.press(screen.getByRole("button", { name: "Continue for free" }));
  expect(mockController.preferences.onboardingComplete).toBe(true);
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
});

test("earned milestone shares a private image through native sharing and offers both aspect ratios", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  mockController.addManualSession({ goal: "Calm", startedAt: Date.now()-120000, durationMs:60000 });
  mockParams = { badge: "sessions-1" };
  await render(wrap(<Milestone />));
  await fireEvent.press(screen.getByRole("button", { name: "Square · 1:1" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  await waitFor(() => expect(mockShare).toHaveBeenCalledWith("file:///card.png", { mimeType:"image/png", dialogTitle:"My IN/OUT practice" }));
  expect(screen.queryByText("Finding my rhythm")).toBeNull();
});
test("iOS badge sharing records completion but never records a dismissal as shared", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  const share = jest.spyOn(Share, "share").mockResolvedValueOnce({ action: Share.dismissedAction }).mockResolvedValueOnce({ action: Share.sharedAction });
  mockController.addManualSession({ goal: "Calm", startedAt: Date.now()-120000, durationMs:60000 });
  mockParams = { badge: "sessions-1" };
  const track = jest.spyOn(mockController.analytics, "track");
  await render(wrap(<Milestone />));
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(track).not.toHaveBeenCalledWith("badge_shared");
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  await waitFor(() => expect(track).toHaveBeenCalledWith("badge_shared"));
});

test.each(["en", "es", "pt"] as const)("challenge catalog opens details before a paywall in %s", async language => {
  mockController.setPreferences({ ...mockController.preferences, language });
  const view = await render(wrap(<Challenges />));
  expect(screen.getByText(t("First Breath"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: `${t("Sleep Reset")}. ${t("Requires Pro")}` }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/challenge", params: { id: "sleep-reset" } });
  mockParams = { id: "sleep-reset" };
  await view.rerender(wrap(<ChallengeDetail />));
  expect(screen.getByText(t("Build a consistent wind-down routine."))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("Unlock with InOut Pro") }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/pro", params: { source: "challenges" } });
});
test("joining a challenge starts the recommended existing practice and retains enrollment", async () => {
  mockParams = { id: "first-breath" };
  await render(wrap(<ChallengeDetail />));
  await fireEvent.press(screen.getByRole("button", { name: "Start challenge" }));
  expect(mockController.challenges()[0].progress).toBe(0);
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/pre", params: { id: "diaphragmatic", minSeconds: "60" } });
});
test("challenge completion shows its reward and shares only the generated card", async () => {
  const nativeShare = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
  mockController.enrollChallenge("first-breath");
  const state = mockController.challenges()[0];
  state.status = "completed"; state.progress = 3; state.completedAt = Date.now();
  state.completedSteps = [0, 1, 2].map(i => ({ sessionId: String(i), protocolId: "coherent", localDay: "2026-10-07", finishedAt: Date.now(), elapsedMs: 120000 }));
  mockParams = { id: "first-breath" };
  const view = await render(wrap(<ChallengeComplete />));
  expect(screen.getByText("CHALLENGE COMPLETE")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/challenge-share", params: { id: "first-breath" } });
  await view.rerender(wrap(<ChallengeShare />));
  expect(screen.getByTestId("challenge-share-card").props.style.aspectRatio).toBe(9 / 16);
  await fireEvent.press(screen.getByRole("button", { name: "Square · 1:1" }));
  expect(screen.getByTestId("challenge-share-card").props.style.aspectRatio).toBe(1);
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  await waitFor(() => expect(Platform.OS === "ios" ? nativeShare : mockShare).toHaveBeenCalled());
  expect(mockCapture).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1080, format: "png" }));
  await view.rerender(wrap(<ChallengeComplete />));
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(mockController.challenges()[0].celebrationSeen).toBe(true);
});
test("Home exposes profile and practice gateways without Settings or a personalization prompt", async () => {
  await render(wrap(<Today />));
  expect(screen.queryByRole("button", { name: "Open settings" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Personalize InOut" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Explore protocols" }));
  expect(mockPush).toHaveBeenLastCalledWith("/protocols");
  await fireEvent.press(screen.getByRole("button", { name: "Create" }));
  expect(mockPush).toHaveBeenLastCalledWith("/custom");
  await fireEvent.press(screen.getByRole("button", { name: "Explore challenges" }));
  expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/challenges");
});

test.each(["en", "es", "pt"] as const)("Long Exhale saves an actual timed attempt with a localized result in %s", async language => {
  mockController.setPreferences({ ...mockController.preferences, language }); mockParams = { id: "long-exhale" };
  const view = await render(wrap(<ChallengeTest />));
  expect(screen.getByRole("button", { name: t("Ready · Start") })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: t("I have read the precautions and I am in a safe place") }));
  await fireEvent.press(screen.getByRole("button", { name: t("Ready · Start") }));
  await act(() => jest.advanceTimersByTime(28400));
  await fireEvent.press(screen.getByRole("button", { name: t("Finish") }));
  expect(mockController.testState().pending?.value).toBe(28.4);
  await fireEvent.press(screen.getByRole("button", { name: t("Save result") }));
  expect(mockController.testAttempts()).toHaveLength(1);
  expect(mockReplace).toHaveBeenCalledWith({ pathname: "/challenge-attempt", params: { attempt: "id-1", fresh: "1" } });
  await view.unmount(); mockParams = { attempt: "id-1" };
  await render(wrap(<ChallengeAttemptResult />));
  expect(screen.queryByText(t("NEW PERSONAL BEST"))).toBeNull();
});

test("Comfort Hold is centrally gated; eligibility is remembered and background cancels running tests", async () => {
  mockParams = { id: "comfort-hold" }; const view = await render(wrap(<ChallengeTest />));
  await fireEvent.press(screen.getByRole("button", { name: "Unlock with InOut Pro" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/pro", params: { source: "challenges" } });
  await view.unmount(); mockParams = { id: "long-exhale" };
  let onState: ((s: import("react-native").AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => { onState = listener; return { remove: jest.fn() }; });
  await render(wrap(<ChallengeTest />));
  await fireEvent.press(screen.getByRole("button", { name: "This test is not suitable for me" }));
  expect(mockController.testState().excluded).toContain("long-exhale");
  await fireEvent.press(screen.getByRole("button", { name: "Review my eligibility" }));
  await fireEvent.press(screen.getByRole("button", { name: "I have read the precautions and I am in a safe place" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ready · Start" }));
  await act(() => onState?.("background"));
  expect(mockController.testState().pending).toBeNull(); expect(mockController.testAttempts()).toHaveLength(0);
});

test("Nasal 10 asks for confirmation and records an unsuccessful attempt without pretending completion", async () => {
  mockParams = { id: "nasal-10" }; await render(wrap(<ChallengeTest />));
  await fireEvent.press(screen.getByRole("button", { name: "I am somewhere safe for an easy walk" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ready · Start" }));
  await act(() => jest.advanceTimersByTime(600000));
  expect(screen.getByText("Did you complete all 10 minutes breathing only through your nose?")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Not this time" }));
  expect(mockController.testAttempts()[0].completed).toBe(false);
});

test("State Shift share cards exclude ratings unless explicitly selected", async () => {
  const a: ChallengeAttempt = { id: "shift", challengeId: "state-shift-60", definitionVersion: 1, startedAt: Date.now() - 60000, finishedAt: Date.now(), localDay: "2026-10-08", before: 4, after: 7, value: 3, completed: true };
  jest.spyOn(mockController, "testAttempts").mockReturnValue([a]); mockParams = { attempt: "shift" };
  await render(wrap(<ChallengeShare />));
  expect(screen.queryByText("4 → 7")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Include my self-reported ratings on this card" }));
  expect(screen.getByText("4 → 7")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Square · 1:1" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  await waitFor(() => expect(mockCapture).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1080 })));
});

test("a pending breath test recovered without foreground timing is discarded safely", async () => {
  mockController.beginTest("long-exhale", true); mockParams = { id: "long-exhale" };
  await render(wrap(<ChallengeTest />));
  expect(mockController.testState().pending).toBeNull();
  expect(screen.getByText("Interrupted test. Breathe normally and start again when ready.")).toBeTruthy();
});
