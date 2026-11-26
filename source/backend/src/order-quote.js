// Transform the server-verified order snapshot into contractual quote lines.
// Reject drift; never trust a browser-provided amount or price list.
function toPiasters(value){
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||n>1e9)throw Error("Invalid order amount");
 const cents=Math.round(n*100);
 if(Math.abs(cents/100-n)>0.000001)throw Error("Order amount is not representable in piasters");
 return cents;
}
export function deriveQuoteFromOrder(order){
 const s=order?.snapshot;
 if(!s||!s.package||!Array.isArray(s.options))throw Error("Order snapshot missing");
 const lines=[];
 const add=(label,amount,period="fixed",quantity=1)=>{
  if(typeof label!=="string"||!label.trim()||label.length>250||!Number.isInteger(quantity)||quantity<1||quantity>100)return false;
  const total=toPiasters(amount);
  if(total>0)lines.push({label,quantity:1,unitPricePiasters:total,period});
  return true;
 };
 if(!add(`الباقة: ${s.package.name||"مشروع"}`,s.package.price,s.package.pricingPeriod??"fixed"))throw Error("Invalid package line");
 for(const option of s.options){
  const period=option.pricing_type==="monthly"?"monthly":option.pricing_type==="yearly"?"yearly":"fixed";
  if(!add(option.name||"إضافة",option.lineTotal,period,1))throw Error("Invalid option line");
 }
 for(const option of s.sector?.items||[]){
  const period=["fixed","monthly","yearly"].includes(option.pricingType)?option.pricingType:null;
  if(!period||!add(option.name,option.price,period,1))throw Error("Invalid sector line");
 }
 if(s.vatAmount!==null&&s.vatAmount!==undefined){
  if(!add(`ضريبة القيمة المضافة (${s.vatRate}%)`,s.vatAmount))throw Error("Invalid VAT line");
 }
 const sum=lines.reduce((n,line)=>n+line.unitPricePiasters,0);
 if(sum!==toPiasters(s.total)||sum!==toPiasters(order.total))throw Error("Order and quote totals do not reconcile");
 if(!lines.length)throw Error("Order has no priced lines");
 return {items:lines,totalPiasters:sum,currency:order.currency||s.currency||"EGP"};
}
