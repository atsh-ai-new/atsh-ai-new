import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {assetSchema} from '../src/content-studio-assets.js';
const root=new URL('../../',import.meta.url);
const manifest=readFileSync(new URL('src/app/admin/studio-starter.ts',root),'utf8');
const catalog=JSON.parse(manifest.match(/const catalog:Starter\[\]= (\[[\s\S]*?\]);/)[1]);
const images=files=>files.map(({pose,file})=>({pose,image:readFileSync(new URL('public/studio-library/'+file,root)).toString('base64')}));
test('cinematic starter catalog contains all six Egyptian identities, animals, venues, vehicles and props',()=>{
 assert.equal(new Set(catalog.map(a=>a.kind+':'+a.name)).size,catalog.length);
 for(const v of ['egyptian-male','egyptian-female','egyptian-teen-male','egyptian-teen-female','egyptian-child-male','egyptian-child-female'])assert.ok(catalog.some(a=>a.voiceId===v),v);
 for(const category of ['human','animal','vehicle','door','object','background'])assert.ok(catalog.some(a=>a.category===category),category);
 for(const locationType of ['office','restaurant','school','clinic','shop','home','street','workshop','hospital'])assert.ok(catalog.some(a=>a.locationType===locationType),locationType);
});
test('every bundled asset and pose passes the actual production-library schema',()=>{
 for(const a of catalog){
  const {files,voiceId,outfits,...meta}=a;
  const payload={...meta,images:images(files),...(a.kind==='hero'?{voice:{...(voiceId?{voiceId}:{}),pitch:0,speed:1,intonation:1},...(outfits?{outfits:outfits.map(o=>({id:randomUUID(),name:o.name,images:images(o.files)}))}:{})}:{})};
  const result=assetSchema.safeParse(payload);assert.ok(result.success,a.name+': '+JSON.stringify(result.error?.issues??[]));
  assert.ok(files.some(f=>f.pose==='stand'));
 }
});
