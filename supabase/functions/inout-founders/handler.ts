type Rpc = (action: string, data: Record<string, unknown>) => Promise<any>;
export interface FounderConfig { apiKey: string; projectId: string; webhookToken: string; sandboxCodeHash: string; adminToken: string; }
const products: Record<string, string> = { PLAY_STORE: "inout_pro_lifetime", APP_STORE: "com.imrtech.inout.pro.lifetime" };
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), b => b.toString(16).padStart(2, "0")).join("");
async function equal(a: string, b: string) {
  if (!b || b.length < 32) return false;
  const x = await hash(a), y = await hash(b); let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
const reply = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const identifier = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200 && !/[\u0000-\u001f]/.test(v);
const list = (value: any) => Array.isArray(value?.items) ? value.items : [];
const productIdentifiers = (purchase: any) => list(purchase?.entitlements).flatMap((entitlement: any) =>
  entitlement?.lookup_key === "in_out_pro" && entitlement?.state === "active"
    ? list(entitlement?.products).filter((product: any) => product?.state === "active").map((product: any) => product?.store_identifier)
    : []);
async function revenueCatGet(fetcher: typeof fetch, config: FounderConfig, path: string) {
  const response = await fetcher(`https://api.revenuecat.com${path}`, {
    headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("verification_unavailable");
  return response.json();
}
async function revenueCatPages(fetcher: typeof fetch, config: FounderConfig, path: string) {
  const items: any[] = [];
  for (let page = 0; page < 20 && path; page++) {
    const body = await revenueCatGet(fetcher, config, path);
    if (body?.object !== "list" || !Array.isArray(body.items)) throw Error("verification_unavailable");
    items.push(...body.items);
    const next = body.next_page;
    if (next === null || next === undefined || next === "") return items;
    if (typeof next !== "string" || !next.startsWith(`/v2/projects/${encodeURIComponent(config.projectId)}/`)) throw Error("verification_unavailable");
    path = next;
  }
  if (path) throw Error("verification_unavailable");
  return items;
}
async function revenueCatCustomer(fetcher: typeof fetch, config: FounderConfig, appUserId: string) {
  const project = encodeURIComponent(config.projectId);
  const matches = await revenueCatPages(fetcher, config, `/v2/projects/${project}/customers?limit=100&search=${encodeURIComponent(appUserId)}`);
  if (matches.length !== 1 || !identifier(matches[0]?.id)) throw Error("verification_unavailable");
  const customerId = matches[0].id as string;
  const aliases = await revenueCatPages(fetcher, config, `/v2/projects/${project}/customers/${encodeURIComponent(customerId)}/aliases?limit=100`);
  if (customerId !== appUserId && !aliases.some((alias: any) => alias?.id === appUserId)) throw Error("verification_unavailable");
  const [purchases, subscriptions] = await Promise.all([
    revenueCatPages(fetcher, config, `/v2/projects/${project}/customers/${encodeURIComponent(customerId)}/purchases?limit=100`),
    revenueCatPages(fetcher, config, `/v2/projects/${project}/customers/${encodeURIComponent(customerId)}/subscriptions?limit=100`),
  ]);
  return { customerId, aliases: aliases.map((alias: any) => alias?.id).filter(identifier).slice(0, 100), purchases, subscriptions };
}
async function bodyOf(req: Request) {
  const reader = req.body?.getReader(); if (!reader) throw Error("body");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length;
    if (size > 65536) { await reader.cancel(); throw Error("body"); } chunks.push(part.value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function founderHandler(rpc: Rpc, config: () => FounderConfig, fetcher: typeof fetch = fetch) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return reply(405, { error: "unavailable" });
    try {
      const c = config();
      const url = new URL(req.url);
      const authorization = req.headers.get("authorization") ?? "";
      if (url.pathname.endsWith("/webhook")) {
        if (!await equal(authorization, c.webhookToken ? `Bearer ${c.webhookToken}` : "")) return reply(401, { error: "unauthorized" });
        const { event: e } = await bodyOf(req);
        if (!e || !identifier(e.id)) return reply(400, { error: "invalid_event" });
        if (e.type === "TEST") return reply(200, { received: true });
        if (!Object.keys(products).includes(e.store) || e.product_id !== products[e.store] || e.is_family_share === true ||
          !["NON_RENEWING_PURCHASE", "CANCELLATION", "EXPIRATION", "REFUND_REVERSED"].includes(e.type)) return reply(200, { ignored: true });
        if (!["PRODUCTION", "SANDBOX"].includes(e.environment) || !identifier(e.transaction_id) || !identifier(e.app_user_id) ||
          !Number.isSafeInteger(e.purchased_at_ms) || !Number.isSafeInteger(e.event_timestamp_ms) || e.purchased_at_ms <= 0 || e.event_timestamp_ms <= 0)
          return reply(400, { error: "invalid_event" });
        // Shared Pro association is mandatory for new purchases; revocations still apply if later detached.
        if (e.type === "NON_RENEWING_PURCHASE" && !e.entitlement_ids?.includes("in_out_pro")) return reply(422, { error: "missing_pro_entitlement" });
        const result = await rpc("event", {
          environment: e.environment.toLowerCase(), store: e.store, transactionId: e.transaction_id, productId: e.product_id,
          customerId: e.app_user_id, aliases: Array.isArray(e.aliases) ? e.aliases.filter(identifier).slice(0,100) : [],
          purchasedAt: new Date(e.purchased_at_ms).toISOString(), eventAt: new Date(e.event_timestamp_ms).toISOString(), eventId: e.id,
          state: e.type === "CANCELLATION" ? "refunded" : e.type === "EXPIRATION" ? "revoked" : "purchased",
        });
        return reply(200, result);
      }
      const b = await bodyOf(req);
      if (url.pathname.endsWith("/admin")) {
        if (!await equal(authorization, c.adminToken ? `Bearer ${c.adminToken}` : "")) return reply(401, { error: "unauthorized" });
        if (!["production", "sandbox"].includes(b.environment) || !["status", "control"].includes(b.action)) return reply(400, { error: "invalid_request" });
        if (b.status === "active" && (!c.apiKey || !c.projectId || !c.webhookToken || (b.environment === "sandbox" && !c.sandboxCodeHash))) return reply(409, { error: "missing_secrets" });
        return reply(200, await rpc(b.action, b));
      }
      if (!identifier(b.customerId) || !["status", "reserve", "cancel", "reconcile"].includes(b.action)) return reply(400, { error: "invalid_request" });
      // IDs select purchase data; they are not login credentials. Return no customer or receipt data.
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (!await rpc("rate", { ip: await hash(ip), customer: await hash(b.customerId) })) return reply(429, { error: "try_later" });
      const sandbox = b.environment === "sandbox";
      const environment = sandbox ? "sandbox" : "production";
      if (b.action !== "reconcile" && sandbox && (!c.sandboxCodeHash || !await equal(await hash(String(b.code ?? "")), c.sandboxCodeHash))) return reply(403, { error: "invalid_test_access" });
      if (b.action === "status") {
        const status = await rpc("status", { environment });
        return reply(200, { status: status.status, allowed: status.allowed && !!c.apiKey && !!c.projectId && !!c.webhookToken, environment });
      }
      if (b.action === "cancel") {
        if (typeof b.token !== "string" || !/^[a-f0-9]{64}$/.test(b.token)) return reply(400, { error: "invalid_request" });
        await rpc("cancel", { environment, customerId: b.customerId, tokenHash: await hash(b.token) });
        return reply(200, { cancelled: true });
      }
      if (!c.apiKey || !c.projectId || !c.webhookToken) return reply(503, { error: "unavailable" });
      const customer = await revenueCatCustomer(fetcher, c, b.customerId);
      const lifetimePurchases = customer.purchases.filter((purchase: any) =>
        ["production", "sandbox"].includes(purchase?.environment) && ["app_store", "play_store"].includes(purchase?.store) &&
        identifier(String(purchase?.store_purchase_identifier ?? "")) && Number.isFinite(purchase?.purchased_at) &&
        productIdentifiers(purchase).includes(products[purchase.store === "app_store" ? "APP_STORE" : "PLAY_STORE"]));
      const ownedLifetime = lifetimePurchases.filter((purchase: any) => purchase.status === "owned" && purchase.ownership === "purchased");
      if (b.action === "reconcile") {
        for (const purchase of lifetimePurchases) {
          const purchasedAt = new Date(purchase.purchased_at).toISOString();
          const owned = purchase.status === "owned" && purchase.ownership === "purchased";
          await rpc("event", { environment: purchase.environment, store: purchase.store === "app_store" ? "APP_STORE" : "PLAY_STORE",
            transactionId: String(purchase.store_purchase_identifier), productId: products[purchase.store === "app_store" ? "APP_STORE" : "PLAY_STORE"],
            customerId: customer.customerId, aliases: customer.aliases,
            purchasedAt, eventAt: owned ? purchasedAt : new Date().toISOString(), eventId: `reconcile:v2:${purchase.id}:${purchase.status}`, state: owned ? "purchased" : "refunded" });
        }
        for (const env of ["production", "sandbox"]) {
          const purchases = ownedLifetime.filter((purchase: any) => purchase.environment === env).map((purchase: any) => ({
            store: purchase.store === "app_store" ? "APP_STORE" : "PLAY_STORE", transactionId: String(purchase.store_purchase_identifier),
          }));
          if (purchases.length && (await rpc("lookup", { environment: env, purchases })).founder) return reply(200, { founder: true, environment: env });
        }
        return reply(200, { founder: false, pending: true });
      }
      if (ownedLifetime.length) return reply(409, { error: "already_owned" });
      if (customer.subscriptions.some((subscription: any) => subscription?.gives_access === true))
        return reply(409, { error: "active_subscription" });
      if (!["android","ios"].includes(b.platform) || typeof b.token !== "string" || !/^[a-f0-9]{64}$/.test(b.token)) return reply(400, { error: "invalid_request" });
      return reply(200, await rpc("reserve", { environment, customerId: b.customerId, platform: b.platform, tokenHash: await hash(b.token) }));
    } catch { return reply(503, { error: "unavailable" }); }
  };
}
