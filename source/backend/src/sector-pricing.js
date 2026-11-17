// Server-owned sector pricing. Never accept numeric prices from browser input.
const types=new Set(["fixed","monthly","yearly"]);
function validMoney(value){
  return typeof value==="number" && Number.isFinite(value) && value>=0 && value<=100_000_000 && Math.abs(Math.round(value*100)-value*100)<1e-6;
}
export function priceSectorSelection(catalog,slug,requestedCodes=[]){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error("Invalid sector");
  if(!Array.isArray(catalog))throw new Error("Sector catalog unavailable");
  const item=catalog.find(x=>x?.slug===slug && x.published===true && !x.archived);
  if(!item)throw new Error("Sector is not published");
  if(!Array.isArray(requestedCodes) || requestedCodes.length>30 || new Set(requestedCodes).size!==requestedCodes.length)throw new Error("Invalid sector extras");
  if(!validMoney(item.basePrice))return {sectorSlug:slug,sectorName:item.name,needsCustomQuote:true,items:[],subtotal:0,monthly:0,yearly:0};
  const declared=Array.isArray(item.pricedAddons)?item.pricedAddons:[];
  const byCode=new Map();
  for(const option of declared){
    if(typeof option?.code!=="string"||!/^[a-z0-9_-]{1,80}$/.test(option.code)||byCode.has(option.code)||!validMoney(option.price)||!types.has(option.pricingType)||typeof option.name!=="string")throw new Error("Invalid sector pricing configuration");
    byCode.set(option.code,option);
  }
  const lines=[{code:"sector-base",name:`تخصيص نظام ${item.name}`,price:item.basePrice,pricingType:"fixed"}];
  for(const code of requestedCodes){
    const selected=byCode.get(code);
    if(!selected)throw new Error("Sector addon not published");
    lines.push({code:selected.code,name:selected.name,price:selected.price,pricingType:selected.pricingType});
  }
  return {
    sectorSlug:slug,sectorName:item.name,needsCustomQuote:false,items:lines,
    subtotal:lines.reduce((sum,line)=>sum+line.price,0),
    monthly:lines.filter(l=>l.pricingType==="monthly").reduce((sum,line)=>sum+line.price,0),
    yearly:lines.filter(l=>l.pricingType==="yearly").reduce((sum,line)=>sum+line.price,0)
  };
}
