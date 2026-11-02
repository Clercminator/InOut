import Athletes from "../app/athletes";
import { Screen } from "../src/ui";
import BreathHoldTimerScreen from "../app/breath-hold-timer";
import { StateScale } from "../src/ui";
import { selectedGoals } from "../src/personalization";
import type { BreathHoldAttempt } from "../src/breath-hold-timer";
import ResultShare from "../app/result-share";
import Result from "../app/result";
import { emptyTestStore, appendAttempt, selectDaily, type TestStore, type PendingTest, type ChallengeAttempt, type TestId } from "../src/challenge-tests";
import ChallengeTest from "../app/challenge-test";
import ChallengeAttemptResult from "../app/challenge-attempt";
import ChallengeBest from "../app/challenge-best";
import Challenges from "../app/(tabs)/challenges";
import ChallengeDetail from "../app/challenge";
import ChallengeComplete from "../app/challenge-complete";
import ChallengeShare from "../app/challenge-share";
import { challengeCatalog, enrollChallenge, type UserChallenge } from "../src/challenges";
import * as Native from "react-native";
import Onboarding from "../app/onboarding";
import Milestone from "../app/milestone";
import ProtocolLibrary from "../app/(tabs)/protocols";
import { ThemeSurface } from "../src/theme";
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
import { PracticeChart, StateShiftChart } from "../src/progress-charts";
import EditProfile from "../app/edit-profile";
import Profile from "../app/profile";
import Personalize from "../app/personalize";
import RitualEdit from "../app/ritual-edit";
import Rituals from "../app/rituals";
import { SoundControls } from "../src/sound-controls";
import { Celebration } from "../src/celebration";
import Coach from "../app/coach";
import Pre from "../app/pre";
import PracticeAudio from "../app/practice-audio";
import { emptyCoach, recordCoachSession, validateCoach } from "../src/coach";

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
  Redirect: ({ href }: { href: string | { pathname: string } }) => require("react").createElement(require("react-native").Text, null, `Redirect: ${typeof href === "string" ? href : href.pathname}`),
  Tabs: Object.assign(({ children }: { children: React.ReactNode }) => children, {
    Screen: ({ options }: { options: { title: string } }) => require("react").createElement(require("react-native").Text, null, options.title),
  }),
  router: { navigate: (...args: unknown[]) => mockPush(...args), push: (...args: unknown[]) => mockPush(...args), replace: (...args: unknown[]) => mockReplace(...args), back: jest.fn(), canGoBack: () => true },
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
    const player = { isLoaded: true, volume: 1, play: jest.fn(), pause: jest.fn(), remove: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) };
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
  let coach = emptyCoach();
  let testState = emptyTestStore();
  mockController = new SessionController({
    coachState: () => coach, writeCoachState: (value: unknown) => { coach = validateCoach(value); },
    testStore: () => testState, setPendingTest: (pending: PendingTest | null) => { testState = { ...testState, pending }; },
    saveTestAttempt: (a: ChallengeAttempt) => { testState = { ...appendAttempt(testState, a), pending: null }; },
    excludeTest: (id: TestId, excluded: boolean) => { testState = { ...testState, excluded: excluded ? [...testState.excluded, id] : testState.excluded.filter(v => v !== id) }; },
    dailyChallenge: (pro: boolean, now: number) => { testState = selectDaily(testState, pro, challenges, now); return testState.daily.at(-1)?.id; },
    preferences: () => preferences, pending: () => null,
    challenges: () => challenges, enrollChallenge: (id: string, pro: boolean, at: number) => { challenges = enrollChallenge(id, challenges, pro, at); },
    acknowledgeChallenge: (id: string) => { challenges = challenges.map(s => s.challengeId === id ? { ...s, celebrationSeen: true } : s); },
    savePreferences: (p: Preferences) => { preferences = p; },
    history: () => [...history.values()].filter(r => r.stage === "result"),
    save: (r: SessionRecord) => { history.set(r.id, r); coach = recordCoachSession(coach, r); }, routines: () => [],
  } as unknown as LocalStore, () => Date.now(), () => `id-${++id}`);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test.each(["en", "es", "pt"] as const)("Home Timer and Challenges use the existing free timer; Daily Reset card stays (%s)", async language => {
  setLanguage(language);
  const result = await render(wrap(<Today />));
  const timer = screen.getByRole("button", { name: t("Timer") });
  expect(timer.props.accessibilityHint).toBe(t("Measure a comfortable breath hold"));
  await fireEvent.press(timer);
  expect(mockPush).toHaveBeenLastCalledWith("/breath-hold-timer");
  expect(screen.getByText(t("FREE · DAILY RESET"))).toBeTruthy();
  await result.rerender(wrap(<Challenges />));
  await fireEvent.press(screen.getByRole("button", { name: t("Breath Hold Timer") }));
  expect(mockPush).toHaveBeenLastCalledWith("/breath-hold-timer");
  await result.unmount(); setLanguage("en");
});

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

test("a ritual saves the chosen length and opens configuration before safety", async () => {
  const view = await render(wrap(<RitualEdit />));
  await fireEvent.changeText(screen.getByLabelText("Ritual name"), "Morning reset");
  await fireEvent.changeText(screen.getByLabelText("Ritual cycles"), "2");
  await fireEvent.press(screen.getByRole("button", { name: "Save ritual" }));
  expect(mockReplace).toHaveBeenCalledWith("/rituals");
  await view.rerender(wrap(<Rituals />));
  await fireEvent.press(screen.getByRole("button", { name: "Start Morning reset" }));
  expect(mockController.current).toBeNull();
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/pre", params: { ritualId: mockController.preferences.experience!.rituals[0].id } });
});

test("a lost custom draft cannot silently become a different ritual", async () => {
  mockParams = { protocolId: "custom" };
  await render(wrap(<RitualEdit />));
  expect(screen.getByText("This session draft is no longer available. Choose a protocol again.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Save ritual" })).toBeNull();
});

test("music preview respects selected volume, stops on mode change and stays absent in silent mode", async () => {
  mockController.preferences.guidance = { music: true };
  await render(wrap(<SoundControls />));
  expect(screen.queryByText("NATURAL BREATHING SOUNDS")).toBeNull();
  expect(screen.queryByText("Air")).toBeNull();
  expect(screen.queryByText("Ocean")).toBeNull();
  expect(screen.queryByText("Warm")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "25%" }));
  await fireEvent.press(screen.getByRole("button", { name: "Preview music" }));
  expect(mockPlayers[0].play).toHaveBeenCalled();
  expect(mockPlayers[0].volume).toBe(0.25);
  await fireEvent(screen.getByLabelText("Background music"), "valueChange", false);
  expect(mockPlayers[0].pause).toHaveBeenCalled(); expect(mockPlayers[0].remove).toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Preview music" })).toBeNull();
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
  await act(async () => { mockPlayers[0].addListener.mock.calls[0][1]({ isLoaded: true, playing: true }); });
  expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  await view.rerender(wrap(<Celebration variant="saved" title="Saved" message="Nice work." />));
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(mockPlayers).toHaveLength(1);
  expect(mockPlayers[0].remove).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(mockPlayers[0].remove).toHaveBeenCalledTimes(1);
});

test("an interrupted voice preview cancels the pending exhale cue", async () => {
  mockController.setPreferences({ ...mockController.preferences, audio: "voice" });
  await render(wrap(<SoundControls compact />));
  await fireEvent.press(screen.getByRole("button", { name: "Preview voice" }));
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
  mockController.setPreferences({ ...mockController.preferences, language: "es", languageSource: "manual" });
  await render(wrap(<Profile />));
  expect(screen.getByText("Focus")).toBeTruthy();
  expect(screen.getByText("Sleep")).toBeTruthy();
  expect(screen.getByText("A moment for myself")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Editar perfil" })).toBeTruthy();
});

test.each(["es", "pt"] as const)("stored defaults follow the current language after unrelated profile edits (%s)", async language => {
  mockController.updateExperience({ avatar: "air" });
  mockController.setPreferences({ ...mockController.preferences, language, languageSource: "manual" });
  const view = await render(wrap(<EditProfile />));
  expect(screen.getByLabelText(t("Your intention")).props.value).toBe(language === "es" ? "Un momento para mí" : "Um momento para mim");
  await fireEvent.changeText(screen.getByLabelText(t("Display name")), "Taylor");
  await fireEvent.press(screen.getByRole("button", { name: t("Save profile") }));
  expect(mockController.preferences.experience?.intentionSource).toBeUndefined();
  await act(async () => mockController.setPreferences({ ...mockController.preferences, language: language === "es" ? "pt" : "es", languageSource: "manual" }));
  await view.rerender(wrap(<Profile />));
  expect(screen.getByText(language === "es" ? "Um momento para mim" : "Un momento para mí")).toBeTruthy();
  await view.unmount(); setLanguage("en");
});

test("selected intention presets stay translated while typed intentions stay literal", async () => {
  mockController.setPreferences({ ...mockController.preferences, language: "es", languageSource: "manual" });
  const view = await render(wrap(<EditProfile />));
  await fireEvent.press(screen.getByRole("button", { name: t("More calm") }));
  await fireEvent.press(screen.getByRole("button", { name: t("Save profile") }));
  expect(mockController.preferences.experience).toMatchObject({ intention: "More calm", intentionSource: "preset" });
  await act(async () => mockController.setPreferences({ ...mockController.preferences, language: "pt", languageSource: "manual" }));
  await view.rerender(wrap(<Profile />));
  expect(screen.getByText("Mais calma")).toBeTruthy();
  await view.rerender(wrap(<EditProfile />));
  await fireEvent.changeText(screen.getByLabelText(t("Your intention")), "A moment for myself");
  await fireEvent.press(screen.getByRole("button", { name: t("Save profile") }));
  expect(mockController.preferences.experience?.intentionSource).toBe("custom");
  await view.rerender(wrap(<Profile />));
  expect(screen.getByText("A moment for myself")).toBeTruthy();
  await view.unmount(); setLanguage("en");
});

test.each(["es", "pt"] as const)("populated charts and Coach accessibility contain fully localized copy (%s)", async language => {
  mockController.setPreferences({ ...mockController.preferences, language, languageSource: "manual" });
  mockController.start(3, 1);
  jest.advanceTimersByTime(600000); mockController.tick(); mockController.answer(5, null);
  const record = { ...mockController.history()[0], goal: "Calm" as const };
  const buckets = [{ key: "today", label: "26/10", records: [record] }];
  const view = await render(wrap(<><PracticeChart title="SESSIONS" buckets={buckets} metric="sessions" by="goal"/><StateShiftChart buckets={buckets}/></>));
  expect(screen.getByText(language === "es" ? "Calma: 1 sesión" : "Calma: 1 sessão")).toBeTruthy();
  const descriptions = screen.getAllByRole("adjustable").map(node => node.props.accessibilityLabel);
  expect(descriptions.join(" ")).not.toMatch(/Calm:|session|paired rating|average State Shift|tensi[oó]n|tensão/);
  expect(descriptions[1]).toContain(language === "es" ? "bienestar" : "bem-estar");
  expect(descriptions[1]).toContain(language === "es" ? "1 evaluación antes y después" : "1 avaliação antes e depois");
  await act(async () => mockController.enrollProgram("find-your-rhythm"));
  await view.rerender(wrap(<Coach />));
  expect(screen.getByRole("progressbar").props.accessibilityLabel).toBe(t("Find Your Rhythm"));
  expect(screen.getByRole("progressbar").props.accessibilityLabel).not.toBe("Find Your Rhythm");
  await view.unmount(); setLanguage("en");
});

test("Portuguese protocol safety expands and translated dialogs keep their actions", async () => {
  mockParams = { id: "box" };
  mockController.setPreferences({ ...mockController.preferences, language: "pt", languageSource: "manual" });
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
  expect(screen.queryByRole("button", { name: "Preview music" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Delete all local data" })).toBeNull();
  expect(screen.getByRole("button", { name: "Sound" }).props.accessibilityState.expanded).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Sound" }));
  await fireEvent(screen.getByLabelText("Background music"), "valueChange", true);
  await fireEvent.press(screen.getByRole("button", { name: "Preview music" }));
  expect(mockPlayers.length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole("button", { name: "Sound" }));
  expect(mockPlayers.every(player => player.remove.mock.calls.length === 1)).toBe(true);
  expect(screen.queryByRole("button", { name: "Stop preview" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Appearance & language" }));
  await fireEvent.press(screen.getByRole("button", { name: "Português" }));
  await fireEvent.press(screen.getByRole("button", { name: "Som" }));
  expect(screen.getByRole("button", { name: t("Preview music") })).toBeTruthy();
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

test("new completion chimes persist and their previews are not cut off at the old duration", async () => {
  await render(wrap(<SoundControls />));
  await fireEvent.press(screen.getByRole("button", { name: "Chime 1" }));
  expect(mockController.preferences.experience?.chime).toBe("completion-1");
  await fireEvent.press(screen.getByRole("button", { name: "Preview chime" }));
  const player = mockPlayers[mockPlayers.length - 1];
  await act(async () => { player.addListener.mock.calls[0][1]({ isLoaded: true, playing: true }); });
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(player.remove).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(2200); });
  expect(player.remove).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Chime 2" }));
  expect(mockController.preferences.experience?.chime).toBe("completion-2");
});

test("home recommendation starts the selected goal and displays the user's own intention", async () => {
  mockController.updateExperience({ intention: "A quiet moment before work" });
  await render(wrap(<Today />));
  expect(screen.getByText("A quiet moment before work")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Focus" }));
  await fireEvent.press(screen.getByRole("button", { name: "Start practice" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/pre", params: expect.objectContaining({ id: "box" }) });
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


async function onboardingPress(title: string) {
  await act(() => jest.advanceTimersByTime(400));
  await fireEvent.press(screen.getByRole("button", { name: t(title) }));
}
test("onboarding quick path acknowledges safety and shows the demo before completing once", async () => {
  await render(wrap(<Onboarding />));
  await onboardingPress("Start breathing");
  expect(mockController.preferences.onboardingComplete).not.toBe(true);
  expect(screen.getByText("Comfort comes first.")).toBeTruthy();
  await onboardingPress("I understand");
  expect(mockController.preferences.onboardingComplete).not.toBe(true);
  await onboardingPress("Start breathing");
  expect(mockController.preferences.onboardingComplete).toBe(true);
  expect(mockController.preferences.journey?.safetyAcceptedAt).toBeTruthy();
  expect(mockReplace).toHaveBeenCalledWith({ pathname: "/pre", params: { id: "extended-exhale" } });
});

test("personalization persists time, safety and demo; dismissal starts the recommended practice", async () => {
  let view = await render(wrap(<Onboarding />));
  await onboardingPress("Personalize InOut");
  await fireEvent.press(screen.getByRole("checkbox", { name: "Sleep better" }));
  await onboardingPress("5 min");
  expect(mockController.coachState().availableMinutes).toBe(5);
  await onboardingPress("Continue");
  await onboardingPress("I understand");
  expect(mockController.preferences.journey?.step).toBe("demo");
  await onboardingPress("Try a few breaths");
  expect(screen.getByText("Breathe in")).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(screen.getByText("Breathe out")).toBeTruthy();
  expect(mockController.history()).toHaveLength(0);
  expect(mockController.current).toBeNull();
  await view.unmount();
  view = await render(wrap(<Onboarding />));
  expect(screen.getByText("A rhythm you can follow.")).toBeTruthy();
  await onboardingPress("Start breathing");
  expect(mockController.preferences.journey?.step).toBe("offer");
  await onboardingPress("Continue for free");
  expect(mockController.preferences.onboardingComplete).toBe(true);
  expect(mockReplace).toHaveBeenCalledWith({ pathname: "/pre", params: { id: "sleep-wind-down" } });
});

test("completed users never re-enter the welcome offer through its route", async () => {
  mockController.setPreferences({ ...mockController.preferences, onboardingComplete: true, journey: { version: 1, step: "offer", secondaryGoals: [] } });
  await render(wrap(<Onboarding />));
  expect(screen.getByText("Redirect: /(tabs)")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Continue for free" })).toBeNull();
});

test("demo backgrounding stops immediately and returning never resumes automatically", async () => {
  mockController.setPreferences({ ...mockController.preferences, journey: { version: 1, step: "demo", secondaryGoals: [], safetyAcceptedAt: 1 } });
  const subscribe = jest.spyOn(AppState, "addEventListener");
  await render(wrap(<Onboarding />));
  await fireEvent.press(screen.getByRole("button", { name: "Try a few breaths" }));
  const callbacks = subscribe.mock.calls.filter(([event]) => event === "change").map(([, callback]) => callback);
  await act(async () => { callbacks.forEach(callback => callback("background")); });
  await act(async () => { jest.advanceTimersByTime(30000); callbacks.forEach(callback => callback("active")); });
  expect(screen.getByRole("button", { name: "Try a few breaths" })).toBeTruthy();
  expect(mockController.history()).toHaveLength(0);
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
  expect(screen.getByRole("button", { name: "Share achievement" })).toBeDisabled();
  await fireEvent(screen.getByTestId("challenge-share-background"), "load");
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
  expect(screen.queryByRole("button", { name: "Explore challenges" })).toBeNull();
  expect(screen.queryByRole("button", { name: "View progress" })).toBeNull();
});

test.each(["en", "es", "pt"] as const)("Long Exhale saves an actual timed attempt with a localized result in %s", async language => {
  mockController.setPreferences({ ...mockController.preferences, language }); mockParams = { id: "long-exhale" };
  const view = await render(wrap(<ChallengeTest />));
  expect(screen.getByRole("button", { name: t("Ready · Start") })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: t("I have read the precautions and I am in a safe place") }));
  await fireEvent.press(screen.getByRole("button", { name: t("Ready · Start") }));
  await act(async () => { mockController.confirmSafety(); });
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
  await act(async () => { mockController.confirmSafety(); });
  await act(() => onState?.("background"));
  expect(mockController.testState().pending).toBeNull(); expect(mockController.testAttempts()).toHaveLength(0);
});

test("Nasal 10 asks for confirmation and records an unsuccessful attempt without pretending completion", async () => {
  mockParams = { id: "nasal-10" }; await render(wrap(<ChallengeTest />));
  await fireEvent.press(screen.getByRole("button", { name: "I am somewhere safe for an easy walk" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ready · Start" }));
  await act(async () => { mockController.confirmSafety(); });
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
  await fireEvent(screen.getByTestId("challenge-share-background"), "load");
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  await waitFor(() => expect(mockCapture).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1080 })));
});

test("a pending breath test recovered without foreground timing is discarded safely", async () => {
  mockController.beginTest("long-exhale", true); mockParams = { id: "long-exhale" };
  await render(wrap(<ChallengeTest />));
  expect(mockController.testState().pending).toBeNull();
  expect(screen.getByText("Interrupted test. Breathe normally and start again when ready.")).toBeTruthy();
});


test("vibration failures are visible and cancel remaining pulses", async () => {
  mockTouch.mockRejectedValueOnce(new Error("unavailable"));
  await render(wrap(<SoundControls compact />));
  await fireEvent.press(screen.getByRole("button", { name: "Gentle transitions" }));
  await fireEvent.press(screen.getByRole("button", { name: /Preview vibration/ }));
  expect(screen.getByRole("alert")).toHaveTextContent(/Vibration unavailable/);
  await act(async () => jest.advanceTimersByTime(6000));
  expect(mockTouch).toHaveBeenCalledTimes(1);
});

test("Free coach opens its program through setup and retains the draft under audio settings", async () => {
  const view = await render(wrap(<Coach />));
  expect(screen.queryByText("AI-assisted coaching is not enabled in this build. Your goals and check-ins are not sent to an AI service.")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Start program" }));
  const run = mockController.coachState().activeEnrollmentId;
  await fireEvent.press(screen.getByRole("button", { name: "Start today's session" }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/pre", params: { id: "diaphragmatic", coachRun: run, coachStep: "0", coachRepeat: "0" } });
  mockParams = mockPush.mock.calls.at(-1)![0].params;
  await view.rerender(wrap(<Pre />));
  for (let i = 0; i < 6; i++) await fireEvent(screen.getByRole("adjustable"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  await fireEvent.press(screen.getByRole("button", { name: "Audio & haptics" }));
  expect(mockPush).toHaveBeenLastCalledWith("/practice-audio");
  await view.rerender(wrap(<><Pre /><PracticeAudio /></>));
  await fireEvent(screen.getByRole("switch", { name: "Background music" }), "valueChange", true);
  await view.rerender(wrap(<Pre />));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(6);
  await fireEvent.press(screen.getByRole("button", { name: "Skip rating & continue" }));
  await act(async () => { mockController.confirmSafety(); });
  expect(mockPush).toHaveBeenLastCalledWith("/practice-safety");
  expect(mockController.current?.coach).toEqual({ enrollmentId: run, step: 0 });
  expect(mockController.current?.engine.plan.blocks[0].cycles).toBe(12);
  expect(mockController.preferences.guidance?.music).toBe(true);
  await act(async () => { jest.advanceTimersByTime(300000); mockController.tick(); mockController.answer(null, null); });
  mockParams = { id: mockController.current!.id };
  await view.rerender(wrap(<Result />));
  expect(screen.getByText("1 of 7 practice days complete")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Return to coach" }));
  expect(mockReplace).toHaveBeenLastCalledWith("/coach");
  await view.rerender(wrap(<Coach />));
  expect(screen.queryByRole("button", { name: "Start today's session" })).toBeNull();
  expect(screen.getByText("Your progress is saved. Come back on your next practice day.")).toBeTruthy();
});

test("premium program preview does not activate access and rejected deep links return to coach", async () => {
  const view = await render(wrap(<Coach />));
  await fireEvent.press(screen.getAllByRole("button", { name: "Explore InOut Pro" })[0]);
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/pro", params: { source: "coach" } });
  expect(mockController.coachState().enrollments).toHaveLength(0);
  mockParams = { id: "coherent", coachRun: "missing", coachStep: "0" };
  await view.rerender(wrap(<Pre />));
  expect(screen.queryByRole("button", { name: "Skip rating & continue" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Return to coach" }));
  expect(mockReplace).toHaveBeenLastCalledWith("/coach");
});

test.each(["en", "es", "pt"] as const)("coach navigation and program titles localize in %s", async language => {
  mockController.setPreferences({ ...mockController.preferences, language });
  await render(wrap(<Coach />));
  expect(screen.getByText(t("Find Your Rhythm"))).toBeTruthy();
  expect(screen.getByRole("button", { name: t("Start program") })).toBeTruthy();
});


test("result artwork waits for loading, captures square and story, and cleans temporary files", async () => {
  mockController.start(7); mockController.end("ended");
  mockParams = { id: mockController.current!.id };
  await render(wrap(<ResultShare />));
  expect(screen.getByRole("button", { name: "Share result" })).toBeDisabled();
  await fireEvent(screen.getByTestId("result-share-background"), "load");
  await fireEvent.press(screen.getByRole("button", { name: "Share result" }));
  await waitFor(() => expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1080 })));
  await waitFor(() => expect(screen.getByRole("button", { name: "Share result" })).not.toBeDisabled());
  await fireEvent.press(screen.getByRole("button", { name: "Story · 9:16" }));
  expect(screen.getByRole("button", { name: "Share result" })).toBeDisabled();
  await fireEvent(screen.getByTestId("result-share-background"), "load");
  await fireEvent.press(screen.getByRole("button", { name: "Share result" }));
  await waitFor(() => expect(mockCapture).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1920 })));
});

test("measurement sharing consent belongs only to the explicitly selected result", async () => {
  const complete = (pre: number, post: number) => {
    mockController.start(pre, 1);
    jest.advanceTimersByTime(600000); mockController.tick(); mockController.answer(post, null);
    mockParams = { id: mockController.current!.id };
  };
  complete(7, 3);
  const view = await render(wrap(<ResultShare />));
  await fireEvent.press(screen.getByRole("button", { name: "Include my well-being change when sharing" }));
  expect(screen.getByText(/7 → 3/)).toBeTruthy();
  await act(async () => { complete(8, 4); });
  await view.rerender(wrap(<ResultShare />));
  expect(screen.queryByText(/8 → 4/)).toBeNull();
});

test("audio previews show loading until native playback, and music replaces voice without overlapping", async () => {
  mockController.setPreferences({ ...mockController.preferences, audio: "voice", guidance: { voice: true, music: true } });
  await render(wrap(<SoundControls compact />));
  await fireEvent.press(screen.getByRole("button", { name: "Preview voice" }));
  expect(screen.getByText("Loading sample…")).toBeTruthy();
  expect(screen.queryByText("Playing sample")).toBeNull();
  const voices = [...mockPlayers];
  await act(async () => voices[0].addListener.mock.calls[0][1]({ playing: true }));
  expect(screen.getByText("Playing sample")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Preview music" }));
  expect(voices.every(player => player.remove.mock.calls.length === 1)).toBe(true);
  expect(screen.getByText("Loading sample…")).toBeTruthy();
  expect(mockPlayers).toHaveLength(3);
});

test.each(["light", "dark"] as const)("Home preserves the approved untinted Pulse artwork in %s appearance", async mode => {
  await render(wrap(<ThemeSurface mode={mode}><Today /></ThemeSurface>));
  const artwork = screen.getByTestId("pulse-artwork", { includeHiddenElements: true });
  expect(artwork.props.source).toEqual(require("../assets/pulse-orb.png"));
  expect(artwork.props.style.tintColor).toBeUndefined();
});

test.each(["en", "es", "pt"] as const)("result image includes a localized invitation in %s", async language => {
  mockController.start(7, 1);
  jest.advanceTimersByTime(600000); mockController.tick(); mockController.answer(3, null);
  mockParams = { id: mockController.current!.id };
  setLanguage(language);
  await render(wrap(<ResultShare />));
  expect(screen.getByTestId("result-share-invitation")).toHaveTextContent(t("Try a breathing practice with IN/OUT."));
  expect(screen.getByText("inout.imrtech.xyz")).toBeTruthy();
});


test("audio previews remain available while a practice is paused and stop when it resumes", async () => {
  mockController.setPreferences({ ...mockController.preferences, audio: "voice", guidance: { voice: true, music: true } });
  mockController.start(null);
  mockController.pause();
  const rendered = await render(wrap(<SoundControls compact />));
  await fireEvent.press(screen.getByRole("button", { name: "Preview voice" }));
  expect(screen.getByText("Loading sample…")).toBeTruthy();
  expect(mockPlayers.length).toBeGreaterThan(0);
  const voices = [...mockPlayers];
  await act(async () => { mockController.resume(); });
  await rendered.rerender(wrap(<SoundControls compact />));
  expect(voices.every(player => player.remove.mock.calls.length === 1)).toBe(true);
  expect(screen.queryByRole("button", { name: "Stop preview" })).toBeNull();
  expect(screen.getByRole("button", { name: "Preview voice" })).toBeDisabled();
});


test("reopened saved results display encouragement without replaying feedback", async () => {
  await render(wrap(<Celebration enabled={false} variant="saved" title="Session saved!" message="Nice work." duration="2:00" />));
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText("2:00")).toBeTruthy();
  expect(mockPlayers).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "Skip animation" })).toBeNull();
});

test("session reveal can skip animation while retaining the result", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  await render(wrap(<Celebration variant="saved" title="Session saved!" message="Nice work." duration="2:00" />));
  await fireEvent.press(screen.getByRole("button", { name: "Skip animation" }));
  expect(screen.getByText("2:00")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Skip animation" })).toBeNull();
});


test.each(["en", "es", "pt"] as const)("onboarding collects multiple goals once and resumes the remaining journey in %s", async language => {
  mockController.setPreferences({ ...mockController.preferences, onboardingComplete: false, language, languageSource: "manual" });
  let view = await render(wrap(<Onboarding />));
  await onboardingPress("Personalize InOut");
  await fireEvent.press(screen.getByRole("checkbox", { name: t("Sleep better") }));
  await fireEvent.press(screen.getByRole("checkbox", { name: t("Improve focus") }));
  expect(screen.queryByText(t("PRIMARY GOAL · OPTIONAL"))).toBeNull();
  expect(selectedGoals(mockController.preferences)).toEqual(["sleep", "focus"]);
  await onboardingPress("5 min");
  await onboardingPress("Continue");
  await view.unmount();
  view = await render(wrap(<Onboarding />));
  expect(screen.getByText(t("Comfort comes first."))).toBeTruthy();
  expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  expect(mockController.coachState().availableMinutes).toBe(5);
  await onboardingPress("I understand");
  await onboardingPress("Start breathing");
  await onboardingPress("Continue for free");
  expect(selectedGoals(mockController.preferences)).toEqual(["sleep", "focus"]);
  expect(mockController.preferences.onboardingComplete).toBe(true);
});

test("onboarding swipes preserve answers, respect boundaries and require explicit safety acknowledgement", async () => {
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(false);
  const create = jest.spyOn(Native.PanResponder, "create");
  await render(wrap(<Onboarding />));
  const swipe = async (direction: "left" | "right") => {
    await act(() => jest.advanceTimersByTime(400));
    await act(() => {
      const handlers = create.mock.calls.at(-1)![0];
      const g = { dx: direction === "left" ? -90 : 90, dy: 0, numberActiveTouches: 1 } as any;
      handlers.onStartShouldSetPanResponderCapture?.({} as any, g);
      if (handlers.onMoveShouldSetPanResponderCapture?.({} as any, g)) handlers.onPanResponderRelease?.({} as any, g);
    });
  };
  await swipe("right"); expect(mockController.preferences.journey?.step).toBeUndefined();
  await swipe("left");
  expect(screen.getByText("What brings you here?")).toBeTruthy();
  await swipe("left"); expect(mockController.preferences.journey?.step).toBe("goals");
  await fireEvent.press(screen.getByRole("checkbox", { name: "Sleep better" }));
  await swipe("left"); expect(mockController.preferences.journey?.step).toBe("safety");
  await swipe("left"); expect(mockController.preferences.journey?.safetyAcceptedAt).toBeUndefined();
  await swipe("right"); expect(screen.getByRole("checkbox", { name: "Sleep better" }).props.accessibilityState.checked).toBe(true);
  await swipe("left"); await onboardingPress("I understand");
  expect(mockController.preferences.journey?.step).toBe("demo");
});
test("optional personalization can be skipped without skipping safety", async () => {
  await render(wrap(<Onboarding />));
  await onboardingPress("Personalize InOut"); await onboardingPress("Skip personalization");
  expect(mockController.preferences.journey?.step).toBe("safety");
  expect(mockController.preferences.journey?.safetyAcceptedAt).toBeUndefined();
});
test.each([["es", 320, 568, 1], ["pt", 430, 932, 1.4]] as const)("demo and contextual help remain translated at %s %spx", async (language, width, height, fontScale) => {
  jest.spyOn(Native, "useWindowDimensions").mockReturnValue({ width, height, scale: 2, fontScale });
  mockController.setPreferences({ ...mockController.preferences, language, languageSource: "manual", journey: { version: 1, step: "demo", secondaryGoals: [], safetyAcceptedAt: 1 } });
  await render(wrap(<Onboarding />));
  expect(screen.getByRole("button", { name: t("Start breathing") })).toBeTruthy();
  await onboardingPress("About your practice");
  expect(screen.getByRole("button", { name: language === "es" ? "Cerrar" : "Fechar" })).toBeTruthy();
  await onboardingPress("Close"); await onboardingPress("Try a few breaths");
  expect(screen.getByText(t("Breathe in"))).toBeTruthy();
  await act(() => jest.advanceTimersByTime(4000)); expect(screen.getByText(t("Breathe out"))).toBeTruthy();
  await act(() => jest.advanceTimersByTime(30000));
  expect(screen.getByText(language === "es" ? "Vuelve a respirar con naturalidad." : "Volte a respirar naturalmente.")).toBeTruthy();
  expect(screen.getByRole("button", { name: t("Try again") })).toBeTruthy();
  expect(screen.queryByText("Return to natural breathing.")).toBeNull();
});
test.each(["en", "es", "pt"] as const)("protocol guidance and tab Home controls render in %s", async language => {
  setLanguage(language); mockParams = { id: "coherent" };
  let view = await render(wrap(<ProtocolDetail />));
  expect(screen.getByText(t("Find an even rhythm during a busy day."))).toBeTruthy();
  expect(screen.getByText(t("During a quiet break or at the start of recovery, once breathing is comfortable."))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("Why it may help") }));
  expect(screen.getByText(t("Equal inhales and exhales offer a simple pace without breath holds, leaving less to keep track of."))).toBeTruthy();
  await view.unmount(); view = await render(wrap(<Progress />));
  await fireEvent.press(screen.getByRole("button", { name: t("Back to Home") }));
  expect(mockPush).toHaveBeenCalledWith("/(tabs)");
  await view.unmount(); await render(wrap(<Challenges />));
  await fireEvent.press(screen.getByRole("button", { name: t("Back to Home") }));
  expect(mockPush).toHaveBeenCalledTimes(2);
});

test.each(["light", "dark"] as const)("compact rating is unanswered until touched and supports all integer values in %s", async mode => {
  const values: number[] = [];
  function Rating() { const [value, setValue] = React.useState<number | null>(null); return <StateScale value={value} onChange={n => { values.push(n); setValue(n); }} />; }
  await render(wrap(<ThemeSurface mode={mode}><Rating /></ThemeSurface>));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBeUndefined();
  expect(values).toEqual([]);
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  for (let n = 1; n <= 10; n++) {
    await fireEvent(screen.getByRole("adjustable"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(n);
  }
  await fireEvent.press(screen.getByRole("button", { name: "Higher well-being rating" }));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(10);
  await fireEvent(screen.getByRole("adjustable"), "layout", { nativeEvent: { layout: { width: 120 } } });
  await fireEvent(screen.getByRole("adjustable"), "responderGrant", { nativeEvent: { locationX: 0 } });
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(1);
  await fireEvent(screen.getByRole("adjustable"), "responderMove", { nativeEvent: { locationX: 120 } });
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(10);
  await fireEvent.press(screen.getByRole("button", { name: "Lower well-being rating" }));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(9);
});

test.each(["en", "es", "pt"] as const)("Free timer saves only on request, resets and returns to Challenges in %s", async language => {
  mockController.setPreferences({ ...mockController.preferences, language, languageSource: "manual" });
  const history: BreathHoldAttempt[] = [];
  jest.spyOn(mockController, "breathHoldHistory").mockImplementation(() => history);
  jest.spyOn(mockController, "saveBreathHold").mockImplementation(a => { history.push(a); return true; });
  const track = jest.spyOn(mockController.analytics, "track");
  await render(wrap(<BreathHoldTimerScreen />));
  expect(screen.getByText("00:00.0")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("Start") }));
  await act(async () => { jest.advanceTimersByTime(1234); });
  await fireEvent.press(screen.getByRole("button", { name: t("Stop") }));
  expect(screen.getByText("00:01.2")).toBeTruthy();
  expect(history).toHaveLength(0);
  await fireEvent.press(screen.getByRole("button", { name: t("Save attempt") }));
  expect(history).toHaveLength(1);
  expect(history[0].elapsedMs).toBe(1234);
  expect(screen.queryByRole("button", { name: t("Save attempt") })).toBeNull();
  expect(mockController.history()).toHaveLength(0);
  expect(track).toHaveBeenCalledWith("breath_hold_saved");
  await fireEvent.press(screen.getByRole("button", { name: t("Try again") }));
  expect(screen.getByText("00:00.0")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("Return to Challenges") }));
  expect(mockReplace).toHaveBeenLastCalledWith("/(tabs)/challenges");
});

test.each(["change", "blur", "unmount"])("timer abandons on %s and never saves background time", async event => {
  jest.spyOn(mockController, "breathHoldHistory").mockReturnValue([]);
  const save = jest.spyOn(mockController, "saveBreathHold");
  const track = jest.spyOn(mockController.analytics, "track");
  const subscribe = jest.spyOn(AppState, "addEventListener");
  const view = await render(wrap(<BreathHoldTimerScreen />));
  await fireEvent.press(screen.getByRole("button", { name: "Start" }));
  await act(async () => { jest.advanceTimersByTime(300); });
  if (event === "unmount") await view.unmount();
  else {
    await act(async () => { subscribe.mock.calls.filter(([name]) => name === event).forEach(([, callback]) => callback("background")); });
    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(screen.queryByRole("button", { name: "Save attempt" })).toBeNull();
    expect(screen.getByText("Attempt interrupted")).toBeTruthy();
  }
  expect(track.mock.calls.filter(([name]) => name === "breath_hold_abandoned")).toHaveLength(1);
  expect(save).not.toHaveBeenCalled();
});


test("a failed completion save stays in onboarding and retry retains the first-practice destination", async () => {
  mockController.setPreferences({ ...mockController.preferences, journey: { version: 1, step: "demo", secondaryGoals: ["sleep"], quickStart: true, safetyAcceptedAt: 1 } });
  await render(wrap(<Onboarding />));
  jest.spyOn((mockController as any).store, "savePreferences").mockImplementationOnce(() => { throw new Error("write failed"); });
  await onboardingPress("Start breathing");
  expect(mockController.preferences.onboardingComplete).not.toBe(true);
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.getByText("A rhythm you can follow.")).toBeTruthy();
  await act(() => mockController.retry());
  expect(mockController.preferences.onboardingComplete).toBe(true);
  expect(screen.getByText("Redirect: /pre")).toBeTruthy();
});


test.each(["en", "es", "pt"] as const)("exercise guide reuses presets and offers movement guidance without a hold timer (%s)", async language => {
  setLanguage(language);
  await render(wrap(<Athletes />));
  await fireEvent.press(screen.getByRole("button", { name: new RegExp(t("Runner's Rhythm")) }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/protocol", params: { id: "runner-rhythm" } });
  await fireEvent.press(screen.getByRole("button", { name: t("During exercise") }));
  expect(screen.getByText(t("Let your breathing follow your effort"))).toBeTruthy();
  expect(screen.queryByRole("button", { name: new RegExp(t("Runner's Rhythm")) })).toBeNull();
  expect(screen.queryByRole("button", { name: t("Start practice") })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: t("After exercise") }));
  await fireEvent.press(screen.getByRole("button", { name: new RegExp(t("Post-Workout Reset")) }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/protocol", params: { id: "post-workout-reset" } });
});

test("logo pauses an active practice before navigating Home and remains safe on repeat taps", async () => {
  mockController.start(null);
  await render(wrap(<Screen />));
  await fireEvent.press(screen.getByRole("button", { name: "IN/OUT · Home" }));
  expect(mockController.current?.engine.status).toBe("paused");
  expect(mockPush).toHaveBeenLastCalledWith("/(tabs)");
  await fireEvent.press(screen.getByRole("button", { name: "IN/OUT · Home" }));
  expect(mockController.current?.engine.status).toBe("paused");
});

test.each(["en", "es", "pt"] as const)("result offers primary repeat and compact secondary sharing routes (%s)", async language => {
  setLanguage(language);
  mockController.start(3, 1);
  jest.advanceTimersByTime(600000); mockController.tick(); mockController.answer(5, null);
  const id = mockController.current!.id;
  mockParams = { id, saved: "1" };
  mockController.latestAwards = [{ id: "first-session", label: "First practice", date: "2026-10-26" }];
  await render(wrap(<Result />));
  const actions = screen.getAllByRole("button");
  expect(actions.indexOf(screen.getByRole("button", { name: t("Do it again") }))).toBeLessThan(actions.indexOf(screen.getByRole("button", { name: t("Return to Home") })));
  expect(actions.indexOf(screen.getByRole("button", { name: t("Return to Home") }))).toBeLessThan(actions.indexOf(screen.getByRole("button", { name: t("Share result") })));
  expect(screen.getByRole("button", { name: t("Invite a friend") })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("Share achievement") }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/milestone", params: { badge: "first-session" } });
  await fireEvent.press(screen.getByRole("button", { name: t("Share result") }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/result-share", params: { id } });
  await fireEvent.press(screen.getByRole("button", { name: t("Do it again") }));
  expect(mockReplace).toHaveBeenLastCalledWith({ pathname: "/pre", params: { id: "custom" } });
});

test("Home need selection updates the following recommendation and links to exercise guidance", async () => {
  await render(wrap(<Today />));
  expect(screen.queryByText("Good to have you back. Start with a short reset — your achievements are still here.")).toBeNull();
  expect(screen.getByText("Choose a focus to update the practice below.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Sleep" }));
  expect(screen.getByRole("button", { name: "Sleep" }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Start practice" }));
  expect(mockPush.mock.calls.at(-1)![0].params.id).toBe("sleep-wind-down");
  await fireEvent.press(screen.getByRole("button", { name: "Breathing for exercise" }));
  expect(mockPush).toHaveBeenLastCalledWith("/athletes");
});
