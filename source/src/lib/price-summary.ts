import type {DraftInvoice} from "./customer-workspace";

export type PriceSummary=Pick<DraftInvoice,"subtotal"|"vat"|"total"|"fixed"|"monthly"|"yearly">;
export const roundMoney=(value:number)=>Math.round(value*100)/100;
export function summarizePrice(items:DraftInvoice["items"],vatRate:number|null):PriceSummary|null {
 if(vatRate===null||!Number.isFinite(vatRate)||vatRate<0||vatRate>100||items.some(item=>!Number.isFinite(item.amount)||item.amount<0))return null;
 const sum=(rows:DraftInvoice["items"])=>roundMoney(rows.reduce((total,row)=>total+row.amount,0));
 const subtotal=sum(items);
 const vat=roundMoney(subtotal*vatRate/100);
 return {
  subtotal,vat,total:roundMoney(subtotal+vat),
  fixed:sum(items.filter(i=>i.period==="fixed")),
  monthly:sum(items.filter(i=>i.period==="monthly")),
  yearly:sum(items.filter(i=>i.period==="yearly")),
 };
}
