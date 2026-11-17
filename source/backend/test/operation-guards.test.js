import test from 'node:test';
import assert from 'node:assert/strict';
import {operationGuard} from '../src/operation-guards.js';
const invoke=async value=>{const pool={query:async()=>{if(value==='error')throw Error('DB unavailable');return {rows:value===null?[]:[{enabled:value}]};}};let nextCalled=false;let status;let body;const res={status(code){status=code;return this},json(data){body=data;return this}};await operationGuard(pool,'new_orders')({},res,()=>{nextCalled=true});return {nextCalled,status,body};};
test('enabled operation passes',async()=>assert.equal((await invoke(true)).nextCalled,true));
test('disabled operation blocks',async()=>assert.equal((await invoke(false)).status,503));
test('missing setting defaults enabled for backward compatibility',async()=>assert.equal((await invoke(null)).nextCalled,true));
test('database failure fails closed',async()=>assert.equal((await invoke('error')).status,503));
