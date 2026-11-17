import test from 'node:test';import assert from 'node:assert/strict';
import {validateDispatchConfig,signedDispatch} from '../src/builder-dispatch.js';
test('rejects weak secret',()=>assert.throws(()=>validateDispatchConfig({BUILDER_DISPATCH_SECRET:'short',BUILDER_DISPATCH_WEBHOOK:'https://example.org'})));
test('rejects public http',()=>assert.throws(()=>validateDispatchConfig({BUILDER_DISPATCH_SECRET:'x'.repeat(32),BUILDER_DISPATCH_WEBHOOK:'http://example.org'})));
test('accepts HTTPS',()=>assert.equal(validateDispatchConfig({BUILDER_DISPATCH_SECRET:'x'.repeat(32),BUILDER_DISPATCH_WEBHOOK:'https://example.org/hook'}).endpoint.protocol,'https:'));
test('signs deterministic payload',()=>{const j={id:'1',kind:'project',source_id:'2',payload:{a:1}};assert.equal(signedDispatch(j,'secret').signature,signedDispatch(j,'secret').signature)});
