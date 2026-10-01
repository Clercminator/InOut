import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { shareHandler, hashSecret } from "../supabase/functions/inout-shares/handler";
import { ShareLinksService, type ManagedShare } from "../apps/mobile/src/share-links";
import type { SharedPractice } from "../packages/sharing/src/index";

const snapshot: SharedPractice = { v: 1, blocks: [{ cycles: 1, phases: [["inhale", 1000], ["exhale", 1000]] }] };
test("hosted share lifecycle runs against Postgres with ownership, revocation, expiry, rate limits and denied public SQL", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await db.exec(readFileSync(new URL("../supabase/migrations/20260929161245_inout_revocable_sharing.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../supabase/migrations/20260929212852_inout_share_deny_client_policies.sql", import.meta.url), "utf8"));
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from inout_private.shares"), /permission denied/);
      await assert.rejects(db.query("select public.inout_resolve_share($1)", ["a".repeat(32)]), /permission denied/);
      await assert.rejects(db.query("select public.inout_create_share($1,$2,now(),$3)", ["a".repeat(32), "b".repeat(64), snapshot]), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const handler = shareHandler(async (name, args) => {
      assert.ok(["inout_create_share", "inout_resolve_share", "inout_revoke_share"].includes(name));
      const keys = Object.keys(args);
      const result = await db.query<{ value: unknown }>(`select public.${name}(${keys.map((key, i) => `${key} => $${i + 1}`).join(",")}) as value`, Object.values(args));
      return result.rows[0]?.value;
    });
    const request = (method: string, id = "", body?: object) => handler(new Request(`https://example.test/functions/v1/inout-shares${id ? `/${id}` : ""}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }));
    const createdAt = Date.now(), secret = "a".repeat(64);
    const created = await request("POST", "", { snapshot: { ...snapshot, privateName: "never store me" }, secret, createdAt });
    assert.equal(created.status, 201); const link = await created.json();
    assert.equal(link.id.length, 32); assert.equal(link.secret, undefined);
    const resolved = await request("GET", link.id); assert.equal(resolved.headers.get("Cache-Control"), "no-store, max-age=0");
    assert.deepEqual((await resolved.json()).snapshot, snapshot);
    assert.equal((await request("POST", "", { snapshot, secret, createdAt })).status, 200);
    assert.equal((await request("DELETE", link.id, { secret: "b".repeat(64), createdAt })).status, 404);
    assert.equal((await request("GET", link.id)).status, 200);
    assert.equal((await request("DELETE", link.id, { secret, createdAt })).status, 200);
    assert.equal((await request("GET", link.id)).status, 404);
    assert.equal((await request("POST", "", { snapshot, secret, createdAt })).status, 410);
    assert.equal((await request("DELETE", link.id, { secret, createdAt })).status, 200);
    const another = await (await request("POST", "", { snapshot, secret: "c".repeat(64), createdAt })).json();
    await db.query("update inout_private.shares set expires_at = now() - interval '1 second' where id = $1", [another.id]);
    assert.equal((await request("GET", another.id)).status, 404);
    await db.exec("update inout_private.share_limits set used=200");
    assert.equal((await request("POST", "", { snapshot, secret: "d".repeat(64), createdAt })).status, 429);
    assert.equal((await request("POST", "", { snapshot, secret, createdAt: createdAt - 86400000 })).status, 400);
    assert.equal((await request("POST", "", { snapshot: { v: 1, blocks: [] }, secret, createdAt })).status, 400);
    assert.equal((await request("POST", "", { payload: "x".repeat(17000) })).status, 413);
    assert.equal((await request("GET")).status, 404);
  } finally { await db.close(); }
});

test("uncertain creation retains management secret and retries idempotently; failed revoke never forgets controls", async () => {
  let disk: ManagedShare[] = [], failCreate = true, failRevoke = true, failWrite = false, calls = 0;
  const createdAt = Date.now(), secret = "e".repeat(64), id = (await hashSecret(`${createdAt}:${secret}`)).slice(0, 32);
  const adapter = {
    identity: async () => ({ id, secret, createdAt }),
    create: async (item: ManagedShare) => { calls++; assert.equal(disk[0].secret, secret); if (failCreate) throw Error("Network lost"); return { id: item.id, expiresAt: createdAt + 30 * 86400000 }; },
    revoke: async () => { if (failRevoke) throw Error("Offline"); },
  };
  const store = { read: () => disk, write: (items: ManagedShare[]) => { if (failWrite) throw Error("Disk full"); disk = items; } };
  const service = new ShareLinksService(store, adapter);
  assert.equal(await service.create(snapshot), null); assert.equal(disk[0].secret, secret); assert.ok(disk[0].snapshot);
  const restored = new ShareLinksService(store, adapter); failCreate = false;
  assert.equal((await restored.retry(id))?.id, id); assert.equal(disk[0].snapshot, undefined);
  assert.equal(await restored.revoke(id), false); assert.equal(disk.length, 1);
  failRevoke = false; failWrite = true; assert.equal(await restored.revoke(id), false); assert.equal(disk.length, 1);
  failWrite = false; assert.equal(await restored.revoke(id), true); assert.equal(disk.length, 0);
  failWrite = true; assert.equal(await restored.create(snapshot), null); assert.equal(calls, 2);
});
