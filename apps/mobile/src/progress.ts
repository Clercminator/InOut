import type { SessionRecord } from "@inout/shared-types";

export function periodRecords(records: SessionRecord[], days: number, now = new Date()) {
  const first = new Date(now);
  first.setHours(0, 0, 0, 0);
  first.setDate(first.getDate() - days + 1);
  return records.filter((record) => record.engine.startedAt >= first.getTime() && record.engine.startedAt <= now.getTime());
}
