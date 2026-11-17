import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProjectPath,upsertProjectFile} from '../src/forgejo-client.js';
const config={base:new URL('https://git.example/'),token:'secret',owner:'atsh'};
test('rejects path traversal, absolute paths and git metadata',()=>{
 for(const path of ['../secret','/etc/passwd','a//b','a/./b','a/.git/config','a\\b',''])assert.throws(()=>validateProjectPath(path));
 assert.equal(validateProjectPath('src/app/page.tsx'),'src/app/page.tsx');
});
test('creates a file with base64 encoding and never sends secrets in URL',async()=>{
 let request;const fetchImpl=async(url,opts)=>{request={url:String(url),opts};return {ok:true,text:async()=>'{"ok":true}'};};
 await upsertProjectFile(config,{repo:'sample-project',path:'README.md',content:'مرحبا',fetchImpl});
 assert.equal(request.opts.method,'POST');
 assert.equal(Buffer.from(JSON.parse(request.opts.body).content,'base64').toString(),'مرحبا');
 assert.equal(request.url.includes('secret'),false);
});
test('updates only with a supplied expected SHA',async()=>{
 let method;const fetchImpl=async(url,opts)=>{method=opts.method;return {ok:true,text:async()=>'{"ok":true}'};};
 await upsertProjectFile(config,{repo:'sample-project',path:'README.md',content:'new',expectedSha:'a'.repeat(40),fetchImpl});
 assert.equal(method,'PUT');
});
test('rejects oversized files and untrusted branch names',async()=>{
 await assert.rejects(()=>upsertProjectFile(config,{repo:'sample-project',path:'README.md',content:'x'.repeat(1024*1024+1)}));
 await assert.rejects(()=>upsertProjectFile(config,{repo:'sample-project',path:'README.md',content:'ok',branch:'../../main'}));
});
