export interface WelcomeInput { email: string; name: string; goal: string; language: "en" | "es" | "pt"; consent: true; installation: string }
export interface EmailMessage { from: string; to: string[]; subject: string; html: string; text: string }
export interface EmailProvider { send(message: EmailMessage, idempotencyKey: string): Promise<string> }
export type Rpc = (name: string, args: Record<string, unknown>) => Promise<any>;
export const firstProtocols: Record<string, string> = { stress: "extended-exhale", sleep: "coherent", focus: "box", performance: "diaphragmatic", energy: "equal", pressure: "box", learn: "diaphragmatic" };
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function validateWelcome(value: unknown): WelcomeInput {
  const v = value as WelcomeInput;
  if (!v || typeof v.email !== "string" || v.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v.email) ||
    typeof v.name !== "string" || v.name.length > 40 || !Object.hasOwn(firstProtocols, v.goal) || !["en", "es", "pt"].includes(v.language) || v.consent !== true || !/^[a-f0-9-]{36}$/.test(v.installation)) throw Error("Invalid welcome request");
  return { email: v.email.trim().toLowerCase(), name: v.name.trim(), goal: v.goal, language: v.language, consent: true, installation: v.installation };
}
export function welcomeTemplate(input: WelcomeInput, from: string): EmailMessage {
  const language = input.language;
  const goals = language === "es" ? ["encontrar calma", "prepararte para dormir", "concentrarte", "recuperarte", "empezar con energía", "prepararte para un momento exigente", "conocer tu respiración"] : language === "pt" ? ["encontrar calma", "se preparar para dormir", "se concentrar", "se recuperar", "começar com energia", "se preparar para um momento exigente", "conhecer sua respiração"] : ["find calm", "wind down for sleep", "focus", "recover", "begin with energy", "prepare for a demanding moment", "learn about your breathing"];
  const goal = goals[Object.keys(firstProtocols).indexOf(input.goal)];
  const url = `inout://pre?id=${encodeURIComponent(firstProtocols[input.goal])}`;
  const names: Record<string, string[]> = { "extended-exhale": ["Extended Exhale", "Exhalación prolongada", "Expiração prolongada"], coherent: ["Coherent Breathing", "Respiración coherente", "Respiração coerente"], box: ["Box Breathing", "Respiración en caja", "Respiração quadrada"], diaphragmatic: ["Diaphragmatic Breathing", "Respiración diafragmática", "Respiração diafragmática"], equal: ["Equal Breathing", "Respiración equilibrada", "Respiração equilibrada"] };
  const protocolName = names[firstProtocols[input.goal]][["en", "es", "pt"].indexOf(language)];
  const subject = language === "es" ? "Tu primera práctica de InOut está lista" : language === "pt" ? "Sua primeira prática no InOut está pronta" : "Your first InOut practice is ready";
  const greeting = language === "es" ? "Hola" : language === "pt" ? "Olá" : "Hi";
  const body = language === "es" ? `Elegiste ${goal}. Empieza con una práctica breve y cómoda. Tu ritmo recomendado: ${protocolName}.` : language === "pt" ? `Você escolheu ${goal}. Comece com uma prática curta e confortável. Seu ritmo recomendado: ${protocolName}.` : `You chose to ${goal}. Start with a short, comfortable practice. Your recommended rhythm: ${protocolName}.`;
  const cta = language === "es" ? "Abrir mi práctica" : language === "pt" ? "Abrir minha prática" : "Open my practice";
  const footer = language === "es" ? "Solicitaste este único correo desde InOut. Requiere la app instalada. Si no lo solicitaste, puedes ignorarlo; no te enviaremos una secuencia de correos." : language === "pt" ? "Você pediu este único e-mail no InOut. É necessário ter o app instalado. Se não foi você, ignore a mensagem; não enviaremos uma sequência de e-mails." : "You requested this one-time email in InOut. Requires the installed app. If you did not request it, you can ignore it; we will not send a follow-up sequence.";
  return { from, to: [input.email], subject,
    text: `${greeting}${input.name ? ` ${input.name}` : ""},\n\n${body}\n\n${cta}: ${url}\n\n${footer}`,
    html: `<div style="font-family:Arial,sans-serif;background:#fafcfc;color:#124f59;padding:32px;max-width:520px"><p style="letter-spacing:3px">IN/OUT</p><h1>${escape(subject)}</h1><p>${greeting}${input.name ? ` ${escape(input.name)}` : ""},</p><p>${escape(body)}</p><p><a style="display:inline-block;padding:16px 24px;border-radius:16px;background:#124f59;color:white" href="${url}">${cta}</a></p><p style="font-size:12px;color:#527078">${escape(footer)}</p></div>` };
}
export async function hash(value: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2,"0")).join(""); }
export function welcomeHandler(rpc: Rpc, provider: EmailProvider, config: () => { enabled: boolean; from: string; hashSalt: string }) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, value: object) => Response.json(value, { status });
    if (request.method !== "POST") return reply(405, { error: "Method not allowed" });
    const settings = config();
    if (!settings.enabled || !settings.from || !settings.hashSalt) return reply(503, { status: "disabled" });
    let input: WelcomeInput;
    try {
      const reader = request.body?.getReader(); if (!reader) return reply(400, { error: "Invalid request" });
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length;
        if (size > 2048) { await reader.cancel(); return reply(413, { error: "Request too large" }); } chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      input = validateWelcome(JSON.parse(new TextDecoder().decode(bytes)));
    }
    catch { return reply(400, { error: "Invalid request" }); }
    const emailHash = await hash(`${settings.hashSalt}:${input.email}`), lease = crypto.randomUUID();
    try {
      const claim = await rpc("inout_welcome_claim", { p_hash: emailHash, p_device: await hash(input.installation), p_network: await hash(`${settings.hashSalt}:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}`), p_payload: welcomeTemplate(input, settings.from), p_lease: lease });
      if (claim.status !== "claimed") return reply(claim.status === "limited" ? 429 : claim.status === "busy" ? 202 : 200, { status: claim.status });
      const id = await provider.send(claim.payload as EmailMessage, `inout-welcome-v1-${emailHash}`);
      await rpc("inout_welcome_finish", { p_hash: emailHash, p_lease: lease, p_sent: true, p_provider: id });
      return reply(200, { status: "sent" });
    } catch {
      await rpc("inout_welcome_finish", { p_hash: emailHash, p_lease: lease, p_sent: false, p_provider: null }).catch(() => {});
      return reply(503, { status: "retry" });
    }
  };
}
