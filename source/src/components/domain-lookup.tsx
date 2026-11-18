"use client";
import {useEffect,useState,type FormEvent} from "react";
import {loadGuestWorkspace,saveGuestWorkspace} from "@/lib/customer-workspace";

type Lookup={domain:string;available:boolean|null;premium?:boolean;premiumRegistrationPriceUsd?:number|null;environment?:string;checkedAt?:string;reservation?:boolean};
export default function DomainLookup({onDomainChange,locale="ar"}:{onDomainChange?:(value:string)=>void;locale?:"ar"|"en"}){const en=locale==="en";const t=(ar:string,english:string)=>en?english:ar;
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
   if(!r.ok)throw Error(r.status===503?t("البحث الحقيقي عن الدومينات غير مُفعّل بعد.","Live domain lookup is not enabled yet."):t("تعذر التحقق من الدومين لدى مزود التسجيل.","Could not check the domain with the registrar."));
   setLookup(data);
  }catch(error){setMessage(error instanceof Error?error.message:t("تعذر الاستعلام","Domain lookup failed"));}
  finally{setChecking(false);}
 };
 return <section dir={en?"ltr":"rtl"} aria-label={t("بحث حقيقي عن الدومين","Domain availability search")} style={{padding:16,margin:"14px 0",border:"1px solid #d9e2ed",borderRadius:14,background:"white"}}>
  <h3 style={{margin:"0 0 9px",color:"#203958"}}>{t("ابحث عن الدومين الذي تريده","Search your preferred domain")}</h3>
  <p style={{fontSize:13,color:"#64748b",lineHeight:1.8}}>{t("البحث عن التوافر لا يعني حجز الدومين أو تأكيد سعره. شراء الدومين يتم لاحقًا بعد موافقتك وإعادة التحقق.","An availability search does not reserve a domain or confirm its price. Registration requires your approval and a final check.")}</p>
  <form onSubmit={e=>void check(e)} style={{display:"flex",gap:9,flexWrap:"wrap"}}>
   <input required aria-label={t("اسم الدومين","Domain name")} type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="example.com" value={name} onChange={e=>change(e.target.value)} maxLength={253} style={{padding:12,minWidth:0,flex:"1 1 205px",border:"1px solid #cbd5e1",borderRadius:10}}/>
   <button disabled={checking} type="submit" style={{background:"#203958",color:"white",border:0,padding:"11px 19px",borderRadius:10}}>{checking?t("جارٍ التحقق…","Checking…"):t("تحقق من التوافر","Check availability")}</button>
  </form>
  {message&&<p role="status" style={{color:"#985b00"}}>{message}</p>}
  {lookup&&<div role="status" style={{marginTop:12,padding:10,borderRadius:10,background:"#eef4fa",lineHeight:1.8}}>
   <strong>{lookup.domain}</strong> — {lookup.available?t("متاح وفق آخر استعلام","Available according to last lookup"):lookup.available===false?t("غير متاح وفق آخر استعلام","Unavailable according to last lookup"):t("لم يُتحقق منه","Not verified")}
   {lookup.environment==="sandbox"&&<p style={{color:"#a16207"}}>{t("الاستعلام في بيئة الاختبار، وليس دليلًا على توافر الدومين الحقيقي.","Sandbox result — not proof of live domain availability.")}</p>}
   {lookup.premium&&<p>{t("دومين مميز؛","Premium domain:")} {lookup.premiumRegistrationPriceUsd==null?t("السعر يحتاج مراجعة.","Price requires review."):(en?`Registrar estimate: USD ${lookup.premiumRegistrationPriceUsd}, not a confirmed resale price.`:`سعر تسجيل مبدئي لدى المزوّد: ${lookup.premiumRegistrationPriceUsd} دولار، وليس سعر بيع نهائيًا.`)}</p>}
   {lookup.checkedAt&&<small>{t("وقت الفحص:","Checked at:")} {new Date(lookup.checkedAt).toLocaleString(en?"en-EG":"ar-EG")}</small>}
  </div>}
 </section>;
}
