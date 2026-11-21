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
