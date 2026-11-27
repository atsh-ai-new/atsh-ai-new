import { calculateUnifiedPricing } from './pricing-engine.js';
import { quoteTotal } from './commercial-rules.js';
import { MAX_ADDONS_PER_SELECTION } from './addon-limits.js';

export class AddonRequestError extends Error {
 constructor(status,message){super(message);this.status=status}
}
const requireValue=(ok,status,message)=>{if(!ok)throw new AddonRequestError(status,message)};
export const eligibleProjectStatuses=['paid','building','preview_ready','approved','delivered','support'];
export function extensionPricing(catalog,selection,vatRate){
 requireValue(Array.isArray(selection)&&selection.length>0&&selection.length<=MAX_ADDONS_PER_SELECTION,400,'Invalid selection');
 requireValue(new Set(selection.map(x=>x.code)).size===selection.length,400,'Duplicate add-on');
 const items=selection.map(({code,quantity})=>{
  const a=catalog.find(x=>x.code===code);
  requireValue(a&&['fixed','per_page','monthly','yearly'].includes(a.pricing_type),400,'Add-on unavailable');
  requireValue(Number.isInteger(quantity)&&quantity>=1&&quantity<=(a.pricing_type==='per_page'?(code==='extra_page'?5:50):1),400,'Invalid add-on quantity');
  const unit=Math.round(Number(a.price)*100);
  requireValue(Number.isSafeInteger(unit)&&unit>=0,400,'Invalid catalog price');
  return {code,name:a.name,description:a.description,quantity,unitPricePiasters:unit,period:a.pricing_type};
 });
 requireValue(Number.isFinite(vatRate)&&vatRate>=0&&vatRate<=100,503,'Invalid VAT configuration');
 const result=calculateUnifiedPricing({packageOptions:items.map(a=>({code:a.code,name:a.name,pricing_type:a.period,lineTotal:a.unitPricePiasters*a.quantity/100})),vatRate});
 const quoteItems=items.map(a=>({label:a.name,quantity:a.quantity,unitPricePiasters:a.unitPricePiasters,period:['monthly','yearly'].includes(a.period)?a.period:'fixed'}));
 if(result.vatAmount>0)quoteItems.push({label:'ضريبة القيمة المضافة',quantity:1,unitPricePiasters:Math.round(result.vatAmount*100),period:'fixed'});
 const total=quoteTotal(quoteItems);
 requireValue(total>0&&total===Math.round(result.total*100),400,'Price unavailable; contact administration');
 return {items,quoteItems,totalPiasters:total,vatPiasters:Math.round(result.vatAmount*100),billing:result.billing};
}
export async function addonTransaction(pool,fn){const client=await pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
async function project(client,id,customerId,lock=false){
 const q=await client.query(`SELECT d.id,d.title,d.customer_id,p.status FROM customer_project_drafts d JOIN customer_journey_projects p ON p.id=d.linked_journey_id AND p.customer_account_id=d.customer_id WHERE d.id=$1 AND d.customer_id=$2 AND d.deleted_at IS NULL ${lock?'FOR UPDATE OF d,p':''}`,[id,customerId]);const row=q.rows[0];
 requireValue(row,404,'Project not found');requireValue(eligibleProjectStatuses.includes(row.status),409,'Additional purchases are available after initial verified payment');return row;
}
export async function extensionCatalog(pool,id,customerId){
 await project(pool,id,customerId);
 const [options,settings]=await Promise.all([pool.query("SELECT code,name,description,price,pricing_type,category_code FROM shared_addons WHERE is_active=true ORDER BY sort_order,code"),pool.query("SELECT vat_rate FROM site_settings WHERE id=1")]);
 const active=await pool.query("SELECT DISTINCT service_code FROM customer_service_entitlements WHERE project_draft_id=$1 AND status='active' AND activated_at<=now() AND (expires_at IS NULL OR expires_at>now())",[id]);return {catalog:options.rows,vatRate:Number(settings.rows[0]?.vat_rate??0),activeCodes:active.rows.map(a=>a.service_code)};
}
const listSql=`SELECT r.id,r.draft_id,r.quote_id,r.items,r.created_at,r.activated_at,d.title,q.status AS quote_status,q.total_piasters,q.currency,q.valid_until,
 EXISTS(SELECT 1 FROM customer_contracts c WHERE c.quote_id=q.id AND c.status='signed') AS signed,
 COALESCE((SELECT SUM(i.amount_piasters) FROM commercial_invoices i WHERE i.quote_id=q.id AND i.status<>'void'),0) AS invoiced,
 COALESCE((SELECT SUM(i.verified_paid_piasters) FROM commercial_invoices i WHERE i.quote_id=q.id AND i.status<>'void'),0) AS verified_paid,
 NOT EXISTS(SELECT 1 FROM commercial_invoices i WHERE i.quote_id=q.id AND i.status NOT IN ('paid','void')) AS all_paid
 FROM project_addon_requests r JOIN customer_project_drafts d ON d.id=r.draft_id JOIN commercial_quotes q ON q.id=r.quote_id`;
export function canActivate(r){return !r.activated_at&&r.quote_status==='accepted'&&r.signed===true&&r.all_paid===true&&Number(r.total_piasters)>0&&Number(r.invoiced)===Number(r.total_piasters)&&Number(r.verified_paid)===Number(r.total_piasters)}
export async function listExtensions(pool,{customerId,draftId}={}){
 const q=customerId?await pool.query(listSql+' WHERE r.customer_id=$1 AND r.draft_id=$2 ORDER BY r.created_at DESC LIMIT 100',[customerId,draftId]):await pool.query(listSql+' ORDER BY (r.activated_at IS NULL) DESC,r.created_at DESC LIMIT 250');
 return q.rows.map(r=>({...r,canActivate:canActivate(r)}));
}
export async function submitExtension(pool,{draftId,customer,requestKey,selection,expectedTotalPiasters}){
 return addonTransaction(pool,async client=>{
  await project(client,draftId,customer.id,true);
  const duplicate=(await client.query('SELECT id,draft_id,quote_id,items FROM project_addon_requests WHERE customer_id=$1 AND request_key=$2',[customer.id,requestKey])).rows[0];
  if(duplicate){requireValue(duplicate.draft_id===draftId&&JSON.stringify(duplicate.items.map(({code,quantity})=>({code,quantity})).sort((a,b)=>a.code.localeCompare(b.code)))===JSON.stringify([...selection].sort((a,b)=>a.code.localeCompare(b.code))),409,'Request key already used');return duplicate}
  const catalog=(await client.query('SELECT code,name,description,price,pricing_type FROM shared_addons WHERE is_active=true AND code=ANY($1::text[]) FOR SHARE',[selection.map(a=>a.code)])).rows;
  const active=(await client.query("SELECT DISTINCT service_code FROM customer_service_entitlements WHERE project_draft_id=$1 AND status='active' AND activated_at<=now() AND (expires_at IS NULL OR expires_at>now())",[draftId])).rows.map(a=>a.service_code);
  requireValue(!catalog.some(a=>a.pricing_type!=='per_page'&&active.includes(a.code)),409,'An add-on is already active');
  const pending=(await client.query("SELECT r.items FROM project_addon_requests r JOIN commercial_quotes q ON q.id=r.quote_id WHERE r.draft_id=$1 AND r.activated_at IS NULL AND (q.status='accepted' OR (q.status IN ('draft','issued') AND (q.valid_until IS NULL OR q.valid_until>now())))",[draftId])).rows.flatMap(r=>r.items.map(a=>a.code));
  requireValue(!selection.some(a=>pending.includes(a.code)),409,'An open request already includes this add-on');
  const settings=(await client.query('SELECT vat_rate FROM site_settings WHERE id=1 FOR SHARE')).rows[0];
  const priced=extensionPricing(catalog,selection,Number(settings?.vat_rate??0));
  requireValue(priced.totalPiasters===expectedTotalPiasters,409,'Catalog price changed; refresh quotation');
  // Keep existing project, quote and accepted invoice immutable. Extensions get their own quote.
  const quote=(await client.query("INSERT INTO commercial_quotes(customer_email,customer_account_id,items,total_piasters,valid_until) VALUES($1,$2,$3::jsonb,$4,now()+interval '14 days') RETURNING id",[customer.email,customer.id,JSON.stringify(priced.quoteItems),priced.totalPiasters])).rows[0];
  const row=(await client.query("INSERT INTO project_addon_requests(draft_id,customer_id,quote_id,request_key,items) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id,draft_id,quote_id,items",[draftId,customer.id,quote.id,requestKey,JSON.stringify(priced.items)])).rows[0];
  return row;
 });
}
export async function activateExtension(pool,id,actor){
 return addonTransaction(pool,async client=>{
  const locked=(await client.query('SELECT id,quote_id,activated_at FROM project_addon_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
  requireValue(locked,404,'Request not found');
  if(locked.activated_at)return {id,activated:true,duplicate:true};
  await client.query('SELECT id FROM commercial_quotes WHERE id=$1 FOR UPDATE',[locked.quote_id]);
  await client.query('SELECT id FROM commercial_invoices WHERE quote_id=$1 FOR UPDATE',[locked.quote_id]);
  const row=(await client.query(listSql+' WHERE r.id=$1',[id])).rows[0];
  requireValue(canActivate(row),409,'Signed quote and full verified payment required');
  const owned=(await client.query('SELECT customer_id FROM customer_project_drafts WHERE id=$1 AND deleted_at IS NULL',[row.draft_id])).rows[0];
  requireValue(owned,409,'Project unavailable');await project(client,row.draft_id,owned.customer_id,true);
  for(const item of row.items){
   for(let i=0;i<item.quantity;i++){
    const interval=item.period==='monthly'?'1 month':item.period==='yearly'?'1 year':null;
    await client.query(`INSERT INTO customer_service_entitlements(customer_id,project_draft_id,service_code,service_name,description,source_type,source_id,status,activated_at,expires_at)
       VALUES($1,$2,$3,$4,$5,'addon',$6,'active',now(),CASE WHEN $7::text IS NULL THEN NULL ELSE now()+$7::interval END)`,[owned.customer_id,row.draft_id,item.code,item.name,item.description??'',`extension:${id}:${i+1}`,interval]);
   }
  }
  await client.query('UPDATE project_addon_requests SET activated_at=now(),activated_by=$2 WHERE id=$1',[id,actor]);
  await client.query("INSERT INTO audit_logs(actor,action,entity_type,entity_id,after_data) VALUES($1,'project.addons.activated','project_addon_request',$2,$3::jsonb)",[actor,id,JSON.stringify({draftId:row.draft_id,quoteId:row.quote_id})]);
  return {id,activated:true};
 });
}
