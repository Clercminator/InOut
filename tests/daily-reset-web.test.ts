import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { dailyResetProtocol } from "../apps/mobile/src/daily-reset";
import { shareSnapshot, sharedProtocol } from "../packages/sharing/src/index";
import { totalDuration } from "../packages/breathing-engine/src/index";

test("Daily Reset invitation preserves exactly sixty seconds without private fields", () => {
 const payload = shareSnapshot({ ...dailyResetProtocol(), name: "Private name" });
 assert.equal(totalDuration(sharedProtocol(payload).plan!),60000);
 assert.deepEqual(payload.blocks[0].phases.map(p=>p[0]),["inhale","exhale"]);
 assert.equal(JSON.stringify(payload).includes("Private"),false);
});
for (const language of ["en","es","pt"]) test(`public Daily Reset completes in ${language}, pauses when hidden, and offers installation afterward`, async () => {
 const dom = new JSDOM(readFileSync("apps/web/public/reset.html","utf8"), { url: `https://inout.imrtech.xyz/reset.html?s=${"a".repeat(32)}&lang=${language}`, runScripts: "outside-only" });
 const w = dom.window; let elapsed=0; let update=()=>{}; let hidden=false;
 Object.defineProperty(w.performance,"now",{value:()=>elapsed});
 Object.defineProperty(w.document,"hidden",{get:()=>hidden});
 w.matchMedia=()=>({matches:true,addEventListener:()=>{}}) as any;
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=(async()=>new Response(JSON.stringify({snapshot:shareSnapshot(dailyResetProtocol()),expiresAt:new Date(Date.now()+86400000).toISOString()}),{status:200})) as any;
 w.setInterval=((fn:()=>void)=>{update=fn;return 1;}) as any;
 try {
  w.eval(readFileSync("apps/web/public/reset.js","utf8"));
  await new Promise(resolve=>setTimeout(resolve,10));
  const element=(id:string)=>w.document.getElementById(id)!;
  assert.equal((element("play") as HTMLButtonElement).disabled,false);
  assert.equal(element("timer").textContent,"1:00");
  assert.equal(element("next").hidden,true);
  const localized = language === "es" ? ["Un momento para respirar.", "Empezar práctica"]
    : language === "pt" ? ["Um momento para respirar.", "Começar prática"]
    : ["A moment to breathe.", "Start practice"];
  assert.equal(w.document.documentElement.lang,language);
  assert.equal(w.document.querySelector("h1")?.textContent,localized[0]);
  assert.equal((element("play") as HTMLButtonElement).textContent,localized[1]);
  (element("play") as HTMLButtonElement).click();elapsed=20000;update();
  hidden=true;w.document.dispatchEvent(new w.Event("visibilitychange"));elapsed=50000;update();
  assert.equal(element("timer").textContent,"0:40");
  hidden=false;(element("play") as HTMLButtonElement).click();elapsed=90000;update();
  assert.equal(element("timer").textContent,"0:00");assert.equal(element("next").hidden,false);
  assert.equal(element("again").hidden,false);assert.ok(w.document.querySelector("[data-install-invitation]"));
  assert.equal(element("status").textContent,language === "es" ? "Práctica completada. Vuelve a tu respiración natural."
    : language === "pt" ? "Prática concluída. Volte à sua respiração natural."
    : "Practice complete. Return to your natural breathing.");
  assert.equal(element("guide").style.transform,"scale(1)");
  assert.equal(element("native").textContent,language === "es" ? "Abrir este ejercicio en IN/OUT"
    : language === "pt" ? "Abrir este exercício no IN/OUT" : "Open this exercise in IN/OUT");
  assert.equal(w.document.querySelectorAll('a[href^="https://apps.apple.com"],a[href^="https://play.google.com"]').length,0);
 } finally { w.close(); }
});
