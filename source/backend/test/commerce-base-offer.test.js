import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {sectorTariff,ensureOwnership,publicOwnership} from '../src/product-ownership.js';
import {priceSectorSelection} from '../src/sector-pricing.js';

const sql=await readFile(new URL('../db/commerce_offer_20261127.sql',import.meta.url),'utf8');
const baseline=Object.fromEntries([...sql.matchAll(/\('(rent_monthly|rent|copy|code)',([\d.]+)\)/g)].map(m=>[m[1],Number(m[2])]));
const draft=JSON.parse(sql.split('$offer$')[1])[0];

test('store baseline matches approved Market rates in every ownership mode, independently',async()=>{
 assert.deepEqual(baseline,sectorTariff('market'));
 assert.equal(draft.slug,'commerce-engine');assert.equal(draft.published,false);
 assert.match(sql,/ON CONFLICT\(scope,owner_key,mode\) DO NOTHING/);
 const rows=Object.entries(baseline).map(([mode,amount])=>({mode,list_price:amount,initial_price:amount,discount_percent:0}));
 const db={query:async()=>({rows})};
 const prices=publicOwnership('sector',draft.slug,await ensureOwnership(db,'sector',draft.slug,draft.name,null));
 assert.deepEqual(Object.keys(prices).sort(),Object.keys(baseline).sort());
 for(const mode of Object.keys(baseline)){
  const quote=priceSectorSelection([{...draft,published:true,ownershipPrices:prices}],draft.slug,[],{},mode);
  assert.equal(quote.subtotal,baseline[mode]);
 }
 assert.throws(()=>priceSectorSelection([{...draft,ownershipPrices:prices}],draft.slug,[],{},'copy'),/published/);
 rows.find(r=>r.mode==='copy').list_price=40000;
 rows.find(r=>r.mode==='copy').discount_percent=5;
 const edited=await ensureOwnership(db,'sector',draft.slug,draft.name,null);
 assert.equal(edited.copy.price,38000);assert.equal(edited.copy.initial_price,46870);
});

test('PostgreSQL migration seeds once, preserves catalog data, manual pricing and publication', {skip:!process.env.ATSH_TEST_POSTGRES&&!process.env.ATSH_PGLITE_MODULE},async t=>{
 const schema='commerce_offer_'+randomUUID().replaceAll('-','');
 let db,run,cleanup;
 if(process.env.ATSH_PGLITE_MODULE){
  const {PGlite}=await import(process.env.ATSH_PGLITE_MODULE);const p=new PGlite();db=p;run=sql=>p.exec(sql);cleanup=()=>p.close();
 }else{
  const {Client}=await import('pg');const client=new Client({connectionString:process.env.ATSH_TEST_POSTGRES});await client.connect();db=client;run=sql=>client.query(sql);cleanup=async()=>{await client.query('SET search_path TO public');await client.query('DROP SCHEMA '+schema+' CASCADE');await client.end()};
 }
 t.after(cleanup);
 await run('CREATE SCHEMA '+schema+'; SET search_path TO '+schema);
 await run(`CREATE TABLE schema_migrations(version text PRIMARY KEY);
 CREATE TABLE site_pages(slug text,locale text,content jsonb,is_published boolean,updated_at timestamptz DEFAULT now());
 INSERT INTO site_pages(slug,locale,content,is_published) VALUES('catalog','ar','{"items":[{"slug":"market","name":"Market","published":true}],"title":"Existing"}',true);`);
 await run(await readFile(new URL('../db/product_ownership_20261126.sql',import.meta.url),'utf8'));
 await db.query("INSERT INTO product_ownership_prices(scope,owner_key,mode,list_price,initial_price,discount_percent) VALUES('sector','commerce-engine','rent',2100,2100,5)");
 await run(sql);
 let items=(await db.query("SELECT content FROM site_pages")).rows[0].content.items;
 assert.equal(items.length,2);assert.deepEqual(items[0],{slug:'market',name:'Market',published:true});assert.deepEqual(items[1],draft);
 let prices=await ensureOwnership(db,'sector','commerce-engine','Store',null);
 assert.equal(prices.rent.price,1995);assert.equal(prices.copy.price,46870);
 await db.query("UPDATE product_ownership_prices SET list_price=40000,discount_percent=5 WHERE owner_key='commerce-engine' AND mode='copy'");
 await db.query("UPDATE site_pages SET content=jsonb_set(content,'{items,1,published}','true')");
 await run(sql);
 items=(await db.query("SELECT content FROM site_pages")).rows[0].content.items;
 assert.equal(items.length,2);assert.equal(items[1].published,true);
 prices=await ensureOwnership(db,'sector','commerce-engine','Store',null);
 assert.equal(prices.copy.price,38000);assert.equal(prices.copy.initial_price,46870);
});
