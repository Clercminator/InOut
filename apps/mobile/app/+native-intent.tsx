import links from "../../../release/links.json";
/** Verified HTTPS shares reuse the same validated native route as custom-scheme links. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path);
    if (links.origin && url.origin === links.origin && url.pathname === links.path) {
      const id = url.searchParams.get("s");
      return id && /^[a-f0-9]{32}$/.test(id) ? `/shared?id=${id}` : "/shared";
    }
    return path;
  } catch { return path; }
}
