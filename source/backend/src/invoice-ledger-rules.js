import {createHash} from "node:crypto";
// Pure helpers: integer piasters only; never use floating point currency math.
export function invoiceBalance(amount,paid){
 if(!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(paid)||paid<0||paid>amount)throw new RangeError('Invalid invoice balance');
 return {amountPiasters:amount,paidPiasters:paid,remainingPiasters:amount-paid};
}
export function dueState({status,amountPiasters,paidPiasters,dueAt},today){
 const b=invoiceBalance(amountPiasters,paidPiasters);
 if(status==='void')return 'void';
 if(b.remainingPiasters===0)return 'paid';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw new RangeError('Invalid today');
 const due=typeof dueAt==='string'?dueAt.slice(0,10):dueAt instanceof Date?dueAt.toISOString().slice(0,10):null;
 return due&&due<today?'overdue':'upcoming';
}
export function validCalendarDate(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const d=new Date(date+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===date;
}

// UUID audit table identity for a bigint commercial invoice ID.
export function commercialInvoiceAuditId(id){const h=createHash("sha256").update("commercial-invoice:"+String(id)).digest("hex");return h.slice(0,8)+"-"+h.slice(8,12)+"-4"+h.slice(13,16)+"-a"+h.slice(17,20)+"-"+h.slice(20,32)}
