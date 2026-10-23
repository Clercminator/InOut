const mockAnalytics = { getAnalytics: jest.fn(() => ({})), setConsent: jest.fn(async () => {}), setAnalyticsCollectionEnabled: jest.fn(async () => {}), resetAnalyticsData: jest.fn(async () => {}), logEvent: jest.fn(async (..._args: unknown[]) => {}) };
const mockCrash = { getCrashlytics: jest.fn(() => ({})), setCrashlyticsCollectionEnabled: jest.fn(async () => {}), deleteUnsentReports: jest.fn(async () => {}), recordError: jest.fn() };
const mockTracking = { enable: jest.fn() };
jest.mock("@react-native-firebase/analytics", () => mockAnalytics);
jest.mock("@react-native-firebase/crashlytics", () => mockCrash);
jest.mock("promise/setimmediate/rejection-tracking", () => mockTracking);
let handler: (error: Error, fatal?: boolean) => void;
const previous = jest.fn();
const originalErrors = (globalThis as any).ErrorUtils;
beforeEach(() => {
  jest.clearAllMocks();
  handler = previous;
  (globalThis as any).ErrorUtils = { getGlobalHandler: () => handler, setGlobalHandler: (next: typeof handler) => { handler = next; } };
});
afterEach(() => { (globalThis as any).ErrorUtils = originalErrors; });
function setup() {
  let sink: import('../src/telemetry').TelemetrySink;
  jest.isolateModules(() => { sink = require('../src/telemetry-native').firebaseTelemetry(); });
  return sink!;
}

test("native events and sanitized JS/promise failures require consent and stop immediately on withdrawal", async () => {
  const sink = setup();
  const error = new Error('private email and health note');
  error.stack = 'private\n    at secret (https://private.example/note:12:1)\n    at start (index.android.bundle:22:3)';
  const rejected = mockTracking.enable.mock.calls[0][0].onUnhandled;
  handler(error, true); rejected(1, error); sink.record('session_completed');
  expect(mockCrash.recordError).not.toHaveBeenCalled();
  expect(mockAnalytics.logEvent).not.toHaveBeenCalled();
  await sink.setConsent(true);
  sink.record('session_completed'); handler(error, true); rejected(2, error);
  expect(mockAnalytics.logEvent).toHaveBeenCalledWith(expect.anything(), 'session_completed', undefined);
  expect(mockCrash.recordError).toHaveBeenCalledTimes(2);
  expect(mockCrash.recordError.mock.calls[0][1].stack).toBe('Unhandled JavaScript error\n    at app (bundle:22:3)');
  expect(previous).toHaveBeenCalledWith(error, true);
  const off = sink.setConsent(false);
  handler(error); rejected(3, error); sink.record('session_completed');
  expect(mockCrash.recordError).toHaveBeenCalledTimes(2);
  await off;
  expect(mockCrash.deleteUnsentReports).toHaveBeenCalled();
  expect(mockAnalytics.resetAnalyticsData).toHaveBeenCalled();
  expect(mockAnalytics.setConsent).toHaveBeenLastCalledWith(expect.anything(), { analytics_storage: false, ad_storage: false, ad_user_data: false, ad_personalization: false });
  await sink.setConsent(true);
  expect(mockAnalytics.logEvent.mock.calls.filter(call => call[1] === 'app_open')).toHaveLength(1);
});

test("a failed analytics withdrawal still disables Crashlytics and clears pending reports", async () => {
  const sink = setup();
  await sink.setConsent(true);
  mockAnalytics.setConsent.mockImplementationOnce(() => { throw new Error('offline'); });
  await sink.setConsent(false);
  expect(sink.collectionReady).toBe(false);
  expect(mockCrash.setCrashlyticsCollectionEnabled).toHaveBeenLastCalledWith(expect.anything(), false);
  expect(mockCrash.deleteUnsentReports).toHaveBeenCalled();
  expect(mockAnalytics.resetAnalyticsData).toHaveBeenCalled();
  await sink.setConsent(false);
  expect(mockAnalytics.setConsent).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ analytics_storage: false }));
});

test("partial enable failures roll back both SDKs and preserve practice", async () => {
  const sink = setup();
  mockCrash.setCrashlyticsCollectionEnabled.mockRejectedValueOnce(new Error('SDK unavailable'));
  await sink.setConsent(true);
  expect(sink.collectionReady).toBe(false);
  expect(mockAnalytics.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(expect.anything(), false);
  expect(mockCrash.setCrashlyticsCollectionEnabled).toHaveBeenLastCalledWith(expect.anything(), false);
  expect(mockAnalytics.logEvent).not.toHaveBeenCalled();
});
