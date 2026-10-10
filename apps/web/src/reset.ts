import { resolveSharedLink } from "../../../packages/sharing/src/client";
import sharingConfig from "../../../release/sharing.json";
import links from "../../../release/links.json";
declare const __IOS_STORE_URL__: string;
declare const __ANDROID_STORE_URL__: string;
import { t, localizePage } from "./messages";
import { sharedProtocol } from "@inout/sharing";
import { start, pause, resume, snapshot, totalDuration, createClock } from "@inout/breathing-engine";
import type { EngineState } from "@inout/shared-types";
import { AnalyticsService } from "../../mobile/src/analytics";
localizePage();
const analytics = new AnalyticsService();
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = element("status"), cue = element("cue"), timer = element("timer"), guide = element("guide");
const play = element<HTMLButtonElement>("play"), stop = element<HTMLButtonElement>("stop"), again = element<HTMLButtonElement>("again");
const clock = createClock(Date.now, () => performance.now());
let state: EngineState | null = null;
let completed = false;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const format = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
async function load() {
try {
  status.textContent = t("Loading exercise…");
  const id = new URLSearchParams(location.search).get("s") ?? "";
  const shared = await resolveSharedLink(sharingConfig.apiUrl, id);
  status.textContent = t("Choose Start practice when you are in a safe place.");
  const protocol = sharedProtocol(shared), plan = protocol.plan!;
  analytics.track("shared_web_opened");
  element("length").textContent = `${format(totalDuration(plan))} · ${t("Shared breathing practice")}`;
  const native = element<HTMLAnchorElement>("native");
  native.href = `inout://shared?id=${id}`;
  element("next").hidden = false;
  native.addEventListener("click", () => analytics.track("shared_web_app_open_clicked"));
  for (const [label, href, host] of [["App Store", __IOS_STORE_URL__ || links.iosStoreUrl, "apps.apple.com"], ["Google Play", __ANDROID_STORE_URL__ || links.androidStoreUrl, "play.google.com"]]) {
    if (!href) continue;
    const url = new URL(href);
    if (url.protocol !== "https:" || url.hostname !== host) continue;
    const link = document.createElement("a"); link.textContent = label; link.href = url.href; link.rel = "noopener";
    element("next").append(link);
  }
  play.disabled = false;
  function render() {
    if (!state) return;
    const view = snapshot(state, clock.now());
    if (view.completed && !completed) {
      completed = true; state = pause(state, clock.now());
      analytics.track("shared_web_completed");
      status.textContent = t("Practice complete. Return to your natural breathing.");
      cue.textContent = t("Well done"); play.hidden = true; stop.hidden = true; again.hidden = false;
      element("next").hidden = false; guide.style.transform = "scale(1)";
    } else if (!completed) {
      const running = state.status === "running";
      const label = running ? t(view.phase.label) + (view.phase.nostril && view.phase.nostril !== "both" ? ` · ${t(`${view.phase.nostril} nostril`)}` : "") : t("Breathe naturally");
      if (cue.textContent !== label) cue.textContent = label;
      const progress = view.phaseElapsedMs / Math.max(1, view.phase.durationMs);
      const size = view.phase.type === "inhale" || view.phase.type === "inhaleTopUp" ? 0.65 + progress * 0.35
        : view.phase.type === "exhale" || view.phase.type === "hum" ? 1 - progress * 0.35 : 1;
      guide.style.transform = reduced.matches || !running ? "scale(1)" : `scale(${size})`;
    }
    timer.textContent = format(view.sessionRemainingMs);
    element<HTMLProgressElement>("progress").value = view.sessionElapsedMs / totalDuration(plan);
  }
  play.addEventListener("click", () => {
    if (!state) { state = start(plan, clock.now()); analytics.track("shared_web_started"); guide.closest("section")?.scrollIntoView({ block: "start", behavior: "auto" }); }
    else if (state.status === "running") state = pause(state, clock.now());
    else state = resume(state, clock.now());
    const running = state.status === "running";
    play.textContent = running ? t("Pause") : t("Resume"); stop.hidden = false;
    status.textContent = running ? t("Follow gently. Stop whenever you need to.") : t("Paused. Breathe naturally; resume when ready.");
    render();
  });
  stop.addEventListener("click", () => {
    if (state) state = pause(state, clock.now());
    play.hidden = true; stop.hidden = true; again.hidden = false;
    status.textContent = t("Stopped. Breathe naturally and rest somewhere safe.");
    cue.textContent = t("Breathe naturally"); guide.style.transform = "scale(1)";
    state = null;
  });
  again.addEventListener("click", () => {
    state = null; completed = false; element("next").hidden = true;
    play.hidden = false; play.textContent = t("Start practice"); stop.hidden = true; again.hidden = true;
    cue.textContent = t("Ready when you are"); timer.textContent = format(totalDuration(plan));
    status.textContent = t("Choose Start practice when you are in a safe place.");
    element<HTMLProgressElement>("progress").value = 0;
  });
  const interrupt = () => {
    if (state?.status === "running") {
      state = pause(state, clock.now(), "background"); play.textContent = t("Resume");
      status.textContent = t("Paused after leaving this page. Breathe naturally, then resume when ready."); render();
    }
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden) interrupt(); });
  window.addEventListener("pagehide", interrupt);
  timer.textContent = format(totalDuration(plan));
  setInterval(() => { if (state?.status === "running") render(); }, 50);
} catch (error) {
  status.textContent = error instanceof Error ? t(error.message) : t("Exercise unavailable");
  cue.textContent = t("Exercise unavailable"); element("next").hidden = true;
}

}
void load();
