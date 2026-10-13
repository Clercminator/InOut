import { welcomeHandler, type EmailProvider } from "./handler.ts";
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const provider: EmailProvider = {
  async send(message, idempotencyKey) {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("WELCOME_RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(message), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error("Email provider unavailable");
    const body = await response.json(); if (typeof body.id !== "string") throw Error("Unverified provider response"); return body.id;
  },
};
Deno.serve(welcomeHandler(async (name, args) => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(args), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Error("Delivery storage unavailable");
  const text = await response.text(); return text ? JSON.parse(text) : null;
}, provider, () => ({ enabled: Deno.env.get("WELCOME_EMAIL_ENABLED") === "true" && !!Deno.env.get("WELCOME_RESEND_API_KEY"), from: Deno.env.get("WELCOME_EMAIL_FROM") ?? "", hashSalt: Deno.env.get("WELCOME_HASH_SALT") ?? "" })));
