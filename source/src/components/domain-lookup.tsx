"use client";
import {useEffect,useState,type FormEvent} from "react";
import {loadGuestWorkspace,saveGuestWorkspace} from "@/lib/customer-workspace";

type Lookup = {
 domain:string;available:boolean|null;
 status?:"available"|"unavailable"|"registered"|"not_registered"|"unsupported";
 provider?:"rdap"|"namecheap";premium?:boolean;
 premiumRegistrationPriceUsd?:number|null;environment?:string;checkedAt?:string;
 reservation?:boolean;
};
type Candidate = {domain:string;lookup:Lookup|null;error:string};
const COMMON_EXTENSIONS=[".com",".net",".org",".eg"];

// The input accepts a business name (atsh) OR a fully-qualified domain (atsh.com).
function candidatesFromInput(value:string):string[] {
 const name=value.trim().toLowerCase().replace(/[.。．｡]+$/gu,"");
 if(!name||name.length>253||/[\s/?&#@:]/u.test(name)||name.includes(".."))return [];
 if(name.includes("."))return [name];
 if(name.length>63||!/^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u.test(name))return [];
 return COMMON_EXTENSIONS.map(extension=>name+extension);
}

export default function DomainLookup({onDomainChange,locale="ar"}:{onDomainChange?:(value:string)=>void;locale?:"ar"|"en"}){
 const en=locale==="en";
 const t=(ar:string,english:string)=>en?english:ar;
 const [name,setName]=useState("");
 const [checking,setChecking]=useState(false);
 const [results,setResults]=useState<Candidate[]>([]);
 const [message,setMessage]=useState("");
 const [selectedDomain,setSelectedDomain]=useState("");
 useEffect(()=>{
  const existing=loadGuestWorkspace().domainName;
  if(existing){setName(existing);if(existing.includes(".")){setSelectedDomain(existing);onDomainChange?.(existing);}}
 },[]);
 const change=(value:string)=>{
  setName(value);setResults([]);setMessage("");setSelectedDomain("");
  // Never send a bare business name ("atsh") to the project-order domain field.
  const qualified=value.trim().includes(".")?value.trim().toLowerCase():"";
  onDomainChange?.(qualified);
  saveGuestWorkspace({domainName:qualified,source:"configurator"});
 };
 const select=(domain:string)=>{
  setSelectedDomain(domain);setName(domain);setMessage(t("تم حفظ الاسم كاختيار مفضل، وليس حجزًا.", "Saved as your preferred domain, not reserved."));
  onDomainChange?.(domain);
  saveGuestWorkspace({domainName:domain,source:"configurator"});
 };
 const check=async(event:FormEvent)=>{
  event.preventDefault();
  const names=candidatesFromInput(name);
  setResults([]);setMessage("");
  if(!names.length){
   setMessage(t("اكتب اسمًا صحيحًا، مثل atsh أو atsh.com.","Enter a valid name such as atsh or atsh.com."));
   return;
  }
  setChecking(true);
  try{
   const checked=await Promise.all(names.map(async domain=>{
    try{
     const response=await fetch(`/api/domains/check?domain=${encodeURIComponent(domain)}`,{cache:"no-store"});
     const data=await response.json().catch(()=>null);
     if(!response.ok){
      const error=response.status===400
       ?t("اسم الدومين غير صالح.","Invalid domain name.")
       :response.status===503
       ?t("خدمة البحث غير متصلة بالخادم المنشور.","Live lookup is not connected to the deployed server.")
       :response.status===429
       ?t("طلبات كثيرة؛ حاول لاحقًا.","Too many requests; try again later.")
       :t("تعذر الاتصال بسجل الدومين.","Could not reach the domain registry.");
      return {domain,lookup:null,error};
     }
     if(!data||data.domain!==domain||typeof data!=="object"){
      return {domain,lookup:null,error:t("استجابة غير صحيحة من خدمة البحث.","Unexpected lookup response.")};
     }
     return {domain,lookup:data as Lookup,error:""};
    }catch{
     return {domain,lookup:null,error:t("تعذر الاتصال بخدمة البحث.","Lookup service unavailable.")};
    }
   }));
   setResults(checked);
   if(checked.every(item=>!item.lookup)){
    setMessage(t("البحث لم ينجح لأي امتداد. تأكد من نشر الـBackend وتفعيل الاتصال بالسجل.", "No extension could be verified. Check the deployed backend and its registry connection."));
   }
  }finally{setChecking(false);}
 };
 const resultLabel=(result:Lookup)=>result.provider==="rdap"
  ?result.status==="registered"?t("مسجل بالفعل","Registered")
   :result.status==="not_registered"?t("غير مسجل — قد يكون متاحًا","Not registered — potentially available")
   :t("لا يمكن التحقق لهذا الامتداد","This extension cannot be verified")
  :result.available===true?t("متاح لدى شركة التسجيل","Available at registrar")
   :result.available===false?t("غير متاح لدى شركة التسجيل","Unavailable at registrar")
   :t("التوافر غير مؤكد","Availability unconfirmed");
 const selectable=(result:Lookup)=>result.environment!=="sandbox"&&(
  (result.provider==="rdap"&&result.status==="not_registered")||
  (result.provider==="namecheap"&&result.available===true)
 );
 return <section dir={en?"ltr":"rtl"} aria-label={t("بحث حقيقي عن الدومين","Live domain search")}
  style={{padding:"clamp(12px,3vw,16px)",margin:"12px 0",border:"1px solid #d9e2ed",borderRadius:14,background:"white"}}>
  <h3 style={{margin:"0 0 7px",color:"#203958",fontSize:18}}>{t("ابحث عن الدومين الذي تريده","Find your domain")}</h3>
  <p style={{fontSize:13,color:"#64748b",lineHeight:1.7,margin:"0 0 12px"}}>
   {t("اكتب الاسم فقط مثل atsh للبحث في عدة امتدادات، أو اكتب الدومين كاملًا مثل atsh.com.",
    "Enter a name like atsh to check several extensions, or a complete domain like atsh.com.")}
  </p>
  <form onSubmit={e=>void check(e)} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
   <input required aria-label={t("اسم المشروع أو الدومين","Name or domain")} type="text"
    autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="atsh"
    value={name} onChange={e=>change(e.target.value)} maxLength={253}
    style={{padding:12,minWidth:0,flex:"1 1 165px",border:"1px solid #cbd5e1",borderRadius:10,fontSize:16,direction:"ltr"}}/>
   <button disabled={checking} type="submit" style={{background:"#203958",color:"white",border:0,padding:"11px 17px",borderRadius:10,fontSize:15,cursor:"pointer"}}>
    {checking?t("جارٍ البحث…","Searching…"):t("ابحث","Search")}
   </button>
  </form>
  {message&&<p role="status" style={{color:"#875b14",fontSize:13,lineHeight:1.6,margin:"10px 0 0"}}>{message}</p>}
  {results.length>0&&<div aria-live="polite" aria-busy={checking} style={{display:"grid",gap:8,marginTop:12}}>
   {results.map(item=><div key={item.domain} style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,
    background:"#f4f7fb",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
    <div style={{minWidth:0,flex:"1 1 150px"}}>
     <strong dir="ltr" style={{display:"block",textAlign:en?"left":"right",overflowWrap:"anywhere",color:"#203958"}}>{item.domain}</strong>
     <small style={{display:"block",lineHeight:1.6,color:item.error?"#a16207":item.lookup?.status==="registered"||item.lookup?.available===false?"#8f3030":"#386375"}}>
      {item.error|| (item.lookup?resultLabel(item.lookup):t("لم يتم التحقق","Not verified"))}
     </small>
     {item.lookup?.premium&&<small style={{display:"block"}}>{t("دومين مميز — السعر يحتاج تأكيدًا","Premium domain — price needs confirmation")}</small>}
    </div>
    {item.lookup&&selectable(item.lookup)&&<button type="button" onClick={()=>select(item.domain)}
     style={{background:selectedDomain===item.domain?"#e1ecf7":"#fff",color:"#203958",border:"1px solid #9db4cb",borderRadius:8,padding:"8px 12px",fontSize:13,cursor:"pointer"}}>
     {selectedDomain===item.domain?t("محدد ✓","Selected ✓"):t("اختيار مبدئي","Select")}
    </button>}
   </div>)}
  </div>}
  <p style={{fontSize:12,color:"#68798b",lineHeight:1.7,margin:"12px 0 0"}}>
   {t("نتائج RDAP تعني وجود تسجيل أو عدمه فقط؛ لا تؤكد إمكانية الشراء أو السعر. لن يُحجز أي دومين قبل موافقتك وتأكيد شركة التسجيل.",
    "RDAP checks registration records only, not purchase eligibility or price. Nothing is reserved without your approval and registrar confirmation.")}
  </p>
 </section>;
}
