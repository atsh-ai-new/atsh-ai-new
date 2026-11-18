import test from 'node:test';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';
import {canTransition,validJobResult,verifyCallback} from '../src/builder-job-rules.js';
test('only legal job transitions',()=>{assert.equal(canTransition('dispatched','running'),true);assert.equal(canTransition('succeeded','queued'),false);assert.equal(canTransition('failed','queued'),true)});
test('reject insecure preview',()=>{assert.equal(validJobResult({status:'succeeded',previewUrl:'http://example.com'}),false);assert.equal(validJobResult({status:'succeeded',previewUrl:'https://preview.example.com'}),true)});
test('callback signature authenticates exact bytes',()=>{const secret='a'.repeat(32),body=Buffer.from('{"jobId":"123"}');const signature='sha256='+createHmac('sha256',secret).update(body).digest('hex');assert.equal(verifyCallback(body,signature,secret),true);assert.equal(verifyCallback(Buffer.from('x'),signature,secret),false)});
