import test from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest,applyReviewedManifest} from '../src/forgejo-manifest.js';
const base={repo:'demo-project',files:[{path:'src/index.js',content:'hello'}]};
test('accepts valid reviewed manifest',()=>assert.equal(validateManifest(base).files.length,1));
test('rejects duplicate paths',()=>assert.throws(()=>validateManifest({...base,files:[base.files[0],base.files[0]]}),/Duplicate/));
test('rejects traversal',()=>assert.throws(()=>validateManifest({...base,files:[{path:'../secrets',content:'x'}]})));
test('rejects oversized content',()=>assert.throws(()=>validateManifest({...base,files:[{path:'a.txt',content:'a'.repeat(1024*1024+1)}]})));
test('rejects empty manifest',()=>assert.throws(()=>validateManifest({...base,files:[]})));
test('writes only after repository provisioning',async()=>{
 const calls=[];const fetchImpl=async(url,options={})=>{calls.push({url:String(url),method:options.method||'GET'});return {ok:true,status:200,text:async()=>JSON.stringify(options.method==='POST'&&String(url).includes('/contents/')?{content:{sha:'abc'}}:{name:'demo-project'})}};
 const result=await applyReviewedManifest({base:new URL('https://forgejo.example/'),owner:'atsh',token:'test'},base,{fetchImpl});
 assert.equal(result.completed,true);assert.equal(calls.length,2);assert.equal(calls[1].method,'POST');
});
test('reports partial failure rather than success',async()=>{
 const fetchImpl=async(url,options={})=>({ok:!(options.method==='POST'),status:options.method==='POST'?500:200,text:async()=>'{"name":"demo-project"}'});
 const result=await applyReviewedManifest({base:new URL('https://forgejo.example/'),owner:'atsh',token:'test'},base,{fetchImpl});
 assert.equal(result.completed,false);assert.equal(result.results[0].ok,false);
});
