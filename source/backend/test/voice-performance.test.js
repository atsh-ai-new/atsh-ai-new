import {test} from "node:test";
import assert from "node:assert/strict";
import {prepareVoicePerformance,voicePerformanceSchema,synthesizeStudioVoice} from "../src/studio-voices.js";

test("neutral performance preserves original input and custom choices preserve identity and words",()=>{
 const voice={voiceId:"egyptian-male",speed:1,pitch:0,intonation:1,text:"ممكن نجرب مع بعض، ونشوف النتيجة.",pronunciation:""};
 assert.deepEqual(prepareVoicePerformance({...voice,performance:"natural"}),voice);
 const a=prepareVoicePerformance({...voice,performance:"action",speed:1.2});
 const h=prepareVoicePerformance({...voice,performance:"horror",speed:.8});
 const s=prepareVoicePerformance({...voice,performance:"suspense"});
 assert.equal(a.speed,1.2);assert.equal(h.speed,.8);assert.equal(s.speed,.94);
 assert.equal(s.text,"ممكن نجرب مع بعض… ونشوف النتيجة.");
 assert.equal(s.voiceId,voice.voiceId);assert.equal(s.pitch,0);assert.equal(s.pronunciation,"");
 assert.throws(()=>prepareVoicePerformance({...voice,performance:"__proto__"}));
 assert.equal(voicePerformanceSchema.safeParse("suspense").success,true);
 assert.equal(voicePerformanceSchema.safeParse("future").success,false);
});

test("synthesis sends performance as provider-supported rate and text, not a new voice",async t=>{
 for(const [key,value] of Object.entries({
  CHARACTER_DIALECT_SERVICE_URL:"http://localhost:10003",CHARACTER_DIALECT_SERVICE_TOKEN:"test",
  CHARACTER_DIALECT_VOICES:'["egyptian-male"]'
 })){
  const previous=process.env[key];process.env[key]=value;
  t.after(()=>{if(previous===undefined)delete process.env[key];else process.env[key]=previous;});
 }
 t.mock.method(globalThis,"fetch",async (url,req)=>{
  const body=JSON.parse(req.body);
  assert.equal(url.pathname,"/voice-preview");
  assert.equal(body.voiceId,"egyptian-male");assert.equal(body.speed,.89);
  assert.equal(body.text,"استنى… حد سامعنا؟");assert.ok(!("performance" in body));
  const buf=Buffer.alloc(44);buf.write("RIFF");buf.write("WAVE",8);
  return new Response(buf);
 });
 const res=await synthesizeStudioVoice({voiceId:"egyptian-male",text:"استنى، حد سامعنا؟",speed:1,performance:"horror"});
 assert.equal(res.length,44);
});

test("native whisper is never silently replaced by natural speech",async t=>{
 for(const [key,value] of Object.entries({
  CHARACTER_DIALECT_SERVICE_URL:"http://localhost:10003",CHARACTER_DIALECT_SERVICE_TOKEN:"test",
  CHARACTER_DIALECT_VOICES:'["egyptian-female-2"]'
 })){
  const previous=process.env[key];process.env[key]=value;
  t.after(()=>{if(previous===undefined)delete process.env[key];else process.env[key]=previous;});
 }
 let capability=false, renders=0;
 t.mock.method(globalThis,"fetch",async (url,req)=>{
  if(url.pathname==="/voices")return Response.json({voices:["egyptian-female-2"],expressive:capability?["egyptian-female-2"]:[]});
  renders++;
  assert.deepEqual(JSON.parse(req.body),{text:"استنى، حد سامعنا؟",speed:1,pitch:0,intonation:1,voiceId:"egyptian-female-2",performance:"whisper"});
  const buf=Buffer.alloc(44);buf.write("RIFF");buf.write("WAVE",8);
  return new Response(buf);
 });
 const req={voiceId:"egyptian-female-2",text:"استنى، حد سامعنا؟",speed:1,performance:"whisper"};
 await assert.rejects(synthesizeStudioVoice(req),/الهمس غير مدعوم/);
 assert.equal(renders,0);
 capability=true;
 assert.equal((await synthesizeStudioVoice(req)).length,44);
 assert.equal(renders,1);
});
