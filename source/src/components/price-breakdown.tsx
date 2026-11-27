import type {DraftInvoice} from "@/lib/customer-workspace";

import {roundMoney,type PriceSummary} from "@/lib/price-summary";
export function billingLabel(period:string, locale:"ar"|"en") {
 const en=locale==="en";
 return period==="monthly"?(en?"Monthly":"شهريًا"):period==="yearly"?(en?"Yearly":"سنويًا"):(en?"One time":"مرة واحدة");
}
export function priceMoney(amount:number,locale:"ar"|"en",currency="EGP"){
 return new Intl.NumberFormat(locale==="en"?"en-EG":"ar-EG",{maximumFractionDigits:2}).format(amount)+" "+(locale==="ar"&&currency==="EGP"?"ج.م":currency);
}
export function PriceBreakdown({summary,locale,items,domain}:{summary:PriceSummary,locale:"ar"|"en",items?:DraftInvoice["items"],domain?:string}){
 const t=(ar:string,en:string)=>locale==="en"?en:ar;
 const money=(value:number)=>priceMoney(value,locale);
 const row=(label:string,amount:number,large=false)=><div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"7px 0",fontSize:large?19:14,borderTop:large?"1px solid #b9c8d9":undefined}}><span>{label}</span><strong data-price-initial={large?summary.total:undefined} style={{whiteSpace:"nowrap"}}>{money(amount)}</strong></div>;
 return <>
  {items?.map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"10px 0",borderBottom:"1px solid #dce4ef"}}><span>{item.name}<small style={{display:"block",color:"#52667b"}}>{billingLabel(item.period,locale)}</small></span><strong style={{whiteSpace:"nowrap"}}>{money(item.amount)}</strong></div>)}
  {domain&&<p style={{fontSize:14}}>{t("الدومين المختار","Selected domain")}: <b dir="ltr">{domain}</b><small style={{display:"block",color:"#52667b"}}>{t("رسوم الحجز غير المؤكدة ليست ضمن الإجمالي.","Unconfirmed registration fees are not included.")}</small></p>}
  {row(t("قبل الضريبة","Before VAT"),summary.subtotal)}
  {row(t("الضريبة","VAT"),summary.vat)}
  {row(t("إجمالي الدفعة الأولى شامل الضريبة","Initial total incl. VAT"),summary.total,true)}
  {(summary.monthly>0||summary.yearly>0)&&<div style={{marginTop:8,color:"#415973"}}>
   <small>{t("الرسوم الدورية قبل الضريبة","Recurring charges before VAT")}</small>
   {summary.monthly>0&&row(t("كل شهر","Every month"),summary.monthly)}
   {summary.yearly>0&&row(t("كل سنة","Every year"),summary.yearly)}
   {row(summary.monthly>0?t("أول سنة إذا استمر 12 شهرًا","First year if kept for 12 months"):t("إجمالي أول سنة قبل الضريبة","First-year total before VAT"),roundMoney(summary.fixed+summary.monthly*12+summary.yearly))}
  </div>}
  <small style={{display:"block",marginTop:10,color:"#52667b"}}>{t("تقدير للمراجعة. لا يتم تحصيل مبلغ عند إرسال الطلب.","Estimate for review. Sending the request does not charge you.")}</small>
 </>;
}
