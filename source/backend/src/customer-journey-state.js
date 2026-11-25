// Projects linked to commercial quotes must have a fully reconciled balance
// before final delivery. Legacy projects without a current quote retain their existing policy.
export const fullPaymentGateSql = (projectExpression) => `NOT EXISTS (
 SELECT 1 FROM (
  SELECT quote_id FROM commercial_order_quote_links WHERE project_id=${projectExpression} AND is_current=true
  UNION SELECT quote_id FROM commercial_custom_quote_links WHERE project_id=${projectExpression} AND is_current=true
 ) linked JOIN commercial_quotes q ON q.id=linked.quote_id
 WHERE q.status<>'accepted'
 OR NOT EXISTS(SELECT 1 FROM customer_contracts c WHERE c.quote_id=q.id AND c.status='signed')
 OR EXISTS(SELECT 1 FROM commercial_invoice_revision_requests r WHERE r.quote_id=q.id AND r.status='issued')
 OR (SELECT COALESCE(sum(p.amount_piasters),0) FROM commercial_invoice_payments p JOIN commercial_invoices i ON i.id=p.invoice_id WHERE i.quote_id=q.id)
    -(SELECT COALESCE(sum(r.amount_piasters),0) FROM commercial_refund_payments r WHERE r.quote_id=q.id)<q.total_piasters
)`;
// Central lifecycle rules. Financial verification is handled by the payment ledger,
// never by a manually requested status transition.
export const journeyTransitions=Object.freeze({
 draft:['configured','quoted'],configured:['quoted'],quoted:['payment_pending'],
 payment_pending:['paid'],paid:['building'],building:['preview_ready'],
 preview_ready:['building','approved'],approved:['delivered'],delivered:['support'],support:[]
});
export function canJourneyTransition(previous,next,{manual=false,note='',paymentVerified=false}={}){
 if(next==='paid'&&(manual||!paymentVerified))return false;
 if(manual&&previous==='draft'&&next==='quoted')return false;
 if(!journeyTransitions[previous]?.includes(next))return false;
 if(manual&&next==='delivered'&&!String(note).trim())return false;
 return true;
}

/**
 * Transition one locked project using the same lifecycle rules across modules.
 * Must be called inside the caller's database transaction.
 * The payment-confirmation caller must separately verify the payment ledger.
 */
export async function transitionJourneyProject(client,{projectId,next,manual=false,note='',actor='system',expectedStatus=null,paymentVerified=false}){
 const found=await client.query('SELECT id,status FROM customer_journey_projects WHERE id=$1 FOR UPDATE',[projectId]);
 if(!found.rowCount)return {ok:false,reason:'not_found'};
 const previous=found.rows[0].status;
 if(expectedStatus!==null&&previous!==expectedStatus)return {ok:false,reason:'status_changed',currentStatus:previous};
 if(!canJourneyTransition(previous,next,{manual,note,paymentVerified}))return {ok:false,reason:'transition_denied',currentStatus:previous};
 if(next==='delivered'||next==='support'){
  const gate=await client.query(`SELECT ${fullPaymentGateSql('$1')} AS allowed`,[projectId]);
  if(!gate.rows[0]?.allowed)return {ok:false,reason:'outstanding_payment',currentStatus:previous};
 }
 const updated=await client.query('UPDATE customer_journey_projects SET status=$2,updated_at=now() WHERE id=$1 AND status=$3 RETURNING id,status,updated_at',[projectId,next,previous]);
 if(!updated.rowCount)return {ok:false,reason:'status_changed',currentStatus:previous};
 await client.query("INSERT INTO audit_logs(actor,action,entity_type,entity_id,before_data,after_data) VALUES($1,'journey.status.changed','customer_journey_project',$2,$3::jsonb,$4::jsonb)",[actor,projectId,JSON.stringify({status:previous}),JSON.stringify({status:next,note:note||null})]);
 return {ok:true,project:updated.rows[0],previous};
}
