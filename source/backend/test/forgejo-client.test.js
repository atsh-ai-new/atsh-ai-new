import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRepoName,forgejoConfig,ensureProjectRepository} from '../src/forgejo-client.js';
test('repository names reject traversal and injection',()=>{
 for(const name of ['../admin','foo/bar','a b','-bad','x'.repeat(70),'a--b'])assert.throws(()=>validateRepoName(name));
 assert.equal(validateRepoName('client-project-01'),'client-project-01');
});
test('Forgejo configuration requires private server credentials',()=>{
 assert.throws(()=>forgejoConfig({FORGEJO_URL:'http://evil.example/',FORGEJO_TOKEN:'a',FORGEJO_OWNER:'org'}));
 assert.equal(forgejoConfig({FORGEJO_URL:'https://git.example/',FORGEJO_TOKEN:'a',FORGEJO_OWNER:'org'}).owner,'org');
});
test('existing repository is never overwritten',async()=>{
 const calls=[];const fetchImpl=async(url,opts)=>{calls.push([String(url),opts.method]);return {ok:true,text:async()=>JSON.stringify({name:'client-project'})};};
 const result=await ensureProjectRepository({base:new URL('https://git.example/'),token:'secret',owner:'org'},{name:'client-project',fetchImpl});
 assert.equal(result.created,false);assert.equal(calls.length,1);assert.equal(calls[0][1],'GET');
});
test('missing repository creates a private initialized repository',async()=>{
 const calls=[];const fetchImpl=async(url,opts)=>{calls.push(opts);return calls.length===1?{ok:false,status:404,text:async()=>''}:{ok:true,text:async()=>JSON.stringify({name:'client-project'})};};
 const result=await ensureProjectRepository({base:new URL('https://git.example/'),token:'secret',owner:'org'},{name:'client-project',fetchImpl});
 assert.equal(result.created,true);assert.equal(JSON.parse(calls[1].body).private,true);
});
