import { shareHandler } from "./handler";
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
Deno.serve(shareHandler(async (name, args) => {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(args), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Database request failed");
  return response.json();
}));
