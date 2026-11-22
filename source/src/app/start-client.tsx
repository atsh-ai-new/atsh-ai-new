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
const chooseStyle=(selected:boolean)=>({border:selected?"2px solid #203958":"1px solid #d8e1eb",borderRadius:12,padding:15,textAlign:"start" as const,background:selected?"#eef4fb":"white",color:"#203958",cursor:"pointer",fontSize:16});
export default function StartProject({locale="ar"}:{locale?:"ar"|"en"}){
 const en=locale==="en";const tr=(ar:string,english:string)=>en?english:ar;
 const root=en?"/en":"";
 const titles:Record<string,{title:string;desc:string}>={website:{title:"🌐 Website",desc:"Corporate or multi-page website"},store:{title:"🛒 E-commerce store",desc:"Products, orders and sales"},mobile:{title:"📱 Mobile application",desc:"Android / iOS"},management:{title:"🗂️ Management system",desc:"Clinic, pharmacy or point of sale"},ai:{title:"✦ AI assistant",desc:"Customer support and chat"},other:{title:"⚙️ End-to-end solution",desc:"Integrated multi-service platform"}};
 const featureNames:Record<string,string>={"admin-panel":"Admin dashboard","customer-account":"Customer accounts",payments:"Online payments",appointments:"Appointments","pos-inventory":"POS & inventory","mobile-app":"Connected mobile app","ai-chat":"AI assistant",integrations:"System integrations"};
 const [step,setStep]=useState(1),[kind,setKind]=useState<Kind>("website"),[mode,setMode]=useState<Mode>("ready");
 const [businessName,setBusinessName]=useState(""),[requirements,setRequirements]=useState(""),[options,setOptions]=useState<string[]>([]);
 const [saving,setSaving]=useState(false),[error,setError]=useState("");
 const [deliveryMethod,setDeliveryMethod]=useState<"undecided"|"managed"|"source-code">("undecided");
 useEffect(()=>{const v=loadGuestWorkspace();if(v.solutionType)setKind(v.solutionType);if(v.projectMode)setMode(v.projectMode);if(v.businessName)setBusinessName(v.businessName);if(v.requirements)setRequirements(v.requirements);if(v.options)setOptions(v.options);if(v.deliveryMethod)setDeliveryMethod(v.deliveryMethod);},[]);
 const filtered=available.filter(x=>x.kinds.includes(kind));
 const changeKind=(value:Kind)=>{setKind(value);setOptions(old=>old.filter(code=>available.some(x=>x.code===code&&x.kinds.includes(value))));};
 const submit=async(event:FormEvent)=>{
  event.preventDefault();if(saving)return;if(!businessName.trim()){setError(tr("اكتب اسم مشروعك.","Please enter a project name."));return}
  if(mode==="custom"&&!requirements.trim()){setError(tr("اكتب متطلبات المشروع المخصص قبل الإرسال.","Describe your custom project before submitting."));return}
  const patch:CustomerWorkspace={projectMode:mode,solutionType:kind,businessName:businessName.trim(),requirements:requirements.trim(),options,deliveryMethod,source:"configurator"};
  replaceGuestWorkspace(patch);
  setSaving(true);setError("");
  try{
   const session=await fetch("/api/customer/auth/me",{credentials:"include",cache:"no-store"});
   if(session.status===401){window.location.assign(`${root}/account/login`);return}
   if(!session.ok)throw Error(tr("تعذر فحص حساب العميل. أعد المحاولة.","Could not verify your account. Try again."));
   const existingDraftId=typeof window!=="undefined"?sessionStorage.getItem("atsh_pending_draft_id"):null;
   let draftId=existingDraftId;
   if(!draftId){
   const res=await fetch("/api/customer/auth/project-drafts",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:businessName.trim(),draft:loadGuestWorkspace()})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.projectDraft?.id)throw Error((en?"Unable to save your project draft":data.error||"تعذر حفظ مسودة المشروع"));
   draftId=data.projectDraft.id;
   sessionStorage.setItem("atsh_pending_draft_id",draftId);
   }
   // A completed custom brief is a customer submission, not merely a local draft.
   {
    const sent=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(draftId!)}/submit`,{method:"POST",credentials:"include"});
    const confirmation=await sent.json().catch(()=>({}));
    if(!sent.ok||!confirmation.projectId)throw Error(confirmation.error||tr("تم حفظ المسودة لكن تعذر إرسال الطلب للإدارة. افتح حسابك وأعد الإرسال.","Draft saved, but submission failed. Open your account and retry."));
   }
   try{sessionStorage.removeItem("atsh_customer_workspace_v1");sessionStorage.removeItem("atsh_pending_draft_id");}catch{}
   window.location.assign(`${root}/account/project-preview/${encodeURIComponent(draftId!)}`);
  }catch(e){setError(e instanceof Error?e.message:tr("تعذر حفظ المشروع","Unable to save your project"));}finally{setSaving(false)}
 };
 return <main className="atsh-start" lang={locale} dir={en?"ltr":"rtl"} style={{background:"#f8f8f5",minHeight:"100vh",padding:"15px 14px 65px",color:"#203958"}}>
  <div className="atsh-start-container" style={{maxWidth:810,margin:"auto"}}>
   <header className="atsh-start-header" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
    <Link href={en?"/en":"/"} style={{fontSize:21,fontWeight:900,color:"#203958",textDecoration:"none"}}>ATSH AI</Link>
    <Link href={`${root}/account/dashboard`} style={{color:"#203958"}}>{tr("حساب العميل","Customer account")}</Link>
   </header>
   <div className="atsh-start-intro" style={{margin:"25px 0 17px"}}><small style={{color:"#986727",fontWeight:800}}>{tr("خطوة","Step")} {step} {tr("من","of")} 2</small><h1 style={{fontSize:"clamp(25px,4vw,36px)",margin:"6px 0"}}>{tr("ابدأ مشروعك بالطريقة المناسبة","Start your project your way")}</h1><p style={{color:"#66788c",lineHeight:1.8}}>{tr("حدد نوع الحل والمسار. لن نعرض سعرًا غير معتمد أو نعتبر مواصفاتك طلب شراء.","Choose your solution and starting point. This is a project brief, not a purchase order or a final quote.")}</p></div>
   <form className="atsh-start-form" onSubmit={e=>void submit(e)} style={{border:"1px solid #dce6ef",borderRadius:18,background:"white",padding:"clamp(14px,3vw,24px)"}}>
    {step===1?<section>
     <h2 style={{fontSize:19}}>{tr("نوع المشروع","Project type")}</h2>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,215px),1fr))",gap:10}}>{types.map(x=><button type="button" key={x.id} aria-pressed={kind===x.id} onClick={()=>changeKind(x.id)} style={chooseStyle(kind===x.id)}><strong>{en?titles[x.id]?.title:x.title}</strong><small style={{display:"block",marginTop:5,color:"#65788b"}}>{en?titles[x.id]?.desc:x.desc}</small></button>)}</div>
     <h2 style={{fontSize:19,marginTop:24}}>{tr("طريقة البدء","How would you like to start?")}</h2>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,235px),1fr))",gap:10}}>
      <button type="button" aria-pressed={mode==="ready"} onClick={()=>setMode("ready")} style={chooseStyle(mode==="ready")}><strong>{tr("قالب جاهز للتخصيص","Ready-to-customize template")}</strong><small style={{display:"block",marginTop:6}}>{tr("تجربة الكتالوجات واختيار الإضافات وتسعيرها.","Explore available solutions, optional features and pricing.")}</small></button>
      <button type="button" aria-pressed={mode==="custom"} onClick={()=>setMode("custom")} style={chooseStyle(mode==="custom")}><strong>{tr("مشروع بمواصفات خاصة","Custom project")}</strong><small style={{display:"block",marginTop:6}}>{tr("حفظ فكرة المشروع ثم مراجعتها قبل إصدار عرض مخصص.","Save your project brief for review before a custom quote is issued.")}</small></button>
     </div>
     <div className="atsh-start-next" style={{textAlign:"left",marginTop:20}}><button type="button" onClick={()=>setStep(2)} style={{padding:"12px 23px",background:"#203958",color:"white",border:0,borderRadius:10,fontSize:16,cursor:"pointer"}}>{tr("التالي ←","Next →")}</button></div>
    </section>:<section>
     <h2 style={{fontSize:19,margin:"0 0 17px"}}>{tr("تفاصيل","Details:")} {en?titles[kind]?.title:types.find(x=>x.id===kind)?.title}</h2>
     <label style={{display:"grid",gap:7,fontWeight:700}}>{tr("اسم المشروع / النشاط","Project or business name")}<input required maxLength={120} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder={tr("مثال: عيادتي","For example: My Clinic")} style={{border:"1px solid #b9c9dc",borderRadius:10,padding:13,fontSize:16}}/></label>
     <h3 style={{fontSize:17,marginTop:20}}>{tr("الخصائص المطلوبة","Required features")}</h3>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,185px),1fr))",gap:9}}>{filtered.map(x=><label key={x.code} style={{display:"flex",gap:9,alignItems:"center",padding:12,border:"1px solid #e0e6ed",borderRadius:11,cursor:"pointer"}}><input type="checkbox" checked={options.includes(x.code)} onChange={e=>setOptions(current=>e.target.checked?[...new Set([...current,x.code])]:current.filter(code=>code!==x.code))}/>{en?featureNames[x.code]||x.code:x.name}</label>)}</div>
     <h3 style={{fontSize:17,marginTop:22}}>{tr("طريقة التسليم المفضلة","Preferred delivery arrangement")}</h3>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:8}}>
       {[{id:"undecided" as const,label:tr("لم أحدد بعد","Not sure yet"),note:tr("نوضح الاختلاف قبل اعتماد العرض","We will explain the options before approval")},{id:"managed" as const,label:tr("خدمة مُدارة","Managed service"),note:tr("المنصة والاستضافة والمتابعة حسب العقد","Hosting, operation and support as contracted")},{id:"source-code" as const,label:tr("شراء/ترخيص الكود","Source code license"),note:tr("تسليم المصدر والحقوق وفق العقد","Source files and rights as agreed in the contract")}].map(item=><button type="button" key={item.id} aria-pressed={deliveryMethod===item.id} onClick={()=>setDeliveryMethod(item.id)} style={chooseStyle(deliveryMethod===item.id)}><strong>{item.label}</strong><small style={{display:"block",marginTop:6,color:"#61758a"}}>{item.note}</small></button>)}
     </div>
     <label style={{display:"grid",gap:8,fontWeight:700,marginTop:18}}>{tr("اشرح طلبك","Describe your requirements")}<textarea rows={3} maxLength={4000} value={requirements} onChange={e=>setRequirements(e.target.value)} placeholder={tr("أهم التفاصيل أو المشاكل التي تريد حلها","Main goals, requirements or problems to solve")} style={{border:"1px solid #b9c9dc",borderRadius:10,padding:13,fontSize:16}}/></label>
     <p style={{fontSize:13,color:"#607187",lineHeight:1.8}}>{tr("سيُحفظ طلبك باختياراته في حسابك ويُرسل للإدارة، ثم يمكنك متابعة تفاصيله من نفس الحساب. الأسعار النهائية تخضع لمراجعة العرض.","Your selected requirements will be saved and submitted under your account. You can track the same project there; final prices are subject to quote review.")}</p>
     {error&&<p role="alert" style={{padding:12,background:"#fff0dc",borderRadius:10}}>{error}</p>}
     <div className="atsh-start-actions" style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}><button type="button" onClick={()=>setStep(1)} style={{padding:"12px 18px",border:"1px solid #b9c9dc",borderRadius:10,background:"white",cursor:"pointer"}}>{tr("السابق","Previous")}</button><button type="submit" disabled={saving} style={{padding:"12px 18px",border:0,borderRadius:10,background:"#203958",color:"white",fontWeight:800,cursor:"pointer"}}>{saving?"جارٍ الحفظ…":tr("إنشاء الطلب ←","Create request →")}</button></div>
    </section>}
   </form>
  </div>
 </main>;
}
