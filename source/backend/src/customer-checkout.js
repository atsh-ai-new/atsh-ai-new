// A signed and accepted quote can have a previously reviewed installment plan,
// or one pending invoice when no plan was created. Never infer payment from consent.
export function validateCheckoutGate({quote,contract,hasPendingChangeRequest=false,expectedRevision,expectedContractId}){
 if(!quote||!contract)return "Quote or contract not found";
 if(String(quote.status)!=="issued")return "Only an issued quote may be accepted";
 if(quote.valid_until&&new Date(quote.valid_until).getTime()<=Date.now())return "Quote expired";
 if(Number(quote.revision)!==Number(expectedRevision))return "Quote revision has changed";
 if(Number(contract.id)!==Number(expectedContractId)||contract.status!=="issued")return "Contract revision unavailable";
 if(hasPendingChangeRequest)return "A change request is awaiting review";
 return null;
}
export async function ensureInvoiceScheduleOnAcceptance(client,{quoteId,totalPiasters}){
 const total=Number(totalPiasters);
 if(!Number.isSafeInteger(quoteId)||quoteId<1||!Number.isSafeInteger(total)||total<1)throw Error("Invalid monetary quote");
 const existing=await client.query("SELECT id,amount_piasters,status,verified_paid_piasters FROM commercial_invoices WHERE quote_id=$1 ORDER BY id FOR UPDATE",[quoteId]);
 const active=existing.rows.filter(row=>row.status!=="void");
 if(active.length){
  const scheduled=active.reduce((sum,row)=>sum+Number(row.amount_piasters),0);
  if(!Number.isSafeInteger(scheduled)||scheduled!==total)throw Error("Invoice installments do not reconcile with the accepted quote");
  return {invoices:active,created:false};
 }
 // No payment status is ever written here. The invoice awaits a gateway event
 // (or independent verified finance evidence entered by a privileged admin).
 const inserted=await client.query("INSERT INTO commercial_invoices(quote_id,amount_piasters,due_at,status,verified_paid_piasters) VALUES($1,$2,NULL,'unpaid',0) RETURNING id,quote_id,amount_piasters,due_at,status,verified_paid_piasters",[quoteId,total]);
 return {invoices:inserted.rows,created:true};
}
