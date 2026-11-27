import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { randomUUID } from "node:crypto";

function loadModule(path, require) {
  const module = { exports: {} };
  const {outputText} = ts.transpileModule(readFileSync(path,"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  });
  return { module, outputText, context:{exports:module.exports,require} };
}
const session = loadModule("src/lib/visitor-session.ts");
vm.runInNewContext(session.outputText,session.context);

test("public tracker deduplicates the browser, starts a fresh session after idle, and ignores private routes", async () => {
  let now = 1_000_000_000;
  class Clock extends Date { static now(){return now;} }
  class Form { getAttribute(){return null;} get tagName(){return "FORM";} }
  const storage = () => { const data = new Map(); return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}; };
  function tab(local, path="/ar", search="", visible=true) {
    const posts=[], events={};
    let tick;
    const document={visibilityState:visible?"visible":"hidden",referrer:"",addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
    const window={fetch:async(path,options)=>{if(path==="/api/visitor/analytics")posts.push(JSON.parse(options.body));return {ok:true};},addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
    const tracker=loadModule("src/components/visitor-analytics.tsx", name=> name==="react"?{useEffect:effect=>effect()}:name==="next/navigation"?{usePathname:()=>path}:session.module.exports);
    Object.assign(tracker.context,{window,document,localStorage:local,Date:Clock,crypto:{randomUUID},navigator:{userAgent:"Linux"},Request,URL,URLSearchParams,location:{origin:"https://example.test",search},Element:class{},HTMLFormElement:Form,setInterval(fn){tick=fn;return 1;},clearInterval(){},fetch:(...args)=>window.fetch(...args)});
    vm.runInNewContext(tracker.outputText,tracker.context);tracker.module.exports.default();
    return {posts,events,tick,document,window,first:posts[0]};
  }
  const local=storage();
  const a=tab(local),b=tab(local),english=tab(local,"/en"),other=tab(storage());
  assert.equal(a.first.id,b.first.id);
  assert.equal(a.first.visitId,b.first.visitId);
  assert.equal(a.first.visitId,english.first.visitId);
  assert.notEqual(a.first.id,other.first.id);
  now+=15_000;a.tick();
  assert.equal(a.posts.at(-1).kind,"activity");
  now+=session.module.exports.VISITOR_IDLE_MS-15_000;
  a.tick();
  a.events.submit({target:new Form()});
  const restarted=a.posts.at(-1);
  assert.equal(restarted.kind,"submit");
  assert.equal(restarted.id,a.first.id);
  assert.notEqual(restarted.visitId,a.first.visitId);
  b.events.submit({target:new Form()});
  assert.equal(b.posts.at(-1).visitId,restarted.visitId);
  for(const route of ["/admin","/en/account/dashboard","/customer-portal"])assert.equal(tab(local,route).posts.length,0);
  assert.equal(tab(local,"/ar","?atshPreview=x").posts.length,0);
  const demo=tab(local,"/en/catalog/sofra","?fullscreen=1&draftId=secret");
  assert.equal(demo.first.label,"demo_open");
  assert.equal(demo.first.path,"/en/catalog/sofra");
  await demo.window.fetch("/api/domains/check?domain=private.example");
  assert.equal(demo.posts.at(-1).label,"domain_http_ok");
  assert.doesNotMatch(JSON.stringify(demo.posts),/private\.example|secret/);
  await demo.window.fetch("/api/visitor/assistant",{method:"POST",body:JSON.stringify({message:"private message"})});
  assert.equal(demo.posts.at(-1).label,"assistant_http_ok");
  assert.doesNotMatch(JSON.stringify(demo.posts),/private message/);
  const background=tab(local,"/ar","",false);
  assert.equal(background.posts.length,0);
  background.document.visibilityState="visible";
  background.events.visibilitychange();
  assert.equal(background.posts[0].visitId,restarted.visitId);
});
