import { validateShare } from "./index";
export async function sharingRequest(api: string, id = "", options: RequestInit = {}) {
  if (!/^https:\/\//.test(api)) throw Error("Exercise sharing is not available online yet. Please try again later.");
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${api.replace(/\/$/, "")}${id ? `/${id}` : ""}`, { ...options, cache: "no-store", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }, signal: controller.signal });
    if (response.status === 429) throw Error("Too many links were created recently. Please try again later.");
    if (response.status === 404 || response.status === 410) throw Error("This link has expired or been revoked.");
    if (!response.ok) throw Error("Sharing is temporarily unavailable. Please try again online.");
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === "AbortError")) throw Error("Sharing is temporarily unavailable. Please try again online.");
    throw error;
  } finally { clearTimeout(timeout); }
}
export async function resolveSharedLink(api: string, id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) throw Error("This exercise link is invalid or unsupported.");
  const result = await sharingRequest(api, id);
  const expiresAt = Date.parse(result.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw Error("This link has expired or been revoked.");
  return validateShare(result.snapshot);
}
