export type BillingPeriod="fixed"|"monthly"|"yearly";
export type PricedLine={amount:number;period?: "شهري"|"سنوي"};
export type SectorPriceLine={code:string;name:string;price:number;pricingType:BillingPeriod};
export type SectorPriceQuote={needsCustomQuote:boolean;items:SectorPriceLine[]};
export type BasePriceQuote={items:PricedLine[];needsCustomQuote:boolean};
const sum=(values:number[])=>Math.round(values.reduce((a,b)=>a+b,0)*100)/100;
export function combinedQuoteSummary(base:BasePriceQuote,sector:SectorPriceQuote|null,vatRate:number){
  const sectorLines=sector&&!sector.needsCustomQuote?sector.items:[];
  const baseFixed=sum(base.items.filter(x=>!x.period).map(x=>x.amount));
  const baseMonthly=sum(base.items.filter(x=>x.period==="شهري").map(x=>x.amount));
  const baseYearly=sum(base.items.filter(x=>x.period==="سنوي").map(x=>x.amount));
  const oneTime=sum([baseFixed,...sectorLines.filter(x=>x.pricingType==="fixed").map(x=>x.price)]);
  const monthly=sum([baseMonthly,...sectorLines.filter(x=>x.pricingType==="monthly").map(x=>x.price)]);
  const yearly=sum([baseYearly,...sectorLines.filter(x=>x.pricingType==="yearly").map(x=>x.price)]);
  const initialSubtotal=sum([oneTime,monthly,yearly]);
  if(!Number.isFinite(vatRate)||vatRate<0||vatRate>100)throw new Error("Invalid VAT");
  const initialTax=Math.round(initialSubtotal*vatRate)/100;
  return {oneTime,monthly,yearly,initialSubtotal,initialTax,initialTotal:sum([initialSubtotal,initialTax]),needsCustomQuote:base.needsCustomQuote||Boolean(sector?.needsCustomQuote)};
}
