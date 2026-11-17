import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const backend=readFileSync(new URL('../src/delivery-control.js',import.meta.url),'utf8');
const proxy=readFileSync(new URL('../../src/app/api/customer/deliverables/[[...path]]/route.ts',import.meta.url),'utf8');
test('admin upload PUT is covered by operation guard',()=>{
 assert.match(backend,/\['POST','PATCH','PUT','DELETE'\]\.includes\(req\.method\)\?operationGuard/);
});
test('private files are streamed instead of readFile buffering',()=>{
 assert.match(backend,/createReadStream\(path\)/);
 assert.doesNotMatch(backend,/readFile\(join\(privateDir/);
});
test('Next.js download proxy forwards streamed body',()=>{
 assert.match(proxy,/new NextResponse\(upstream\.body/);
 assert.doesNotMatch(proxy,/await upstream\.arrayBuffer\(\)/);
});
