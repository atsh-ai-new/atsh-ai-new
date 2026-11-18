"use client";
import {useEffect,useState,type FormEvent} from "react";
import {loadGuestWorkspace,saveGuestWorkspace} from "@/lib/customer-workspace";

type Lookup={domain:string;available:boolean|null;premium?:boolean;premiumRegistrationPriceUsd?:number|null;environment?:string;checkedAt?:string;reservation?:boolean};
export default function DomainLookup({onDomainChange}:{onDomainChange?:(value:string)=>void}){
 const [name,setName]=useState("");
 const [checking,setChecking]=useState(false);
 const [lookup,setLookup]=useState<Lookup|null>(null);
 const [message,setMessage]=useState("");
 useEffect(()=>{const existing=loadGuestWorkspace().domainName;if(existing){setName(existing);onDomainChange?.(existing);}},[]);
 const change=(value:string)=>{setName(value);setLookup(null);setMessage("");onDomainChange?.(value);saveGuestWorkspace({domainName:value,source:"configurator"});};
 const check=async(e:FormEvent)=>{
  e.preventDefault();setMessage("");setChecking(true);setLookup(null);
  try{
   const r=await fetch(`/api/domains/check?domain=${encodeURIComponent(name.trim().toLowerCase())}`,{cache:"no-store"});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(r.status===503?"البحث الحقيقي عن الدومينات غير مُفعّل بعد.":"تعذر التحقق من الدومين لدى مزود التسجيل.");
   setLookup(data);
  }catch(error){setMessage(error instanceof Error?error.message:"تعذر الاستعلام");}
  finally{setChecking(false);}
 };
 return <section dir="rtl" aria-label="بحث حقيقي عن الدومين" style={{padding:16,margin:"14px 0",border:"1px solid #d9e2ed",borderRadius:14,background:"white"}}>
  <h3 style={{margin:"0 0 9px",color:"#203958"}}>ابحث عن الدومين الذي تريده</h3>
  <p style={{fontSize:13,color:"#64748b",lineHeight:1.8}}>البحث عن التوافر لا يعني حجز الدومين أو تأكيد سعره. شراء الدومين يتم لاحقًا بعد موافقتك وإعادة التحقق.</p>
  <form onSubmit={e=>void check(e)} style={{display:"flex",gap:9,flexWrap:"wrap"}}>
   <input required aria-label="اسم الدومين" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="example.com" value={name} onChange={e=>change(e.target.value)} maxLength={253} style={{padding:12,minWidth:0,flex:"1 1 205px",border:"1px solid #cbd5e1",borderRadius:10}}/>
   <button disabled={checking} type="submit" style={{background:"#203958",color:"white",border:0,padding:"11px 19px",borderRadius:10}}>{checking?"جارٍ التحقق…":"تحقق من التوافر"}</button>
  </form>
  {message&&<p role="status" style={{color:"#985b00"}}>{message}</p>}
  {lookup&&<div role="status" style={{marginTop:12,padding:10,borderRadius:10,background:"#eef4fa",lineHeight:1.8}}>
   <strong>{lookup.domain}</strong> — {lookup.available?"متاح وفق آخر استعلام":lookup.available===false?"غير متاح وفق آخر استعلام":"لم يُتحقق منه"}
   {lookup.environment==="sandbox"&&<p style={{color:"#a16207"}}>الاستعلام في بيئة الاختبار، وليس دليلًا على توافر الدومين الحقيقي.</p>}
   {lookup.premium&&<p>دومين مميز؛ {lookup.premiumRegistrationPriceUsd==null?"السعر يحتاج مراجعة.":`سعر تسجيل مبدئي لدى المزوّد: ${lookup.premiumRegistrationPriceUsd} دولار، وليس سعر بيع نهائيًا.`}</p>}
   {lookup.checkedAt&&<small>وقت الفحص: {new Date(lookup.checkedAt).toLocaleString("ar-EG")}</small>}
  </div>}
 </section>;
}
