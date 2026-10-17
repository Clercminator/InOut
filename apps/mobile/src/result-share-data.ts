import type { SessionRecord } from "@inout/shared-types";
import { stateShift } from "@inout/shared-types";
import { recordTitle, t, getLanguage, countLabel } from "./i18n";
import { snapshot } from "@inout/breathing-engine";
import { practiceDuration } from "./format";
import links from "../../../release/links.json";

export function resultShareData(record: SessionRecord, includeRating = false) {
  const shift = stateShift(record.pre, record.post);
  const cycles = snapshot(record.engine, record.engine.anchorAt).completedCycles;
  const status = t(record.endReason === "completed" ? "SESSION COMPLETE" : "SESSION ENDED");
  return {
    title: recordTitle(record), duration: practiceDuration(record.engine.elapsedAtAnchor),
    status: record.source !== "manual" && cycles > 0 ? `${status} · ${countLabel(cycles, "cycle")}` : status,
    measurement: includeRating && shift !== null ? `${record.pre} → ${record.post} · ${t("Self-reported tension · 1–10")}` : null,
    invitation: `${links.origin}/?lang=${getLanguage()}`,
  };
}
