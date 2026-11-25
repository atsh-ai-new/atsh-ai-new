import { createHash } from 'node:crypto';
import { quoteTotal } from './commercial-rules.js';
export const paymentMethods = Object.freeze(['cash','bank_transfer','instapay','wallet_direct','xpay']);
export function validateMethods(methods) {
 if (!Array.isArray(methods) || !methods.length || new Set(methods).size !== methods.length || methods.some(m=>!paymentMethods.includes(m))) throw Error('Invalid payment methods');
 return [...methods];
}
function money(n) { if (!Number.isSafeInteger(n)||n<0) throw Error('Invalid piasters'); return n; }
export function revisedBalance(total,paid) {
 money(total);money(paid);
 return {totalPiasters:total,paidPiasters:paid,remainingPiasters:Math.max(0,total-paid),creditPiasters:Math.max(0,paid-total)};
}
export function revisionProposal({items,paidPiasters,schedule,reason}) {
 if (!Array.isArray(items)||items.length>100) throw Error('Invalid items');
 const total=items.length?quoteTotal(items):0;
 const balance=revisedBalance(total,paidPiasters);
 if(typeof reason!=='string'||!reason.trim()||reason.length>2000)throw Error('Revision reason required');
 if(!Array.isArray(schedule)||schedule.length>60)throw Error('Invalid schedule');
 let sum=0;
 for(const row of schedule){
  if(!row||money(row.amountPiasters)===0||typeof row.milestone!=='string'||!row.milestone.trim()||row.milestone.length>200)throw Error('Invalid installment');
  sum=money(sum+row.amountPiasters);
 }
 if(sum!==balance.remainingPiasters)throw Error('Schedule must match outstanding balance');
 return {...balance,items,schedule,reason:reason.trim()};
}
export function contractPdf(bytes) {
 if(!Buffer.isBuffer(bytes)||bytes.length<8||bytes.length>5242880||bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.subarray(-1024).includes(Buffer.from('%%EOF')))throw Error('Invalid PDF');
 return {sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length};
}
export function canCollect({quoteStatus,contractStatus,revisionPending,method,methods,released,remainingPiasters}) {
 return quoteStatus==='accepted'&&contractStatus==='signed'&&revisionPending===false&&released===true&&Number.isSafeInteger(remainingPiasters)&&remainingPiasters>0&&paymentMethods.includes(method)&&Array.isArray(methods)&&methods.includes(method);
}
