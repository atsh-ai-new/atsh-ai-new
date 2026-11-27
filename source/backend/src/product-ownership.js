export const ownershipModes=['rent','copy','code','rent_monthly'];
export const ownershipLabels={rent:'إيجار سنوي',rent_monthly:'إيجار شهري',copy:'نسخة تشغيلية',code:'ملكية الكود'};
const money=n=>Math.round(n*100)/100;
// Stable catalog slugs, not display names. Each amount is independently set.
const sectorTariffs=Object.freeze({
 eyadaty:[1490,28870,7490],agzakhana:[2490,37520,10900],ebtsama:[2790,35530,12900],hehaa:[2290,34200,9900],nabd:[2990,34870,13900],
 supermarket:[1090,34190,6490],sofra:[2490,32870,8990],market:[1990,46870,7990],gzaar:[1290,31520,5490],khodra:[1190,30190,4990],mkawel:[3990,34200,24900],
 avocato:[1790,25530,8490],accounting:[2490,38190,11900],mosek:[2190,32190,10900],emtsal:[3990,38190,18900],
 center:[2990,30190,12900],academia:[4490,36860,23900],taalm:[3490,31520,17900],
 // Education systems published in the catalog; tariffs do not create products.
 hadnty:[1690,34180,8900],madrsty:[1890,43530,16900],
 news:[2990,26190,15900],otstodyo:[3290,36860,14900],cinema:[7900,33520,44900],bas:[8900,37520,49900],
 wnsh:[8900,46870,44900],mosla:[11900,48860,64900],toktok:[7900,44200,39900],torsekl:[8900,47520,44900]
});
export function sectorTariff(key){
 const amounts=Object.hasOwn(sectorTariffs,key)?sectorTariffs[key]:null;
 return amounts?{rent:amounts[0],copy:amounts[1],code:amounts[2],rent_monthly:money(amounts[0]/10)}:null;
}
export function initialOwnership(scope,key,base){
 const tariff=scope==='sector'?sectorTariff(key):null;
 if(tariff)return tariff;
 if(base==null)return null;
 const copy=Number(base);
 if(!Number.isFinite(copy)||copy<0)return null;
 const rent=Math.round(copy*.6);
 return {rent,copy,code:Math.round(copy*2.4/10)*10,rent_monthly:money(rent/10)};
}
export function effectiveOwnership(rows){
 return Object.fromEntries(rows.map(row=>[row.mode,{list_price:Number(row.list_price),initial_price:Number(row.initial_price),discount_percent:Number(row.discount_percent),price:money(Number(row.list_price)*(100-Number(row.discount_percent))/100),period:row.mode==='rent'?'yearly':row.mode==='rent_monthly'?'monthly':'fixed'}]));
}
export async function ensureOwnership(db,scope,key,_name,base){
 const existing=await db.query("SELECT * FROM product_ownership_prices WHERE scope=$1 AND owner_key=$2",[scope,key]);
 const approved=scope==='sector'?sectorTariff(key):null;
 if(scope==='sector'&&key==='commerce-engine'&&(existing.rows.length!==ownershipModes.length||existing.rows.some(row=>Math.round(Number(row.list_price)*(100-Number(row.discount_percent)))<=0)))return null;
 if(existing.rows.length===ownershipModes.length&&(!approved||existing.rows.every(row=>Number(row.initial_price)===approved[row.mode])))return effectiveOwnership(existing.rows);
 // Commerce uses the independent, approved database seed; never infer replacement tariffs.
 if(scope==='sector'&&key==='commerce-engine')return null;
 let defaults=initialOwnership(scope,key,base);
 // Existing products keep their previously established annual baseline.
 const annual=existing.rows.find(row=>row.mode==='rent');
 if(!approved&&annual){defaults={...(defaults??Object.fromEntries(existing.rows.map(row=>[row.mode,Number(row.initial_price)]))),rent_monthly:money(Number(annual.initial_price)/10)};}
 if(!defaults||ownershipModes.some(m=>!Number.isFinite(defaults[m])))return null;
 // When the code baseline changes, update only prices still following their old
 // baseline. Explicitly edited amounts and discounts remain untouched.
 await db.query(`INSERT INTO product_ownership_prices(scope,owner_key,mode,list_price,initial_price)
 SELECT $1,$2,mode,amount,amount FROM unnest($3::text[],$4::numeric[]) AS t(mode,amount)
 ON CONFLICT (scope,owner_key,mode) DO UPDATE SET
 list_price=CASE WHEN product_ownership_prices.list_price=product_ownership_prices.initial_price THEN EXCLUDED.initial_price ELSE product_ownership_prices.list_price END,
 initial_price=EXCLUDED.initial_price
 WHERE $5 AND product_ownership_prices.initial_price<>EXCLUDED.initial_price`,[scope,key,ownershipModes,ownershipModes.map(m=>defaults[m]),Boolean(approved)]);
 return effectiveOwnership((await db.query('SELECT * FROM product_ownership_prices WHERE scope=$1 AND owner_key=$2',[scope,key])).rows);
}
export async function resetOwnership(db,scope,key,name,base){
 const before=await ensureOwnership(db,scope,key,name,base);
 if(!before)return {before:null,prices:null};
 const result=await db.query("UPDATE product_ownership_prices SET list_price=initial_price,discount_percent=0 WHERE scope=$1 AND owner_key=$2 RETURNING *",[scope,key]);
 return {before,prices:effectiveOwnership(result.rows)};
}
export function resolveOwnership(prices,mode){
 if(!ownershipModes.includes(mode)||!prices?.[mode]||!Number.isFinite(prices[mode].price)||prices[mode].price<0)throw Error('Ownership price unavailable');
 return prices[mode];
}

// Only the recalculated executable-copy tier has an agreed online amount.
// Keep other rates internally for audit/reset; they are not public offers.
const recalculatedPackages=new Set([
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222',
 '33333333-3333-4333-8333-333333333333'
]);
// New CMS entries with one scoped delivery price must not expose invented rental or source rates.
const copyPricedCatalogItems=new Set(['naghma','liqaa']);
export const isNewCatalogOffer=(scope,key)=>scope==='package'?recalculatedPackages.has(key):scope==='sector'&&(copyPricedCatalogItems.has(key)||Boolean(sectorTariff(key)));
export function publicOwnership(scope,key,prices){
 return prices&&isNewCatalogOffer(scope,key)?{copy:prices.copy}:prices;
}
