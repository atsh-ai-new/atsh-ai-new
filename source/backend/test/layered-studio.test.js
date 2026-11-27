import test from "node:test";
import assert from "node:assert/strict";
import {voiceCatalog,voiceAvailable} from "../src/studio-voices.js";
import {layeredAuthorized,layeredInput} from "../src/layered-worker.js";
import {assetSchema} from "../src/content-studio-assets.js";
test("voice identity catalogue requires distinct configured identities",()=>{
 const original={...process.env};
 try{
 delete process.env.CHARACTER_DIALECT_SERVICE_URL;delete process.env.CHARACTER_DIALECT_SERVICE_TOKEN;
 assert.equal(voiceCatalog().length,11);assert.equal(voiceAvailable("saidi-female"),false);
 process.env.CHARACTER_DIALECT_SERVICE_URL="http://dialect-voice:8080";process.env.CHARACTER_DIALECT_SERVICE_TOKEN="a".repeat(64);process.env.CHARACTER_DIALECT_VOICES='["egyptian-female"]';
 assert.equal(voiceAvailable("egyptian-female"),true);assert.equal(voiceAvailable("saidi-female"),false);
 }finally{for(const k of ["CHARACTER_DIALECT_SERVICE_URL","CHARACTER_DIALECT_SERVICE_TOKEN","CHARACTER_DIALECT_VOICES"]){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}}
});
test("worker authentication and missing artwork fail closed",()=>{
 assert.equal(layeredAuthorized("Bearer "+"a".repeat(64),"a".repeat(64)),true);
 assert.equal(layeredAuthorized("Bearer "+"b".repeat(64),"a".repeat(64)),false);
 assert.throws(()=>layeredInput({campaign:{format:"16:9"},animation:{renderer:"layers-v1",shots:[{dialogue:[],placements:[{characterId:"c",gesture:"idle"}]}],cast:[{id:"c"}]}}),/صورة وقوف/);
});
test("music library accepts bounded WAV metadata, rejects arbitrary payload",()=>{
 const a={kind:"music",name:"score",category:"music",images:[],audio:Buffer.from("RIFF0000WAVE").toString("base64")};
 assert.equal(assetSchema.safeParse(a).success,true);
 assert.equal(assetSchema.safeParse({...a,audio:"bm90LWF1ZGlv"}).success,false);
});
