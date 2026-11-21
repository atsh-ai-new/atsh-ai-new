// Central lifecycle rules. Financial verification is handled by the payment ledger,
// never by a manually requested status transition.
export const journeyTransitions=Object.freeze({
 draft:['configured','quoted'],configured:['quoted'],quoted:['payment_pending'],
 payment_pending:[],paid:['building'],building:['preview_ready'],
 preview_ready:['building','approved'],approved:['delivered'],delivered:['support'],support:[]
});
export function canJourneyTransition(previous,next,{manual=false,note=''}={}){
 if(manual&&next==='paid')return false;
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
export async function transitionJourneyProject(client,{projectId,next,manual=false,note='',actor='system',expectedStatus=null}){
 const found=await client.query('SELECT id,status FROM customer_journey_projects WHERE id=$1 FOR UPDATE',[projectId]);
 if(!found.rowCount)return {ok:false,reason:'not_found'};
 const previous=found.rows[0].status;
 if(expectedStatus!==null&&previous!==expectedStatus)return {ok:false,reason:'status_changed',currentStatus:previous};
 if(!canJourneyTransition(previous,next,{manual,note}))return {ok:false,reason:'transition_denied',currentStatus:previous};
 const updated=await client.query('UPDATE customer_journey_projects SET status=$2,updated_at=now() WHERE id=$1 AND status=$3 RETURNING id,status,updated_at',[projectId,next,previous]);
 if(!updated.rowCount)return {ok:false,reason:'status_changed',currentStatus:previous};
 await client.query("INSERT INTO audit_logs(actor,action,entity_type,entity_id,before_data,after_data) VALUES($1,'journey.status.changed','customer_journey_project',$2,$3::jsonb,$4::jsonb)",[actor,projectId,JSON.stringify({status:previous}),JSON.stringify({status:next,note:note||null})]);
 return {ok:true,project:updated.rows[0],previous};
}
