export type Rpc = (name: string, args: Record<string, unknown>) => Promise<any>;
export interface ReviewerConfig { enabled: boolean; codeHash: string; codeExpiresAt: number; generation: string; }
export const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join("");
function equalHash(a: string, b: string) {
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < 64; i++) mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return mismatch === 0;
}
const reply = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
export function reviewerHandler(rpc: Rpc, config: () => ReviewerConfig, now = Date.now) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, { error: "Unavailable" });
    try {
      // Bound streamed bodies even when Content-Length is absent or dishonest.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "Invalid request" });
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length;
        if (size > 2048) { await reader.cancel(); return reply(413, { error: "Invalid request" }); } chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let body: any;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400, { error: "Invalid request" }); }
      if (!body || !/^[a-f0-9-]{36}$/.test(body.installationId) || !["redeem", "validate"].includes(body.action)) return reply(400, { error: "Invalid request" });
      const installationHash = await sha256(body.installationId);
      if (!await rpc("inout_reviewer_rate", { p_installation: installationHash, p_action: body.action })) return reply(429, { error: "Try later" });
      const c = config(), time = now();
      if (!c.enabled || !/^[a-f0-9]{64}$/.test(c.codeHash) || !c.generation || !Number.isFinite(c.codeExpiresAt) || c.codeExpiresAt <= time) return reply(403, { error: "Invalid review access" });
      if (body.action === "redeem") {
        if (typeof body.code !== "string" || body.code.length > 128 || !equalHash(await sha256(body.code.trim()), c.codeHash)) return reply(403, { error: "Invalid review access" });
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
        const expiresAt = Math.min(c.codeExpiresAt, time + 7 * 86400000);
        await rpc("inout_reviewer_issue", { p_token: await sha256(token), p_installation: installationHash, p_generation: c.generation, p_expires: new Date(expiresAt).toISOString() });
        return reply(200, { token, expiresAt, serverTime: time });
      }
      if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return reply(403, { error: "Invalid review access" });
      const result = await rpc("inout_reviewer_validate", { p_token: await sha256(body.token), p_installation: installationHash, p_generation: c.generation });
      const expiresAt = Math.min(Date.parse(result?.expiresAt), c.codeExpiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= time) return reply(403, { error: "Invalid review access" });
      return reply(200, { token: body.token, expiresAt, serverTime: time });
    } catch { return reply(503, { error: "Reviewer service unavailable" }); }
  };
}
