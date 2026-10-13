import { validateShare } from "../../../packages/sharing/src/index";

const idPattern = /^[a-f0-9]{32}$/;
export const hashSecret = async (secret: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)))].map(b => b.toString(16).padStart(2, "0")).join("");
export function shareHandler(rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...(status === 429 ? { "Retry-After": "3600" } : {}) } });
  return async (request: Request) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      const segments = new URL(request.url).pathname.split("/").filter(Boolean);
      const last = segments.at(-1)!;
      if (request.method === "GET") {
        if (!idPattern.test(last)) return reply(404, { error: "unavailable" });
        const result = await rpc("inout_resolve_share", { p_id: last });
        return result ? reply(200, result) : reply(404, { error: "unavailable" });
      }
      if (!["POST", "DELETE"].includes(request.method)) return reply(405, { error: "method" });
      if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "content_type" });
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "body" });
      let size = 0, body = ""; const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 16000) { await reader.cancel(); return reply(413, { error: "size" }); }
        body += decoder.decode(value, { stream: true });
      }
      const input = JSON.parse(body + decoder.decode());
      if (!input || typeof input.secret !== "string" || !/^[a-f0-9]{64}$/.test(input.secret) || !Number.isSafeInteger(input.createdAt)) return reply(400, { error: "invalid" });
      const secretHash = await hashSecret(`${input.createdAt}:${input.secret}`), id = secretHash.slice(0, 32);
      if (request.method === "DELETE") {
        if (id !== last) return reply(404, { error: "unavailable" });
        // Idempotent: an already expired or removed record needs no further action.
        await rpc("inout_revoke_share", { p_id: id, p_secret_hash: secretHash });
        return reply(200, { revoked: true });
      }
      if (last !== "inout-shares") return reply(404, { error: "unavailable" });
      const snapshot = validateShare(input.snapshot);
      const result = await rpc("inout_create_share", { p_id: id, p_secret_hash: secretHash, p_created_at: new Date(input.createdAt).toISOString(), p_snapshot: snapshot }) as { status: number; expiresAt?: string };
      return reply(result.status, result.status < 300 ? { id, expiresAt: result.expiresAt } : { error: result.status === 429 ? "limit" : "unavailable" });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof RangeError || (error instanceof Error && error.message === "This exercise link is invalid or unsupported.")) return reply(400, { error: "invalid" });
      return reply(503, { error: "temporarily_unavailable" });
    }
  };
}
