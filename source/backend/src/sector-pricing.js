import {MAX_ADDONS_PER_SELECTION} from "./addon-limits.js";
import { calculateUnifiedPricing } from "./pricing-engine.js";
// Server-owned sector pricing. Never accept numeric prices from browser input.
const types=new Set(["fixed","monthly","yearly","per_page"]);
function validMoney(value){
  return typeof value==="number" && Number.isFinite(value) && value>=0 && value<=100_000_000 && Math.abs(Math.round(value*100)-value*100)<1e-6;
}
export function priceSectorSelection(catalog,slug,requestedCodes=[],quantities={}){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error("Invalid sector");
  if(!Array.isArray(catalog))throw new Error("Sector catalog unavailable");
  const item=catalog.find(x=>x?.slug===slug && x.published===true && !x.archived);
  if(!item)throw new Error("Sector is not published");
  if(!Array.isArray(requestedCodes) || requestedCodes.length>MAX_ADDONS_PER_SELECTION || new Set(requestedCodes).size!==requestedCodes.length)throw new Error("Invalid sector extras");
  if(!validMoney(item.basePrice))return {sectorSlug:slug,sectorName:item.name,needsCustomQuote:true,items:[],subtotal:0,monthly:0,yearly:0};
  const declared=Array.isArray(item.pricedAddons)?item.pricedAddons:[];
  const byCode=new Map();
  for(const option of declared){
    if(typeof option?.code!=="string"||!/^[a-z0-9_-]{1,80}$/.test(option.code)||byCode.has(option.code)||!validMoney(option.price)||!types.has(option.pricingType)||typeof option.name!=="string")throw new Error("Invalid sector pricing configuration");
    byCode.set(option.code,option);
  }
  const lines=[{code:"sector-base",name:`تخصيص نظام ${item.name}`,price:item.basePrice,pricingType:"fixed"}];
  for(const code of new Set([...requestedCodes,...declared.filter(a=>a.isRequired).map(a=>a.code)])){
    const selected=byCode.get(code);
    if(!selected)throw new Error("Sector addon not published");
    const quantity=selected.pricingType==="per_page"?Number(quantities[code]??1):1;
    if(!Number.isInteger(quantity)||quantity<1||quantity>50||(code==="extra_page"&&quantity>5))throw new Error("Invalid sector add-on quantity");
    lines.push({code:selected.code,name:selected.name,price:selected.price*quantity,pricingType:selected.pricingType==="per_page"?"fixed":selected.pricingType});
  }
  const calculated=calculateUnifiedPricing({packagePrice:0,sectorQuote:{items:lines}});
  return {
    sectorSlug:slug,sectorName:item.name,needsCustomQuote:false,items:lines,
    subtotal:calculated.subtotal,
    monthly:calculated.billing.monthly,
    yearly:calculated.billing.yearly
  };
}
