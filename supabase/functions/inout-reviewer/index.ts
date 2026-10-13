import { reviewerHandler } from "./handler";
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
Deno.serve(reviewerHandler(async (name, args) => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args), signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Reviewer database unavailable");
  return response.json();
}, () => ({ enabled: Deno.env.get("REVIEWER_ENABLED") === "true", codeHash: Deno.env.get("REVIEWER_CODE_SHA256") ?? "",
  codeExpiresAt: Date.parse(Deno.env.get("REVIEWER_CODE_EXPIRES_AT") ?? ""), generation: Deno.env.get("REVIEWER_GENERATION") ?? "" })));
