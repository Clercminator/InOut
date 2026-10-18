import { createContext, useContext, useSyncExternalStore, useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { ReminderService } from "./reminders";
import { configureEngagementNotifications, notifications, scheduleAchievementNotification } from "./reminder-native";
import { useSession } from "./session-context";
import { experienceFor } from "./experience";
import { notificationContext, notificationPreferences } from "./local-notifications";
import { useCommercial } from "./commercial-context";
import { useRef } from "react";
export const ReminderContext = createContext<ReminderService | null>(null);
const subscribe = () => () => {};
const revision = () => 0;
export function useReminders() {
  const service = useContext(ReminderContext);
  useSyncExternalStore(service?.subscribe ?? subscribe, service?.getRevision ?? revision, revision);
  return service;
}
export function ReminderEffects() {
  const service = useReminders();
  const controller = useSession();
  const preferences = controller.preferences;
  const commercial = useCommercial();
  const entitlement = commercial?.entitlements ?? controller.entitlements;
  const remindersEnabled = !!service?.items.some(item => item.enabled) || notificationPreferences(preferences).dailyReset;
  const context = () => notificationContext(controller.history(), entitlement.state.pro, entitlement.billingReady,
    !!service?.items.some(item => item.enabled) || notificationPreferences(controller.preferences).dailyReset);
  const history = controller.history();
  const pro = entitlement.state.pro, billingReady = entitlement.billingReady;
  useEffect(() => { void service?.reconcile(); }, [service, preferences]);
  useEffect(() => {
    if (!service) return;
    void configureEngagementNotifications(preferences, false, context()).catch(() => {
      controller.analytics.track("notification_schedule_failed", { outcome: "failed", errorCategory: "scheduler" });
    });
  }, [service, preferences, controller, history, pro, billingReady, remindersEnabled]);
  const handledAwards = useRef(new Set<string>());
  useEffect(() => {
    const settings = notificationPreferences(preferences);
    if (!settings.achievements) return;
    const scheduleAwards = async () => {
      const completedPrograms = controller.coachState().enrollments.filter(item => item.status === "completed" && item.completed.at(-1)?.sessionId === controller.current?.id);
      const awards = [...controller.latestAwards, ...controller.pacerThemeNotice.map(id => ({ id: `theme-${id}` })),
        ...completedPrograms.map(item => ({ id: `coach-${item.id}` }))];
      for (const award of awards) {
        if (handledAwards.current.has(award.id)) continue;
        handledAwards.current.add(award.id);
        const current = notificationPreferences(controller.preferences);
        const at = await scheduleAchievementNotification(award.id, current);
        if (at === null) return;
        controller.setPreferences({ ...controller.preferences, notifications: {
          ...current,
          achievementNoticeLog: [...(current.achievementNoticeLog ?? []).filter(item => item.id !== award.id).slice(-99), { id: award.id, at }],
        } });
      }
    };
    void scheduleAwards().catch(() => {
        controller.analytics.track("notification_schedule_failed", { outcome: "failed", errorCategory: "scheduler" });
    });
  }, [controller, controller.latestAwards, controller.pacerThemeNotice, controller.current?.stage, preferences]);
  useEffect(() => {
    const sdk = notifications();
    if (!sdk || !service) return;
    sdk.setNotificationHandler({ handleNotification: async notification => ({
      shouldPlaySound: false, shouldSetBadge: false,
      shouldShowBanner: !(notification?.request.content.data?.notificationType === "promotion" && (controller.entitlements.state.pro || !controller.entitlements.billingReady)) && controller.current?.stage !== "active" && controller.current?.stage !== "post" && !controller.hasActiveChallenge?.(),
      shouldShowList: !(notification?.request.content.data?.notificationType === "promotion" && (controller.entitlements.state.pro || !controller.entitlements.billingReady)) && controller.current?.stage !== "active" && controller.current?.stage !== "post" && !controller.hasActiveChallenge?.(),
    }) });
    const handled = new Set<string>();
    const open = (response: import("expo-notifications").NotificationResponse | null) => {
      if (!response) return;
      const responseId = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handled.has(responseId)) return;
      handled.add(responseId);
      const notificationType = response.notification.request.content.data?.notificationType;
      void sdk.clearLastNotificationResponseAsync().catch(() => {});
      if (notificationType === "check-in" && response.actionIdentifier === "DISMISS_CHECK_IN") {
        controller.analytics.track("checkin_action", { outcome: "dismissed" });
        return;
      }
      if (controller.pendingFitness?.()) { router.push({ pathname: "/fitness-challenge", params: { id: controller.pendingFitness()!.challengeId } }); return; }
      if (notificationType === "check-in" && response.actionIdentifier === "LOG_PRACTICE") {
        controller.analytics.track("checkin_action", { outcome: "success" });
        if (controller.current?.stage === "active") { router.push("/session"); return; }
        if (controller.current?.stage === "post") { router.push("/post"); return; }
        router.push("/add-session");
        return;
      }
      if (response.actionIdentifier !== sdk.DEFAULT_ACTION_IDENTIFIER) return;
      const id = response.notification.request.content.data?.reminderId;
      const reminder = service.items.find(r => r.id === id && r.enabled);
      if (notificationType === "check-in") controller.analytics.track("checkin_notification_opened");
      else if (notificationType === "motivation") controller.analytics.track("motivation_notification_opened");
      else if (notificationType === "achievement") controller.analytics.track("achievement_notification_opened");
      if (notificationType === "daily-reset") {
        if (controller.current?.stage === "active") { router.push("/session"); return; }
        if (controller.current?.stage === "post") { router.push("/post"); return; }
        controller.analytics.track("reminder_opened");
        router.push("/daily-reset");
        return;
      }
      if (["check-in", "motivation", "education", "reengagement", "promotion", "achievement"].includes(String(notificationType))) {
        if (controller.current?.stage === "active") { router.push("/session"); return; }
        if (controller.current?.stage === "post") { router.push("/post"); return; }
        if (!controller.preferences.onboardingComplete) { router.push("/onboarding"); return; }
      }
      if (notificationType === "education") { router.push("/learn"); return; }
      if (notificationType === "reengagement") { router.push("/pre"); return; }
      if (notificationType === "promotion") {
        router.push(controller.entitlements.state.pro || !controller.entitlements.billingReady ? "/(tabs)" : { pathname: "/pro", params: { source: "notification" } }); return;
      }
      if (notificationType === "check-in") { router.push("/add-session"); return; }
      if (notificationType === "motivation") { router.push("/pre"); return; }
      if (notificationType === "achievement") { router.push("/(tabs)/progress"); return; }
      if (!reminder) return;
      controller.analytics.track("reminder_opened");
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
    const foreground = AppState.addEventListener("change", state => {
      if (state === "active") {
        void service.reconcile();
        void configureEngagementNotifications(controller.preferences, false, context(), true).catch(() => {
          controller.analytics.track("notification_schedule_failed", { outcome: "failed", errorCategory: "scheduler" });
        });
      }
    });
    return () => { mounted = false; listener.remove(); foreground.remove(); sdk.setNotificationHandler(null); };
  }, [controller, service]);
  return null;
}
