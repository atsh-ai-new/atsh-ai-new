import test from 'node:test';import assert from 'node:assert/strict';import {safeAssetUrl} from '../src/delivery-validation.js';
test('accepts HTTPS external assets',()=>assert.equal(safeAssetUrl('https://assets.example.com/file.mp4'),true));
test('rejects local and insecure assets',()=>{for(const url of ['http://example.com/a','https://localhost/a','https://127.0.0.1/a','https://internal.local/a','bad'])assert.equal(safeAssetUrl(url),false);});
