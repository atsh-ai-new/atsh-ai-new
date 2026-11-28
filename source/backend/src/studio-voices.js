import {z} from "zod";
export const voiceIds=["local-msa","egyptian-male","egyptian-male-2","egyptian-female","egyptian-female-2","egyptian-child-male","egyptian-child-female","egyptian-teen-male","egyptian-teen-female","alexandrian-male","alexandrian-female","alexandrian-child-male","alexandrian-child-female","alexandrian-teen-male","alexandrian-teen-female","saidi-male","saidi-female","saidi-child-male","saidi-child-female","saidi-teen-male","saidi-teen-female","saudi-male","saudi-female","gulf-male","gulf-female"];
export const voiceIdSchema=z.enum(voiceIds);
export const voicePerformanceSchema=z.enum(["natural","horror","action","suspense","whisper"]);
const performanceSpeed={horror:.89,action:1.10,suspense:.94};
export function prepareVoicePerformance({performance,...voice}){
 if(!performance||performance==="natural"||performance==="whisper")return voice;
 const factor=performanceSpeed[performance];
 if(!Object.hasOwn(performanceSpeed,performance))throw Error("Invalid voice performance");
 const punctuate=text=>typeof text!=="string"?text:text.replace(/[،,][ \t]+/g,performance==="action"?"، ":"… ");
 const text=punctuate(voice.text),pronunciation=punctuate(voice.pronunciation);
 return {...voice,text,pronunciation,speed:Math.min(1.2,Math.max(.8,(voice.speed??1)*factor))};
}
function configuredIds(){
 try{const ids=JSON.parse(process.env.CHARACTER_DIALECT_VOICES||"[]");return new Set(Array.isArray(ids)?ids.filter(id=>voiceIds.includes(id)&&id!=="local-msa"):[]);}catch{return new Set();}
}
export function voiceCatalog(){
 const local=Boolean(process.env.CHARACTER_SERVICE_URL&&process.env.CHARACTER_SERVICE_TOKEN);
 const external=Boolean(process.env.CHARACTER_DIALECT_SERVICE_URL&&process.env.CHARACTER_DIALECT_SERVICE_TOKEN);
 const ids=configuredIds();
 return voiceIds.map(id=>({id,available:id==="local-msa"?local:external&&ids.has(id)}));
}
export async function onlineVoiceCatalog(){
 const catalog=voiceCatalog();
 if(!catalog.some(v=>v.id!=="local-msa"&&v.available))return catalog;
 let installed=new Set(),provisional=new Set(),expressive=new Set();
 try{
  const url=new URL("/voices",process.env.CHARACTER_DIALECT_SERVICE_URL);
  if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw Error("Invalid voice provider");
  const r=await fetch(url,{headers:{Authorization:"Bearer "+process.env.CHARACTER_DIALECT_SERVICE_TOKEN},redirect:"error",signal:AbortSignal.timeout(3000)});
  if(r.ok){const data=await r.json();if(Array.isArray(data.voices))installed=new Set(data.voices);if(Array.isArray(data.provisional))provisional=new Set(data.provisional);if(Array.isArray(data.expressive))expressive=new Set(data.expressive);}
 }catch{}
 return catalog.map(v=>v.id==="local-msa"?v:{...v,available:v.available&&installed.has(v.id),provisional:provisional.has(v.id),expressive:v.available&&installed.has(v.id)&&expressive.has(v.id)});
}
export function voiceAvailable(id){return voiceCatalog().some(v=>v.id===(id||"local-msa")&&v.available);}
export async function synthesizeStudioVoice(input){
 const {voiceId="local-msa",...body}=prepareVoicePerformance(input);
 if(!voiceAvailable(voiceId))throw Error("الصوت المحدد غير مجهز؛ اختر صوتًا متاحًا.");
 const local=voiceId==="local-msa";
 if(input.performance==="whisper"&&!(await onlineVoiceCatalog()).some(v=>v.id===voiceId&&v.expressive))throw Error("الهمس غير مدعوم لهذا الصوت.");
 const base=local?process.env.CHARACTER_SERVICE_URL:process.env.CHARACTER_DIALECT_SERVICE_URL;
 const token=local?process.env.CHARACTER_SERVICE_TOKEN:process.env.CHARACTER_DIALECT_SERVICE_TOKEN;
 const url=new URL("/voice-preview",base);
 if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw Error("Invalid voice service URL");
 const r=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(local?body:{...body,pitch:0,intonation:1,voiceId,...(input.performance==="whisper"?{performance:"whisper"}:{})}),redirect:"error",signal:AbortSignal.timeout(local?30000:180000)});
 if(!r.ok||!r.body)throw Error("Voice service failed");
 const reader=r.body.getReader(),parts=[];let len=0;
 while(true){const {done,value}=await reader.read();if(done)break;len+=value.length;if(len>4*1024*1024){await reader.cancel();throw Error("Voice size");}parts.push(value);}
 const audio=Buffer.concat(parts);
 if(audio.length<44||audio.toString("ascii",0,4)!=="RIFF"||audio.toString("ascii",8,12)!=="WAVE")throw Error("Voice format");
 return audio;
}
