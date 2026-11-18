"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {loadGuestWorkspace,replaceGuestWorkspace,type CustomerWorkspace} from "@/lib/customer-workspace";
type Kind=NonNullable<CustomerWorkspace["solutionType"]>;
type Mode="ready"|"custom";
const types:Array<{id:Kind;title:string;desc:string}>=[
 {id:"website",title:"🌐 موقع إلكتروني",desc:"تعريفي أو متعدد الصفحات"},
 {id:"store",title:"🛒 متجر إلكتروني",desc:"منتجات وطلبات ومبيعات"},
 {id:"mobile",title:"📱 تطبيق موبايل",desc:"Android / iOS"},
 {id:"management",title:"🗂️ نظام إداري",desc:"صيدلية أو عيادة أو كاشير"},
 {id:"ai",title:"✦ مساعد ذكي",desc:"دردشة وخدمة عملاء"},
 {id:"other",title:"⚙️ حل متكامل",desc:"منظومة متعددة الخدمات"}
];
const available:Array<{code:string;name:string;kinds:Kind[]}>= [
 {code:"admin-panel",name:"لوحة إدارة",kinds:["website","store","mobile","management","other"]},
 {code:"customer-account",name:"حسابات العملاء",kinds:["website","store","mobile","management","other"]},
 {code:"payments",name:"دفع إلكتروني",kinds:["website","store","mobile","other"]},
 {code:"appointments",name:"المواعيد",kinds:["website","management","mobile","other"]},
 {code:"pos-inventory",name:"كاشير ومخزون",kinds:["store","management","other"]},
 {code:"mobile-app",name:"تطبيق مرتبط",kinds:["store","management","mobile","other"]},
 {code:"ai-chat",name:"مساعد ذكي",kinds:["website","store","mobile","management","ai","other"]},
 {code:"integrations",name:"ربط الأنظمة",kinds:["website","store","mobile","management","ai","other"]}
];
const chooseStyle=(selected:boolean)=>({border:selected?"2px solid #203958":"1px solid #d8e1eb",borderRadius:12,padding:15,textAlign:"right" as const,background:selected?"#eef4fb":"white",color:"#203958",cursor:"pointer",fontSize:16});
export default function StartProject(){
 const [step,setStep]=useState(1),[kind,setKind]=useState<Kind>("website"),[mode,setMode]=useState<Mode>("ready");
 const [businessName,setBusinessName]=useState(""),[requirements,setRequirements]=useState(""),[options,setOptions]=useState<string[]>([]);
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 const [deliveryMethod,setDeliveryMethod]=useState<"undecided"|"managed"|"source-code">("undecided");
 useEffect(()=>{const v=loadGuestWorkspace();if(v.solutionType)setKind(v.solutionType);if(v.projectMode)setMode(v.projectMode);if(v.businessName)setBusinessName(v.businessName);if(v.requirements)setRequirements(v.requirements);if(v.options)setOptions(v.options);if(v.deliveryMethod)setDeliveryMethod(v.deliveryMethod);},[]);
 const filtered=available.filter(x=>x.kinds.includes(kind));
 const changeKind=(value:Kind)=>{setKind(value);setOptions(old=>old.filter(code=>available.some(x=>x.code===code&&x.kinds.includes(value))));};
 const submit=async(event:FormEvent)=>{
  event.preventDefault();if(!businessName.trim()){setError("اكتب اسم مشروعك.");return}
  const patch:CustomerWorkspace={projectMode:mode,solutionType:kind,businessName:businessName.trim(),requirements:requirements.trim(),options,deliveryMethod,source:"configurator"};
  replaceGuestWorkspace(patch);
  if(mode==="ready"){window.location.assign("/catalog");return}
  setSaving(true);setError("");
  try{
   const session=await fetch("/api/customer/auth/me",{credentials:"include",cache:"no-store"});
   if(session.status===401){window.location.assign("/account/register");return}
   if(!session.ok)throw Error("تعذر فحص حساب العميل. أعد المحاولة.");
   const res=await fetch("/api/customer/auth/project-drafts",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:businessName.trim(),draft:loadGuestWorkspace()})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.projectDraft?.id)throw Error(data.error||"تعذر حفظ مسودة المشروع");
   try{localStorage.removeItem("atsh_customer_workspace_v1");}catch{}
   window.location.assign(`/account/project-preview/${encodeURIComponent(data.projectDraft.id)}`);
  }catch(e){setError(e instanceof Error?e.message:"تعذر حفظ المشروع");}finally{setSaving(false)}
 };
 return <main dir="rtl" style={{background:"#f8f8f5",minHeight:"100vh",padding:"15px 14px 65px",color:"#203958"}}>
  <div style={{maxWidth:810,margin:"auto"}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
    <Link href="/" style={{fontSize:21,fontWeight:900,color:"#203958",textDecoration:"none"}}>ATSH AI</Link>
    <Link href="/account/dashboard" style={{color:"#203958"}}>حساب العميل</Link>
   </header>
   <div style={{margin:"25px 0 17px"}}><small style={{color:"#986727",fontWeight:800}}>خطوة {step} من 2</small><h1 style={{fontSize:"clamp(25px,4vw,36px)",margin:"6px 0"}}>ابدأ مشروعك بالطريقة المناسبة</h1><p style={{color:"#66788c",lineHeight:1.8}}>حدد نوع الحل والمسار. لن نعرض سعرًا غير معتمد أو نعتبر مواصفاتك طلب شراء.</p></div>
   <form onSubmit={e=>void submit(e)} style={{border:"1px solid #dce6ef",borderRadius:18,background:"white",padding:"clamp(14px,3vw,24px)"}}>
    {step===1?<section>
     <h2 style={{fontSize:19}}>نوع المشروع</h2>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,215px),1fr))",gap:10}}>{types.map(x=><button type="button" key={x.id} aria-pressed={kind===x.id} onClick={()=>changeKind(x.id)} style={chooseStyle(kind===x.id)}><strong>{x.title}</strong><small style={{display:"block",marginTop:5,color:"#65788b"}}>{x.desc}</small></button>)}</div>
     <h2 style={{fontSize:19,marginTop:24}}>طريقة البدء</h2>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,235px),1fr))",gap:10}}>
      <button type="button" aria-pressed={mode==="ready"} onClick={()=>setMode("ready")} style={chooseStyle(mode==="ready")}><strong>قالب جاهز للتخصيص</strong><small style={{display:"block",marginTop:6}}>تجربة الكتالوجات واختيار الإضافات وتسعيرها.</small></button>
      <button type="button" aria-pressed={mode==="custom"} onClick={()=>setMode("custom")} style={chooseStyle(mode==="custom")}><strong>مشروع بمواصفات خاصة</strong><small style={{display:"block",marginTop:6}}>حفظ فكرة المشروع ثم مراجعتها قبل إصدار عرض مخصص.</small></button>
     </div>
     <div style={{textAlign:"left",marginTop:20}}><button type="button" onClick={()=>setStep(2)} style={{padding:"12px 23px",background:"#203958",color:"white",border:0,borderRadius:10,fontSize:16,cursor:"pointer"}}>التالي ←</button></div>
    </section>:<section>
     <h2 style={{fontSize:19,margin:"0 0 17px"}}>تفاصيل {types.find(x=>x.id===kind)?.title}</h2>
     <label style={{display:"grid",gap:7,fontWeight:700}}>اسم المشروع / النشاط<input required maxLength={120} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="مثال: عيادتي" style={{border:"1px solid #b9c9dc",borderRadius:10,padding:13,fontSize:16}}/></label>
     <h3 style={{fontSize:17,marginTop:20}}>الخصائص المطلوبة</h3>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,185px),1fr))",gap:9}}>{filtered.map(x=><label key={x.code} style={{display:"flex",gap:9,alignItems:"center",padding:12,border:"1px solid #e0e6ed",borderRadius:11,cursor:"pointer"}}><input type="checkbox" checked={options.includes(x.code)} onChange={e=>setOptions(current=>e.target.checked?[...new Set([...current,x.code])]:current.filter(code=>code!==x.code))}/>{x.name}</label>)}</div>
     <h3 style={{fontSize:17,marginTop:22}}>طريقة التسليم المفضلة</h3>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:8}}>
       {[{id:"undecided" as const,label:"لم أحدد بعد",note:"نوضح الاختلاف قبل اعتماد العرض"},{id:"managed" as const,label:"خدمة مُدارة",note:"المنصة والاستضافة والمتابعة حسب العقد"},{id:"source-code" as const,label:"شراء/ترخيص الكود",note:"تسليم المصدر والحقوق وفق العقد"}].map(item=><button type="button" key={item.id} aria-pressed={deliveryMethod===item.id} onClick={()=>setDeliveryMethod(item.id)} style={chooseStyle(deliveryMethod===item.id)}><strong>{item.label}</strong><small style={{display:"block",marginTop:6,color:"#61758a"}}>{item.note}</small></button>)}
     </div>
     <label style={{display:"grid",gap:8,fontWeight:700,marginTop:18}}>اشرح طلبك<textarea rows={3} maxLength={4000} value={requirements} onChange={e=>setRequirements(e.target.value)} placeholder="أهم التفاصيل أو المشاكل التي تريد حلها" style={{border:"1px solid #b9c9dc",borderRadius:10,padding:13,fontSize:16}}/></label>
     <p style={{fontSize:13,color:"#607187",lineHeight:1.8}}>{mode==="ready"?"سننتقل للمعرض وتجربة النماذج. الخصائص المختارة هنا مجرد وصف مبدئي؛ السعر يحسبه محرك التسعير فقط.":"سيُحفظ وصف مشروعك في حسابك كمسودة، وليس عقدًا أو طلب شراء. إن لم تكن مسجلًا، ستنتقل لإنشاء حساب ويمكنك نقل اختياراتك إليه."}</p>
     {error&&<p role="alert" style={{padding:12,background:"#fff0dc",borderRadius:10}}>{error}</p>}
     <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}><button type="button" onClick={()=>setStep(1)} style={{padding:"12px 18px",border:"1px solid #b9c9dc",borderRadius:10,background:"white",cursor:"pointer"}}>السابق</button><button type="submit" disabled={saving} style={{padding:"12px 18px",border:0,borderRadius:10,background:"#203958",color:"white",fontWeight:800,cursor:"pointer"}}>{saving?"جارٍ الحفظ…":mode==="ready"?"عرض النماذج التفاعلية ←":"حفظ مسودة المشروع ←"}</button></div>
    </section>}
   </form>
  </div>
 </main>;
}
