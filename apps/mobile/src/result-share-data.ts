import type { SessionRecord } from "@inout/shared-types";
import { stateShift } from "@inout/shared-types";
import { recordTitle, t, getLanguage } from "./i18n";
import { practiceDuration } from "./format";
import links from "../../../release/links.json";

export function resultShareData(record: SessionRecord, includeRating = false) {
  const shift = stateShift(record.pre, record.post);
  return {
    title: recordTitle(record), duration: practiceDuration(record.engine.elapsedAtAnchor),
    status: t(record.endReason === "completed" ? "SESSION COMPLETE" : "SESSION ENDED"),
    measurement: includeRating && shift !== null ? `${record.pre} → ${record.post} · ${t("Self-reported tension · 1–10")}` : null,
    invitation: `${links.origin}/?lang=${getLanguage()}`,
  };
}
