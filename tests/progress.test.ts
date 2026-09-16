import test from "node:test";
import assert from "node:assert/strict";
import { periodRecords } from "../apps/mobile/src/progress";
import type { SessionRecord } from "../packages/shared-types/src/index";

test("progress periods include local calendar boundaries and exclude future records", () => {
  const now = new Date(2026, 8, 15, 12);
  const times = [new Date(2026, 8, 8, 23, 59), new Date(2026, 8, 9), now, new Date(2026, 8, 16)];
  const records = times.map((date, id) => ({ id: String(id), engine: { startedAt: date.getTime() } }) as SessionRecord);
  assert.deepEqual(periodRecords(records, 7, now).map((r) => r.id), ["1", "2"]);
  assert.deepEqual(periodRecords(records, 30, now).map((r) => r.id), ["0", "1", "2"]);
});
