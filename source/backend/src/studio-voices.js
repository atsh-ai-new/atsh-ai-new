import {z} from "zod";
export const voiceIds=["local-msa","egyptian-male","egyptian-female","alexandrian-male","alexandrian-female","saidi-male","saidi-female","saudi-male","saudi-female","gulf-male","gulf-female"];
export const voiceIdSchema=z.enum(voiceIds);
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
 let installed=new Set();
 try{
  const url=new URL("/voices",process.env.CHARACTER_DIALECT_SERVICE_URL);
  if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw Error("Invalid voice provider");
  const r=await fetch(url,{headers:{Authorization:"Bearer "+process.env.CHARACTER_DIALECT_SERVICE_TOKEN},redirect:"error",signal:AbortSignal.timeout(3000)});
  if(r.ok){const data=await r.json();if(Array.isArray(data.voices))installed=new Set(data.voices);}
 }catch{}
 return catalog.map(v=>v.id==="local-msa"?v:{...v,available:v.available&&installed.has(v.id)});
}
export function voiceAvailable(id){return voiceCatalog().some(v=>v.id===(id||"local-msa")&&v.available);}
export async function synthesizeStudioVoice(input){
 const {voiceId="local-msa",...body}=input;
 if(!voiceAvailable(voiceId))throw Error("الصوت المحدد غير مجهز؛ اختر صوتًا متاحًا.");
 const local=voiceId==="local-msa";
 const base=local?process.env.CHARACTER_SERVICE_URL:process.env.CHARACTER_DIALECT_SERVICE_URL;
 const token=local?process.env.CHARACTER_SERVICE_TOKEN:process.env.CHARACTER_DIALECT_SERVICE_TOKEN;
 const url=new URL("/voice-preview",base);
 if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw Error("Invalid voice service URL");
 const r=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(local?body:{...body,pitch:0,intonation:1,voiceId}),redirect:"error",signal:AbortSignal.timeout(local?30000:95000)});
 if(!r.ok||!r.body)throw Error("Voice service failed");
 const reader=r.body.getReader(),parts=[];let len=0;
 while(true){const {done,value}=await reader.read();if(done)break;len+=value.length;if(len>4*1024*1024){await reader.cancel();throw Error("Voice size");}parts.push(value);}
 const audio=Buffer.concat(parts);
 if(audio.length<44||audio.toString("ascii",0,4)!=="RIFF"||audio.toString("ascii",8,12)!=="WAVE")throw Error("Voice format");
 return audio;
}
