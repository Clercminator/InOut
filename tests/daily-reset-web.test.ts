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
  (element("play") as HTMLButtonElement).click();elapsed=20000;update();
  hidden=true;w.document.dispatchEvent(new w.Event("visibilitychange"));elapsed=50000;update();
  assert.equal(element("timer").textContent,"0:40");
  hidden=false;(element("play") as HTMLButtonElement).click();elapsed=90000;update();
  assert.equal(element("timer").textContent,"0:00");assert.equal(element("next").hidden,false);
  assert.equal(element("again").hidden,false);assert.ok(w.document.querySelector("[data-install-invitation]"));
  assert.equal(element("guide").style.transform,"scale(1)");
 } finally { w.close(); }
});
