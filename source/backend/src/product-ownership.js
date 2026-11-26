export const ownershipModes=['rent','copy','code','rent_monthly'];
export const ownershipLabels={rent:'إيجار سنوي',rent_monthly:'إيجار شهري',copy:'نسخة تشغيلية',code:'ملكية الكود'};
export const ownershipConflicts=(mode,code)=>(mode==='rent'||mode==='rent_monthly')&&code==='hosting';
const money=n=>Math.round(n*100)/100;
// Stable catalog slugs, not display names. Each amount is independently set.
const sectorTariffs=Object.freeze({
 eyadaty:[1490,2490,7490],agzakhana:[2490,4490,10900],ebtsama:[2790,4990,12900],hehaa:[2290,3990,9900],nabd:[2990,5490,13900],
 supermarket:[1090,2290,6490],sofra:[2490,3490,8990],market:[1990,3490,7990],gzaar:[1290,1790,5490],khodra:[1190,1690,4990],mkawel:[3990,9900,24900],
 avocato:[1790,3490,8490],accounting:[2490,4990,11900],mosek:[2190,4490,10900],emtsal:[3990,7900,18900],
 center:[2990,5490,12900],academia:[4490,9900,23900],taalm:[3490,7490,17900],
 // Education systems published in the catalog; tariffs do not create products.
 hadnty:[1690,3290,8900],madrsty:[1890,5990,16900],
 news:[2990,6900,15900],otstodyo:[3290,6490,14900],cinema:[7900,19900,44900],bas:[8900,21900,49900],
 wnsh:[8900,19900,44900],mosla:[11900,27900,64900],toktok:[7900,17900,39900],torsekl:[8900,19900,44900]
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
 if(existing.rows.length===ownershipModes.length&&(!approved||existing.rows.every(row=>Number(row.initial_price)===approved[row.mode])))return effectiveOwnership(existing.rows);
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
