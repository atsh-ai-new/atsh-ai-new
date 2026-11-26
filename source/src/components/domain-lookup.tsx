"use client";
import {useEffect,useState} from "react";
import {loadGuestWorkspace,saveGuestWorkspace} from "@/lib/customer-workspace";

type Lookup = {
 domain:string;available:boolean|null;
 status?:"available"|"unavailable"|"registered"|"not_registered"|"unsupported";
 provider?:"rdap"|"namecheap";premium?:boolean;
 premiumRegistrationPriceUsd?:number|null;environment?:string;checkedAt?:string;
 reservation?:boolean;
};
type Candidate = {domain:string;lookup:Lookup|null;error:string};
const DOMAIN_EXTENSIONS=[".com",".net",".org",".eg",".ai",".io",".co",".site",".app",".store"];

// The input accepts a business name (atsh) OR a fully-qualified domain (atsh.com).
function candidatesFromInput(value:string):string[] {
 const name=value.trim().toLowerCase().replace(/[.。．｡]+$/gu,"");
 if(!name||name.length>253||/[\s/?&#@:]/u.test(name)||name.includes(".."))return [];
 if(name.includes("."))return [name];
 if(name.length>63||!/^[a-z0-9\u0600-\u06FF](?:[a-z0-9\u0600-\u06FF-]*[a-z0-9\u0600-\u06FF])?$/i.test(name))return [];
 return DOMAIN_EXTENSIONS.map(extension=>name+extension);
}

export default function DomainLookup({onDomainChange,locale="ar",source="configurator",value}:{onDomainChange?:(value:string)=>void;locale?:"ar"|"en";source?:"configurator"|"catalog";value?:string}){
 const en=locale==="en";
 const t=(ar:string,english:string)=>en?english:ar;
 const [name,setName]=useState("");
 const [checking,setChecking]=useState(false);
 const [results,setResults]=useState<Candidate[]>([]);
 const [message,setMessage]=useState("");
 const [selectedDomain,setSelectedDomain]=useState("");
 useEffect(()=>{
  const existing=value??loadGuestWorkspace().domainName;
  if(existing){setName(existing);if(existing.includes(".")){setSelectedDomain(existing);if(value===undefined)onDomainChange?.(existing);}}else if(value!==undefined)setSelectedDomain("");
 },[value]);
 const change=(value:string)=>{
  setName(value);setResults([]);setMessage("");setSelectedDomain("");
  // Never send a bare business name ("atsh") to the project-order domain field.
  onDomainChange?.("");
  if(value===undefined)saveGuestWorkspace({domainName:"",source});
 };
 const select=(domain:string)=>{
  setSelectedDomain(domain);setName(domain);setMessage(t("تم حفظ الاسم كاختيار مفضل، وليس حجزًا.", "Saved as your preferred domain, not reserved."));
  onDomainChange?.(domain);
  if(value===undefined)saveGuestWorkspace({domainName:domain,source});
 };
 const check=async()=>{
  const names=candidatesFromInput(name);
  setResults([]);setMessage("");
  if(!names.length){
   setMessage(t("اكتب اسمًا صحيحًا، مثل atsh أو atsh.com.","Enter a valid name such as atsh or atsh.com."));
   return;
  }
  setChecking(true);
  try{
   const checked:Candidate[]=[];
   for(let offset=0;offset<names.length;offset+=4){
    if(offset>0)await new Promise(resolve=>setTimeout(resolve,1800));
    const batch=await Promise.all(names.slice(offset,offset+4).map(async domain=>{
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
    checked.push(...batch);
    setResults([...checked]);
   }
   if(checked.every(item=>!item.lookup)){
    setMessage(t("تعذر الوصول إلى سجلات الدومينات حاليًا. حاول مرة أخرى لاحقًا.", "Domain registries are temporarily unreachable. Please retry later."));
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
  <p style={{fontSize:14,fontWeight:600,color:"#64748b",lineHeight:1.7,margin:"0 0 12px"}}>
   {t("اكتب الاسم فقط مثل atsh للبحث في عدة امتدادات، أو اكتب الدومين كاملًا مثل atsh.com.",
    "Enter a name like atsh to check several extensions, or a complete domain like atsh.com.")}
  </p>
  <div role="search" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
   <input required aria-label={t("اسم المشروع أو الدومين","Name or domain")} type="text"
    autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="atsh"
    value={name} onChange={e=>change(e.target.value)} maxLength={253}
    style={{padding:12,minWidth:0,flex:"1 1 165px",border:"1px solid #cbd5e1",borderRadius:10,fontSize:16,direction:"ltr"}}/>
   <button disabled={checking} type="button" onClick={()=>void check()} style={{background:"#203958",color:"white",border:0,padding:"11px 17px",borderRadius:10,fontSize:15,cursor:"pointer"}}>
    {checking?t("جارٍ البحث…","Searching…"):t("ابحث","Search")}
   </button>
  </div>
  {checking&&<p role="status" style={{fontSize:14,fontWeight:600,color:"#64748b"}}>{t("جارٍ فحص الامتدادات المتاحة تباعًا…","Checking available extensions progressively…")}</p>}
  {message&&<p role="status" style={{color:"#875b14",fontSize:14,fontWeight:600,lineHeight:1.6,margin:"10px 0 0"}}>{message}</p>}
  {results.length>0&&<div aria-live="polite" aria-busy={checking} className="domain-results-grid">
   {results.map(item=><div key={item.domain} className="domain-result-card">
    <div style={{minWidth:0,width:"100%"}}>
     <strong dir="ltr" style={{display:"block",textAlign:"center",overflowWrap:"anywhere",color:"#203958",fontSize:14,fontWeight:600,lineHeight:1.3}}>{item.domain}</strong>
     <small style={{display:"block",lineHeight:1.3,fontSize:14,fontWeight:600,textAlign:"center",color:item.error?"#a16207":item.lookup?.status==="registered"||item.lookup?.available===false?"#8f3030":"#386375"}}>
      {item.error|| (item.lookup?resultLabel(item.lookup):t("لم يتم التحقق","Not verified"))}
     </small>
     {item.lookup?.premium&&<small style={{display:"block"}}>{t("دومين مميز — السعر يحتاج تأكيدًا","Premium domain — price needs confirmation")}</small>}
    </div>
    {item.lookup&&selectable(item.lookup)&&<button type="button" onClick={()=>select(item.domain)}
     style={{background:selectedDomain===item.domain?"#e1ecf7":"#fff",color:"#203958",border:"1px solid #9db4cb",borderRadius:8,padding:"5px 4px",fontSize:14,fontWeight:600,cursor:"pointer",width:"100%"}}>
     {selectedDomain===item.domain?t("محدد ✓","Selected ✓"):t("اختيار مبدئي","Select")}
    </button>}
   </div>)}
  </div>}
  <p style={{fontSize:14,fontWeight:600,color:"#68798b",lineHeight:1.7,margin:"12px 0 0"}}>
   {t("نتائج RDAP تعني وجود تسجيل أو عدمه فقط؛ لا تؤكد إمكانية الشراء أو السعر. لن يُحجز أي دومين قبل موافقتك وتأكيد شركة التسجيل.",
    "RDAP checks registration records only, not purchase eligibility or price. Nothing is reserved without your approval and registrar confirmation.")}
  </p>
 </section>;
}
