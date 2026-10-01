import { ShareLinksService } from "./share-links";
import { ShareLinksContext } from "./share-links-context";
import { sharingRequest } from "../../../packages/sharing/src/client";
import sharingConfig from "../../../release/sharing.json";
import { useLanguage } from "./use-language";
import React, {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import { randomUUID, digestStringAsync, CryptoDigestAlgorithm } from "expo-crypto";
import { createClock } from "@inout/breathing-engine";
import { SessionController } from "./session-controller";
import { LocalStore } from "./storage";
import { NativeSessionEffects } from "./session-effects";
import { SessionContext, useSession } from "./session-context";
import { Screen, Title, Copy, Button } from "./ui";
import { createCommercialServices } from "./commercial";
import { CommercialContext, type CommercialServices } from "./commercial-context";
import { ThemeProvider } from "./theme";
import { ExperienceProvider } from "./experience-context";
import { experienceFor } from "./experience";
import { ReminderService } from "./reminders";
import { nativeReminderAdapter } from "./reminder-native";
import { ReminderContext, ReminderEffects } from "./reminder-context";

export function SessionProvider({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);
  const [controller, setController] = useState<SessionController | null>(null);
  const [failure, setFailure] = useState(false);
  const [commercial, setCommercial] = useState<CommercialServices | null>(null);
  const [shares, setShares] = useState<ShareLinksService | null>(null);
  const [reminders, setReminders] = useState<ReminderService | null>(null);
  useEffect(() => {
    try {
      const store = new LocalStore(SQLite.openDatabaseSync("inout.db"));
      const clock = createClock(Date.now, () => performance.now());
      const services = createCommercialServices(store);
      setCommercial(services);
      const sessionController = new SessionController(store, clock.now, randomUUID, services.entitlements, services.analytics);
      setController(sessionController);
      const reminderService = new ReminderService({ read: () => store.readReminders(), write: items => store.writeReminders(items) },
        nativeReminderAdapter(), () => services.entitlements.has("advancedReminders"), () => experienceFor(sessionController.preferences).rituals.map(r => r.id));
      const shareService = new ShareLinksService({ read: () => store.readShareLinks(), write: items => store.writeShareLinks(items) }, {
        identity: async () => {
          const secret = (randomUUID() + randomUUID()).replaceAll("-", ""), createdAt = Date.now();
          const id = (await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${createdAt}:${secret}`)).slice(0, 32);
          return { id, secret, createdAt };
        },
        create: async item => {
          const response = await sharingRequest(sharingConfig.apiUrl, "", { method: "POST", body: JSON.stringify({ secret: item.secret, createdAt: item.createdAt, snapshot: item.snapshot }) });
          return { id: response.id, expiresAt: Date.parse(response.expiresAt) };
        },
        revoke: async item => { await sharingRequest(sharingConfig.apiUrl, item.id, { method: "DELETE", body: JSON.stringify({ secret: item.secret, createdAt: item.createdAt }) }); },
      });
      setShares(shareService);
      sessionController.canResetLocalData = () => !shareService.busy && !reminderService.busy;
      sessionController.onLocalDataReset = () => { reminderService.invalidate(); shareService.reload(); void services.reviewer?.clear().catch(() => {}); };
      setReminders(reminderService);
      setFailure(false);
    } catch {
      setFailure(true);
    }
  }, [attempt]);
  useEffect(() => {
    if (!commercial || !controller) return;
    const unsubscribe = commercial.entitlements.subscribe(controller.entitlementsChanged);
    const unsubscribeStore = commercial.subscriptions.listen();
    void commercial.reviewer?.refresh();
    if (commercial.subscriptions.adapter.mode !== "unavailable") void commercial.subscriptions.load();
    commercial.analytics.track("app_open");
    const timer = setInterval(commercial.entitlements.checkExpiry, 1000);
    const checkpointTimer = setInterval(() => { void commercial.reviewer?.checkpoint(); }, 30000);
    const reviewerTimer = setInterval(() => { void commercial.reviewer?.refresh(); }, 15 * 60000);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        commercial.entitlements.refresh();
        void commercial.reviewer?.refresh();
        if (commercial.subscriptions.adapter.mode === "store") void commercial.subscriptions.load();
      }
    });
    return () => { unsubscribe(); unsubscribeStore(); foreground.remove(); clearInterval(timer); clearInterval(reviewerTimer); clearInterval(checkpointTimer); };
  }, [commercial, controller]);
  useEffect(() => {
    if (!controller) return;
    const state = AppState.addEventListener("change", (next) => {
      if (next !== "active") controller.pause("background");
    });
    const blur =
      Platform.OS === "android"
        ? AppState.addEventListener("blur", () =>
            controller.pause("interruption"),
          )
        : null;
    return () => {
      state.remove();
      blur?.remove();
      controller.pause("background");
    };
  }, [controller]);
  if (!controller)
    return (
      <Screen>
        <Title>IN/OUT</Title>
        <Copy>
          {failure
            ? "Your local data could not be opened. It has been preserved."
            : "Getting ready."}
        </Copy>
        {failure && (
          <Button title="Retry" onPress={() => setAttempt((n) => n + 1)} />
        )}
      </Screen>
    );
  return (
    <SessionContext.Provider value={controller}>
      <ExperienceProvider>
      <SavedTheme>
      <CommercialContext.Provider value={commercial}>
      <ShareLinksContext.Provider value={shares}>
      <ReminderContext.Provider value={reminders}>
      <ReminderEffects />
      <NativeSessionEffects />
      {children}
      </ReminderContext.Provider>
      </ShareLinksContext.Provider>
      </CommercialContext.Provider>
      </SavedTheme>
      </ExperienceProvider>
    </SessionContext.Provider>
  );
}
export { useSession } from "./session-context";
export function SaveError() {
  useLanguage();
  const controller = useSession();
  return controller.error ? (
    <>
      <Copy accessibilityRole="alert">{controller.error}</Copy>
      <Button title="Retry saving" onPress={() => controller.retry()} />
    </>
  ) : null;
}

function SavedTheme({ children }: PropsWithChildren) {
  const { preferences } = useSession();
  return <ThemeProvider preference={preferences.theme}>{children}</ThemeProvider>;
}
