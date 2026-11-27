import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {submitExtension,activateExtension,listExtensions,extensionCatalog} from '../src/project-addon-requests.js';
import {commerceAddonSnapshot} from '../src/commerce-addon-bridge.js';

test('real PostgreSQL SQL: separate quote and paid activation grants precise page quota', {skip:!process.env.ATSH_TEST_POSTGRES&&!process.env.ATSH_PGLITE_MODULE}, async t=>{
 const schema='addon_test_'+randomUUID().replaceAll('-','');
 let db,cleanup;
 if(process.env.ATSH_PGLITE_MODULE){const {PGlite}=await import(process.env.ATSH_PGLITE_MODULE);const p=new PGlite();db={query:(sql,params)=>p.query(sql,params),exec:sql=>p.exec(sql),connect:async()=>({...db,release(){}})};cleanup=()=>p.close()}
 else{const {Pool}=await import('pg');const pool=new Pool({connectionString:process.env.ATSH_TEST_POSTGRES,max:1});const c=await pool.connect();db={query:(sql,params)=>c.query(sql,params),connect:async()=>({...db,release(){}})};cleanup=async()=>{await c.query('SET search_path TO public');await c.query('DROP SCHEMA '+schema+' CASCADE');c.release();await pool.end()}}
 t.after(cleanup);
 // Isolate all tables: no production schema or fixture data is used.
 await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema);
 const run=sql=>db.exec?db.exec(sql):db.query(sql);
 await run(`CREATE TABLE customer_accounts(id uuid PRIMARY KEY,email text,name text);
 CREATE TABLE customer_journey_projects(id uuid PRIMARY KEY,customer_account_id uuid NOT NULL REFERENCES customer_accounts(id),status text);
 CREATE TABLE customer_project_drafts(id uuid PRIMARY KEY,customer_id uuid NOT NULL REFERENCES customer_accounts(id),linked_journey_id uuid REFERENCES customer_journey_projects(id),title text,deleted_at timestamptz);
 CREATE TABLE shared_addons(code text PRIMARY KEY,name text,description text,price numeric(12,2),pricing_type text,category_code text,is_active boolean,sort_order integer);
 CREATE TABLE site_settings(id integer PRIMARY KEY,vat_rate numeric);
 CREATE TABLE audit_logs(actor text,action text,entity_type text,entity_id uuid,after_data jsonb);`);
 await run(await readFile(new URL('../db/commercial_stage12.sql',import.meta.url),'utf8'));
 await run('ALTER TABLE commercial_quotes ADD COLUMN customer_account_id uuid REFERENCES customer_accounts(id)');
 await run(await readFile(new URL('../db/customer_service_entitlements_stage55.sql',import.meta.url),'utf8'));
 await run(await readFile(new URL('../db/project_addon_requests_stage57.sql',import.meta.url),'utf8'));
 const customer={id:randomUUID(),email:'test@example.test'},journey=randomUUID(),draftId=randomUUID(),other=randomUUID();
 await db.query("INSERT INTO customer_accounts VALUES($1,$2,'Client'),($3,'other@example.test','Other')",[customer.id,customer.email,other]);
 await db.query("INSERT INTO customer_journey_projects VALUES($1,$2,'delivered')",[journey,customer.id]);
 await db.query("INSERT INTO customer_project_drafts VALUES($1,$2,$3,'My store',NULL)",[draftId,customer.id,journey]);
 await run("INSERT INTO shared_addons VALUES('extra_page','Extra page','Page',690,'per_page','foundation',true,1),('workflow_automation','Automation','Automation',100,'monthly','automation',true,2); INSERT INTO site_settings VALUES(1,14);");
 assert.equal((await extensionCatalog(db,draftId,customer.id)).catalog.length,2);
 await assert.rejects(()=>extensionCatalog(db,draftId,other),/Project not found/);
 const payload={draftId,customer,requestKey:randomUUID(),selection:[{code:'extra_page',quantity:2},{code:'workflow_automation',quantity:1}],expectedTotalPiasters:168720};
 const r=await submitExtension(db,payload);
 assert.equal((await submitExtension(db,payload)).id,r.id);
 await assert.rejects(()=>activateExtension(db,r.id,'owner'),/full verified payment/);
 assert.equal((await commerceAddonSnapshot(db,draftId)).quantities.extra_page,undefined);
 await db.query("UPDATE commercial_quotes SET status='accepted',accepted_at=now() WHERE id=$1",[r.quote_id]);
 await db.query("INSERT INTO customer_contracts(quote_id,body_snapshot,status,signed_at) VALUES($1,'signed snapshot','signed',now())",[r.quote_id]);
 await db.query("INSERT INTO commercial_invoices(quote_id,amount_piasters,verified_paid_piasters,status) VALUES($1,$2,0,'unpaid')",[r.quote_id,payload.expectedTotalPiasters]);
 await assert.rejects(()=>activateExtension(db,r.id,'owner'),/full verified payment/);
 await db.query("UPDATE commercial_invoices SET verified_paid_piasters=amount_piasters,status='paid' WHERE quote_id=$1",[r.quote_id]);
 assert.equal((await listExtensions(db,{customerId:customer.id,draftId}))[0].canActivate,true);
 await activateExtension(db,r.id,'owner');
 assert.equal((await activateExtension(db,r.id,'owner')).duplicate,true);
 const snap=await commerceAddonSnapshot(db,draftId);
 assert.deepEqual(snap.quantities,{extra_page:2,workflow_automation:1});
 assert.equal((await db.query("SELECT expires_at IS NOT NULL AS expires FROM customer_service_entitlements WHERE service_code='workflow_automation'")).rows[0].expires,true);
 assert.equal((await db.query('SELECT status FROM customer_journey_projects WHERE id=$1',[journey])).rows[0].status,'delivered');
});
