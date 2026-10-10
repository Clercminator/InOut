import { createContext, useContext, useSyncExternalStore, useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { ReminderService } from "./reminders";
import { notifications } from "./reminder-native";
import { useSession } from "./session-context";
import { experienceFor } from "./experience";
export const ReminderContext = createContext<ReminderService | null>(null);
const subscribe = () => () => {};
const revision = () => 0;
export function useReminders() {
  const service = useContext(ReminderContext);
  useSyncExternalStore(service?.subscribe ?? subscribe, service?.getRevision ?? revision, revision);
  return service;
}
export function ReminderEffects() {
  const service = useContext(ReminderContext);
  const controller = useSession();
  const preferences = controller.preferences;
  useEffect(() => { void service?.reconcile(); }, [service, preferences]);
  useEffect(() => {
    const sdk = notifications();
    if (!sdk || !service) return;
    sdk.setNotificationHandler({ handleNotification: async () => ({
      shouldPlaySound: false, shouldSetBadge: false,
      shouldShowBanner: controller.current?.stage !== "active" && controller.current?.stage !== "post",
      shouldShowList: controller.current?.stage !== "active" && controller.current?.stage !== "post",
    }) });
    const handled = new Set<string>();
    const open = (response: import("expo-notifications").NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== sdk.DEFAULT_ACTION_IDENTIFIER) return;
      const responseId = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handled.has(responseId)) return;
      handled.add(responseId);
      const id = response.notification.request.content.data?.reminderId;
      const reminder = service.items.find(r => r.id === id && r.enabled);
      void sdk.clearLastNotificationResponseAsync().catch(() => {});
      if (!reminder) return;
      if (controller.current?.stage === "active") { router.push("/session"); return; }
      if (controller.current?.stage === "post") { router.push("/post"); return; }
      if (!controller.preferences.onboardingComplete) { router.push("/onboarding"); return; }
      const ritual = experienceFor(controller.preferences).rituals.find(r => r.id === reminder.ritualId);
      if (reminder.ritualId && !ritual) { router.push("/reminders"); return; }
      router.push(ritual ? { pathname: "/pre", params: { ritualId: ritual.id } } : "/pre");
    };
    const listener = sdk.addNotificationResponseReceivedListener(open);
    let mounted = true;
    void sdk.getLastNotificationResponseAsync().then(response => { if (mounted) open(response); }).catch(() => {});
    const foreground = AppState.addEventListener("change", state => { if (state === "active") void service.reconcile(); });
    return () => { mounted = false; listener.remove(); foreground.remove(); sdk.setNotificationHandler(null); };
  }, [controller, service]);
  return null;
}
