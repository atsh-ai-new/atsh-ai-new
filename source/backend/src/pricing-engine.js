// One server-side calculator for package and sector line items.
// Source records remain in their existing tables until a reviewed data migration.
const money=value=>Math.round(value*100)/100;
export function calculateUnifiedPricing({packagePrice=0,packagePeriod="fixed",packageOptions=[],sectorQuote=null,vatRate=null}){
  const lines=[
    {code:"package",name:"Package",amount:Number(packagePrice),period:packagePeriod},
    ...packageOptions.map(option=>({code:option.code,name:option.name,amount:Number(option.lineTotal),period:option.pricing_type==="monthly"?"monthly":option.pricing_type==="yearly"?"yearly":"fixed"})),
    ...(sectorQuote?.items??[]).map(item=>({code:item.code,name:item.name,amount:Number(item.price),period:item.pricingType}))
  ];
  if(lines.some(line=>!Number.isFinite(line.amount)||line.amount<0))throw new Error("Invalid pricing line");
  const subtotal=money(lines.reduce((sum,line)=>sum+line.amount,0));
  const vatAmount=vatRate==null?null:money(subtotal*Number(vatRate)/100);
  const total=money(subtotal+(vatAmount??0));
  const billing=Object.fromEntries(["fixed","monthly","yearly"].map(period=>[period,money(lines.filter(line=>line.period===period).reduce((sum,line)=>sum+line.amount,0))]));
  return {lines,subtotal,vatAmount,total,billing};
}
