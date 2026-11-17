export type SectorPriceLine={code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"};
export type SectorPriceQuote={needsCustomQuote:boolean;items:SectorPriceLine[]};
export type BasePriceQuote={subtotal:number;recurring:number;needsCustomQuote:boolean};
export function combinedQuoteSummary(base:BasePriceQuote,sector:SectorPriceQuote|null,vatRate:number){
  const lines=sector&&!sector.needsCustomQuote?sector.items:[];
  const sectorFixed=lines.filter(line=>line.pricingType==="fixed").reduce((sum,line)=>sum+line.price,0);
  const sectorMonthly=lines.filter(line=>line.pricingType==="monthly").reduce((sum,line)=>sum+line.price,0);
  const sectorYearly=lines.filter(line=>line.pricingType==="yearly").reduce((sum,line)=>sum+line.price,0);
  const annual=base.recurring+sectorYearly;
  const monthly=sectorMonthly;
  const oneTime=base.subtotal-base.recurring+sectorFixed;
  const subtotal=oneTime+annual+monthly; // Initial billing period, NOT total lifetime cost
  const tax=Math.round(subtotal*vatRate)/100;
  return {oneTime,annual,monthly,subtotal,tax,total:subtotal+tax,needsCustomQuote:base.needsCustomQuote||Boolean(sector?.needsCustomQuote)};
}
