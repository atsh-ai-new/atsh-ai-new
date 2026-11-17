import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('admin commercial screen calls real protected quote endpoints',()=>{
 const ui=read('src/app/admin/commercial-manager.tsx');
 const api=read('backend/src/server.js');
 assert.match(ui,/request\("quotes","POST"/);
 assert.match(ui,/label:description,quantity:1,unitPricePiasters/);
 assert.match(api,/app\.post\("\/api\/admin\/commercial\/quotes",requireAdmin/);
 assert.match(ui,/contracts\/templates/);
 assert.match(ui,/review-link/);
});
test('commercial tab is mounted inside existing authenticated admin screen',()=>{
 const ui=read('src/app/admin/page.tsx');
 assert.match(ui,/import CommercialManager/);
 assert.match(ui,/view === "commercial" && <CommercialManager/);
});
test('contract and payment remain separate operations',()=>{
 const api=read('backend/src/server.js');
 assert.match(api,/paymentStatus:"not_started"/);
 assert.match(api,/UPDATE customer_contracts SET status='signed'/);
});
