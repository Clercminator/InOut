import { protocols } from "../../../packages/protocols/src/index";
import { shareSnapshot, validateShare, type SharedPractice } from "../../../packages/sharing/src/index";
import { resolveSharedLink } from "../../../packages/sharing/src/client";
import sharing from "../../../release/sharing.json";
import links from "../../../release/links.json";
import es from "../../mobile/src/locales/es.json";
import pt from "../../mobile/src/locales/pt.json";

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const copy = {
  en: ["Shared breathing practice", "Try this breathing practice with IN/OUT. Keep breaths comfortable; pause whenever you need to.", "Exercise unavailable"],
  es: ["Práctica de respiración compartida", "Prueba esta práctica de respiración con IN/OUT. Respira cómodamente y haz una pausa cuando lo necesites.", "Ejercicio no disponible"],
  pt: ["Prática de respiração compartilhada", "Experimente esta prática de respiração com IN/OUT. Respire confortavelmente e faça uma pausa quando precisar.", "Exercício indisponível"],
};
export function exerciseTitle(snapshot: SharedPractice, language: keyof typeof copy) {
  const value = validateShare(snapshot);
  // Match only public library cadence, never a user-supplied title or profile field.
  const protocol = protocols.find(p => {
    try { return JSON.stringify(shareSnapshot(p).blocks.map(b => b.phases)) === JSON.stringify(value.blocks.map(b => b.phases)); }
    catch { return false; }
  });
  if (!protocol) return copy[language][0];
  const catalog = language === "es" ? es : language === "pt" ? pt : {};
  return (catalog as Record<string, string>)[protocol.name] ?? protocol.name;
}
export async function sharedPage(request: Request, template: string, resolve = (id: string) => resolveSharedLink(sharing.apiUrl, id)) {
  const url = new URL(request.url), lang = url.searchParams.get("lang");
  const language = lang === "es" || lang === "pt" ? lang : "en";
  const id = url.searchParams.get("s");
  let title = copy[language][0], status = 200;
  if (id) {
    if (!/^[a-f0-9]{32}$/.test(id)) { title = copy[language][2]; status = 404; }
    else try { title = exerciseTitle(await resolve(id), language); }
    catch (error) { title = copy[language][2]; status = error instanceof Error && /expired|revoked/.test(error.message) ? 410 : 503; }
  }
  const canonical = new URL(links.path, links.origin);
  if (id && /^[a-f0-9]{32}$/.test(id)) canonical.searchParams.set("s", id);
  canonical.searchParams.set("lang", language);
  const description = status === 200 ? copy[language][1] : copy[language][2];
  const image = `${links.origin}/exercise-og-background.png`;
  const meta = `<meta name="description" content="${escape(description)}"><meta name="robots" content="noindex"><link rel="canonical" href="${escape(canonical.href)}"><meta property="og:title" content="${escape(title)} · IN/OUT"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="${{ en: "en_US", es: "es_419", pt: "pt_BR" }[language]}"><meta property="og:url" content="${escape(canonical.href)}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${image}">`;
  const html = template.replace(/<!--SHARE_META_START-->[\s\S]*?<!--SHARE_META_END-->/, meta)
    .replace('<html lang="en">', `<html lang="${language}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)} · IN/OUT</title>`);
  return new Response(request.method === "HEAD" ? null : html, { status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
}
