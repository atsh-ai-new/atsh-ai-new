export const ownershipModes=['rent','copy','code'];
export const ownershipLabels={rent:'إيجار سنوي',copy:'نسخة تشغيلية',code:'ملكية الكود'};
export const ownershipConflicts=(mode,code)=>mode==='rent'&&code==='hosting';
const money=n=>Math.round(n*100)/100;
const sectorTariffs={
 'عيادتي':[1490,2490],'ابتسامة':[2790,4490],'حياة':[2290,3490],'نبض':[2490,3990],'أجزخانة':[2490,4490],'اجزخانة':[2490,4490],
 'سوبر ماركت':[1090,2290],'مطعم':[2790,5990],'ماركت':[2490,3990],'جزار':[2490,4490],'خضرة':[2390,4290],'مقاول':[5990,12900],
 'أفوكاتو':[1790,3490],'محامي':[1790,3490],'محاسبة قانونية':[3990,7900],'موثق':[2990,5990],'امتثال':[4990,9900],
 'أكاديمية':[5490,8900],'سنتر':[2990,4490],'تعلّم':[3990,5990],'تعلم':[3990,5990],
 'خبر':[3490,6900],'سينما':[8900,19900],'ونش':[9900,19900],'وصلني':[12900,24900],'توكتوك':[7900,14900],'تروسيكل':[8900,17900]
};
export function initialOwnership(scope,name,base){
 if(base==null)return null;
 const pair=scope==='sector'?sectorTariffs[String(name).trim()]:null;
 const copy=pair?.[1]??Number(base);
 if(!Number.isFinite(copy)||copy<0)return null;
 return {rent:pair?.[0]??Math.round(copy*.6),copy,code:Math.round(copy*2.4/10)*10};
}
export function effectiveOwnership(rows){
 return Object.fromEntries(rows.map(row=>[row.mode,{list_price:Number(row.list_price),initial_price:Number(row.initial_price),discount_percent:Number(row.discount_percent),price:money(Number(row.list_price)*(100-Number(row.discount_percent))/100),period:row.mode==='rent'?'yearly':'fixed'}]));
}
export async function ensureOwnership(db,scope,key,name,base){
 const existing=await db.query("SELECT * FROM product_ownership_prices WHERE scope=$1 AND owner_key=$2",[scope,key]);
 if(existing.rows.length===3)return effectiveOwnership(existing.rows);
 const defaults=initialOwnership(scope,name,base);
 if(!defaults)return null;
 await db.query(`INSERT INTO product_ownership_prices(scope,owner_key,mode,list_price,initial_price)
 SELECT $1,$2,mode,amount,amount FROM unnest($3::text[],$4::numeric[]) AS t(mode,amount)
 ON CONFLICT DO NOTHING`,[scope,key,ownershipModes,ownershipModes.map(m=>defaults[m])]);
 return effectiveOwnership((await db.query('SELECT * FROM product_ownership_prices WHERE scope=$1 AND owner_key=$2',[scope,key])).rows);
}
export function resolveOwnership(prices,mode){
 if(!ownershipModes.includes(mode)||!prices?.[mode]||!Number.isFinite(prices[mode].price)||prices[mode].price<0)throw Error('Ownership price unavailable');
 return prices[mode];
}
