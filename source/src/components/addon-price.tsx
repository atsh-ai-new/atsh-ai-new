type DiscountedPrice={code?:string;pricing_type?:string;pricingType?:string;price:number|string;list_price?:number|string|null;discount_percent?:number|string|null};
export default function AddonPrice({item,locale="ar",suffix="",prefix=""}:{item:DiscountedPrice;locale?:"ar"|"en";suffix?:string;prefix?:string}){
 const current=Number(item.price),original=Number(item.list_price??current),discount=Number(item.discount_percent??0);
 const en=locale==="en",money=(n:number)=>n.toLocaleString(en?"en-EG":"ar-EG",{maximumFractionDigits:2})+" "+(en?"EGP":"ج.م");
 const reduced=discount>0&&original>current;
 const annualHosting=item.code==="hosting"&&(item.pricing_type??item.pricingType)==="yearly";
 const priceSuffix=annualHosting?(en?" / annual subscription (12 months)":" / اشتراك سنوي (12 شهرًا)"):suffix;
 return <span className="addon-price-display">
  {reduced&&<><del className="addon-price-original">{money(original)}</del><span className="addon-discount-badge" aria-label={en?`${discount}% discount`:`خصم ${discount}%`}>{en?`-${discount}%`:`خصم ${discount}%`}</span></>}
  <b className="addon-price-current">{prefix}{money(current)}{priceSuffix}</b>
 </span>;
}
