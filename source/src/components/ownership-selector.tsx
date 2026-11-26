"use client";
import AddonPrice from "./addon-price";
export type OwnershipMode="rent"|"copy"|"code";
export type OwnershipPrice={price:number;list_price:number;initial_price:number;discount_percent:number;period:"fixed"|"yearly"};
export type OwnershipPrices=Record<OwnershipMode,OwnershipPrice>;
export const ownershipModes=["rent","copy","code"] as const;
export const ownershipName=(mode:OwnershipMode,en=false)=>({rent:en?"Annual rental":"إيجار سنوي",copy:en?"Licensed copy":"نسخة تشغيلية",code:en?"Source code ownership":"ملكية الكود"}[mode]);
export default function OwnershipSelector({prices,mode,onChange,locale="ar"}:{prices:OwnershipPrices|null|undefined;mode:OwnershipMode;onChange:(mode:OwnershipMode)=>void;locale?:"ar"|"en"}){
 const en=locale==="en";
 if(!prices)return <p role="status">{en?"Prices pending setup":"أسعار التملك قيد التجهيز"}</p>;
 return <fieldset style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",minWidth:0,maxWidth:"100%",boxSizing:"border-box",gap:8,border:"1px solid #dbe4ee",borderRadius:12,padding:12,margin:"12px 0"}}>
 <legend style={{fontWeight:800}}>{en?"Choose delivery and ownership":"اختر طريقة التشغيل والتملك"}</legend>
 {ownershipModes.map(m=><label key={m} style={{display:"flex",minWidth:0,gap:10,alignItems:"center",padding:10,border:"1px solid "+(mode===m?"#315a86":"#dbe4ee"),borderRadius:9,background:mode===m?"#edf3fa":"white",cursor:"pointer"}}><input type="radio" name="ownership-mode" value={m} checked={mode===m} onChange={()=>onChange(m)} style={{flex:"0 0 20px",width:20,minWidth:20,height:20,margin:0,accentColor:"#315a86"}}/><span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}><strong>{ownershipName(m,en)}</strong><small style={{display:"block"}}>{m==="rent"?(en?"Includes 12 months of standard hosting":"يشمل 12 شهرًا من الاستضافة الأساسية"):m==="copy"?(en?"Licensed executable copy, no source code":"نسخة بترخيص استخدام، دون الكود المصدري"):(en?"Source code and agreed project rights; shared engines excluded":"الكود المصدري وحقوق المشروع المتفق عليها، دون ملكية المحركات المشتركة")}</small><AddonPrice item={prices[m]} locale={locale} suffix={m==="rent"?(en?" / year":" / سنة"):""}/></span></label>)}
 </fieldset>;
}
