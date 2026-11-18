import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewAgentManifest,requireApprovedManifest} from '../src/agent-manifest-gate.js';
const make=(path,content='export default 1')=>({repo:'demo-app',files:[{path,content}]});
test('allows ordinary TypeScript source',()=>assert.equal(reviewAgentManifest(make('src/app.ts')).approved,true));
test('rejects environment secrets file',()=>assert.equal(reviewAgentManifest(make('.env')).findings[0].code,'SECRET_FILE'));
test('rejects embedded private key',()=>assert.equal(reviewAgentManifest(make('src/app.ts','-----BEGIN PRIVATE KEY-----')).approved,false));
test('rejects unreviewed executable files',()=>assert.equal(reviewAgentManifest(make('run.sh')).approved,false));
test('blocks unsafe manifests before publishing',()=>assert.throws(()=>requireApprovedManifest(make('.env.local'))));
