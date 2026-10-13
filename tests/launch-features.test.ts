import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { ReminderService, reminderPrefix, type Reminder } from "../apps/mobile/src/reminders";
import { practiceInsights } from "../apps/mobile/src/insights";
import { manualSession } from "../apps/mobile/src/manual-session";
import { encodeShare, decodeShare, shareSnapshot, sharedProtocol, validateShare } from "../packages/sharing/src/index";
import { protocols, cyclic, planFor } from "../packages/protocols/src/index";
import { totalDuration } from "../packages/breathing-engine/src/index";

const reminder = (id = "a"): Reminder => ({ id, label: "Private ritual", hour: 8, minute: 30, weekdays: [2, 4, 6], enabled: true });
function reminders() {
  let disk: Reminder[] = [], pro = false, allowed = true, readFails = false, writeFails = false, scheduleFails = false;
  const scheduled = new Set<string>(["other-notification"]), permissions: boolean[] = [];
  const adapter = {
    permission: async (request: boolean) => { permissions.push(request); return allowed; },
    list: async () => [...scheduled],
    cancel: async (id: string) => { scheduled.delete(id); },
    schedule: async (id: string) => { if (scheduleFails && id.endsWith(":4")) throw Error("OS schedule failed"); scheduled.add(id); },
  };
  const service = new ReminderService({ read: () => { if (readFails) throw Error("Read failed"); return disk; }, write: items => { if (writeFails) throw Error("Disk full"); disk = items; } }, adapter, () => pro, () => ["existing"]);
  return { service, adapter, scheduled, permissions, disk: () => disk, set: (options: { pro?: boolean; allowed?: boolean; readFails?: boolean; writeFails?: boolean; scheduleFails?: boolean; disk?: Reminder[] }) => {
    pro = options.pro ?? pro; allowed = options.allowed ?? allowed; readFails = options.readFails ?? readFails; writeFails = options.writeFails ?? writeFails; scheduleFails = options.scheduleFails ?? scheduleFails; disk = options.disk ?? disk;
  } };
}
test("reminders request permission contextually, honor quota, and allow editing after downgrade", async () => {
  const f = reminders(); await f.service.reconcile(); assert.deepEqual(f.permissions, []);
  assert.equal(await f.service.save(reminder()), true); assert.deepEqual(f.permissions, [true, false]);
  assert.equal(f.scheduled.size, 4); assert.equal(await f.service.save(reminder("b")), false);
  f.set({ pro: true }); assert.equal(await f.service.save(reminder("b")), true);
  f.set({ pro: false }); assert.equal(await f.service.save({ ...reminder("b"), enabled: false }), true);
  assert.equal(await f.service.remove("a"), true); assert.deepEqual([...f.scheduled], ["other-notification"]);
});
test("denied permissions and failed storage preserve prior reminder data and schedules", async () => {
  const f = reminders(); await f.service.save(reminder()); const previous = [...f.scheduled];
  f.set({ allowed: false }); assert.equal(await f.service.save({ ...reminder(), hour: 10 }), false); assert.equal(f.disk()[0].hour, 8);
  f.set({ allowed: true, writeFails: true }); assert.equal(await f.service.save({ ...reminder(), hour: 10 }), false);
  assert.deepEqual([...f.scheduled], previous);
  f.set({ writeFails: false, readFails: true }); await f.service.reconcile(); assert.equal(await f.service.remove("a"), false); assert.equal(f.disk().length, 1);
  f.set({ readFails: false }); await f.service.reconcile(); assert.equal(await f.service.remove("a"), true);
});
test("partial OS failure cleans up, retry is idempotent, and deleted rituals cannot notify", async () => {
  const f = reminders(); f.set({ scheduleFails: true }); assert.equal(await f.service.save(reminder()), false);
  assert.deepEqual([...f.scheduled], ["other-notification"]); assert.equal(f.disk().length, 1);
  f.set({ scheduleFails: false }); await f.service.reconcile(); await f.service.reconcile(); assert.equal(f.scheduled.size, 4);
  assert.equal(await f.service.save({ ...reminder(), ritualId: "deleted" }), true); assert.equal(f.scheduled.size, 1);
});
test("local reset invalidates a save waiting on system permission", async () => {
  const f = reminders(); let resolve!: (value: boolean) => void;
  f.adapter.permission = () => new Promise<boolean>(r => { resolve = r; });
  const saving = f.service.save(reminder()); f.set({ disk: [] }); f.service.invalidate(); resolve(true);
  assert.equal(await saving, false); await new Promise(r => setImmediate(r));
  assert.deepEqual(f.disk(), []); assert.equal([...f.scheduled].filter(id => id.startsWith(reminderPrefix)).length, 0);
});
test("sharing preserves every gentle protocol cadence and nostril instruction without private text", () => {
  for (const protocol of protocols.filter(p => p.id !== cyclic.id && p.availability === "enabled")) {
    const shared = shareSnapshot({ ...protocol, name: "My private name" });
    const encoded = encodeShare(shared); assert.equal(encoded.includes("private"), false);
    const rebuilt = sharedProtocol(decodeShare(encoded));
    assert.equal(totalDuration(planFor(rebuilt)), totalDuration(planFor(protocol)));
    assert.deepEqual(planFor(rebuilt).blocks.map(b => b.phases.map(p => [p.type, p.durationMs, p.nostril])), planFor(protocol).blocks.map(b => b.phases.map(p => [p.type, p.durationMs, p.nostril])));
  }
  assert.throws(() => shareSnapshot(cyclic));
});
test("untrusted links reject unsafe sizes, unsupported phases and invalid timings, and strip extra fields", () => {
  for (const value of ["%", "x".repeat(12001), encodeURIComponent('{"v":2}'), encodeURIComponent('{"v":1,"blocks":[]}')]) assert.throws(() => decodeShare(value));
  for (const phase of [["__proto__", 1000], ["inhale", -1], ["retention", 1000], ["exhale", 1000, "unknown"]]) assert.throws(() => validateShare({ v: 1, blocks: [{ cycles: 1, phases: [phase] }] }));
  assert.throws(() => validateShare({ v: 1, blocks: [{ cycles: 100, phases: [["inhale", 60000], ["exhale", 60000]] }] }));
  assert.deepEqual(validateShare({ v: 1, name: "secret", blocks: [{ cycles: 1, note: "secret", phases: [["exhale", 1000]] }] }), { v: 1, blocks: [{ cycles: 1, phases: [["exhale", 1000]] }] });
});
test("insights require five paired completed sessions over three days and separate changed cadences", () => {
  const now = new Date(2026, 8, 29, 12);
  const rows = [1, 1, 2, 2, 3].map((days, i) => {
    const r = manualSession({ goal: "Calm", startedAt: now.getTime() - days * 86400000, durationMs: 60000 }, String(i), now.getTime());
    return { ...r, source: "app" as const, pre: 7, post: [4, 5, 5, 8, 7][i], endReason: "completed" as const };
  });
  assert.equal(practiceInsights(rows.slice(0, 4), now).patterns[0].median, null);
  const insight = practiceInsights(rows, now).patterns[0];
  assert.equal(insight.median, 2); assert.deepEqual([insight.lower, insight.same, insight.higher], [3, 1, 1]);
  assert.equal(practiceInsights(rows.map(r => ({ ...r, engine: { ...r.engine, startedAt: rows[0].engine.startedAt } })), now).patterns[0].median, null);
  const changed = { ...rows[0], id: "changed", protocolVersion: 2 };
  const manual = { ...rows[0], id: "manual", source: "manual" as const };
  const ended = { ...rows[0], id: "ended", endReason: "ended" as const };
  const future = { ...rows[0], id: "future", engine: { ...rows[0].engine, startedAt: now.getTime() + 86400000 } };
  const result = practiceInsights([...rows, changed, manual, ended, future], now);
  assert.equal(result.patterns.length, 2); assert.equal(result.mostUsed?.sessions, 5); assert.equal(result.currentWeek.count, 8);
});
test("CommonJS URI decoder withstands long malformed input and native tooling retains UUID compatibility", () => {
  const result = spawnSync(process.execPath, ["-e", "const d=require('node:module').createRequire(require.resolve('query-string'))('decode-uri-component');const s='%41'.repeat(100000)+'%FF';if(d(s)!=='A'.repeat(100000)+'%FF')process.exit(1)"], { timeout: 4000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0);
  const require = createRequire(import.meta.url);
  assert.equal(require("query-string").parse("q=caf%C3%A9").q, "café");
  const project = require("xcode").project("unused"); project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[0-9A-F]{24}$/);
  const ngrokRequire = createRequire(require.resolve("@expo/ngrok/package.json"));
  assert.match(ngrokRequire("uuid").v4(), /^[0-9a-f-]{36}$/);
});
