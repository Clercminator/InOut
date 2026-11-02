import { founderHandler } from "./handler.ts";
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
Deno.serve(founderHandler(async (action, data) => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/inout_founders`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_data: data }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("Database unavailable");
  return response.json();
}, () => ({ apiKey: Deno.env.get("FOUNDERS_REVENUECAT_API_KEY") ?? "", projectId: Deno.env.get("FOUNDERS_REVENUECAT_PROJECT_ID") ?? "", webhookToken: Deno.env.get("FOUNDERS_WEBHOOK_TOKEN") ?? "",
  sandboxCodeHash: Deno.env.get("FOUNDERS_SANDBOX_CODE_SHA256") ?? "", adminToken: Deno.env.get("FOUNDERS_ADMIN_TOKEN") ?? "" })));
