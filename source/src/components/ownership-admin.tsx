"use client";
import {useEffect,useState} from "react";
import {ownershipModes,ownershipName,ownershipPeriod,type OwnershipPrices,type OwnershipMode} from "./ownership-selector";
export default function OwnershipAdmin({scope,productKey,base,initial}:{scope:"package"|"sector";productKey:string;base:number|null;initial?:OwnershipPrices|null}){
 const [prices,setPrices]=useState<OwnershipPrices|null>(initial??null),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{if(initial)setPrices(initial)},[initial]);
 const commerce=scope==="sector"&&productKey==="commerce-engine";
 const endpoint="/api/admin/ownership-prices/"+scope+"/"+encodeURIComponent(productKey);
 const run=async(action:"load"|"save"|"reset")=>{setBusy(true);setStatus("");try{
 const r=await fetch(endpoint+(action==="reset"?"/reset":""),{credentials:"include",cache:"no-store",method:action==="save"?"PATCH":action==="reset"?"POST":"GET",headers:{"Content-Type":"application/json"},...(action==="save"?{body:JSON.stringify(Object.fromEntries(ownershipModes.filter(m=>prices?.[m]).map(m=>[m,{list_price:prices![m].list_price,discount_percent:prices![m].discount_percent}])))}:{})});
 const d=await r.json();if(!r.ok)throw Error(d.error||"تعذر حفظ الأسعار");
 setPrices(d.prices??Object.fromEntries(ownershipModes.map(m=>[m,{list_price:commerce?0:base??0,initial_price:commerce?0:base??0,discount_percent:0,price:commerce?0:base??0,period:ownershipPeriod(m)}])));setStatus(action==="load"?"":"تم تحديث الأسعار");
 }catch(e){setStatus(e instanceof Error?e.message:"تعذر التنفيذ")}finally{setBusy(false)}};
 const edit=(m:OwnershipMode,k:"list_price"|"discount_percent",v:number)=>setPrices(old=>old?{...old,[m]:{...old[m],[k]:v,price:Math.round((k==="list_price"?v:old[m].list_price)*(100-(k==="discount_percent"?v:old[m].discount_percent)))/100}}:old);
 return <section style={{gridColumn:"1 / -1",border:"1px solid #dce4ee",borderRadius:10,padding:12}}><strong>أسعار الإيجار والتملك</strong><button type="button" className="button button-outline button-small" disabled={busy} onClick={()=>void run("load")} style={{marginInlineStart:8}}>تحميل / تحديث</button>
 {commerce&&<p>أدخل أسعار المتجر الأربعة المعتمدة. لا تُحتسب أسعار افتراضية.</p>}{prices&&<><div style={{display:"grid",gap:8}}>{ownershipModes.filter(m=>prices[m]).map(m=><div key={m} style={{display:"grid",gap:6,gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",padding:8,borderBottom:"1px solid #dce4ee"}}><strong>{ownershipName(m)}</strong><label className="admin-field">السعر<input type="number" min={0} step=".01" value={prices[m].list_price} onChange={e=>edit(m,"list_price",Number(e.target.value))}/></label><label className="admin-field">الخصم %<input type="number" min={0} max={100} step=".01" value={prices[m].discount_percent} onChange={e=>edit(m,"discount_percent",Math.min(100,Math.max(0,Number(e.target.value))))}/></label><div>بعد الخصم: <b>{prices[m].price} ج.م</b>{m==="rent"&&<div>معادل الشهر سنويًا: {(prices[m].price/12).toFixed(2)} ج.م</div>}</div></div>)}</div><button type="button" className="button button-small" disabled={busy} onClick={()=>void run("save")}>حفظ أسعار التملك</button> {!commerce&&<button type="button" className="button button-outline button-small" disabled={busy} onClick={()=>{if(confirm("استعادة الأسعار الأصلية للإيجار والتملك؟"))void run("reset")}}>إعادة ضبط الأسعار</button>}</>}
 {status&&<p role="status">{status}</p>}</section>
}
