"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useParams,useSearchParams} from "next/navigation";
import { syncCustomerWorkspace, loadGuestWorkspace, type CustomerWorkspace } from "@/lib/customer-workspace";
import CustomerJourneyHub,{type HubTab} from "@/components/customer-journey-hub";

type Order={id:string;reference:string;status:string;total:number;currency:string;project_id:string};
type Quote={id:number;status:string;total_piasters:number;currency:string};
type Contract={id:number;status:string;body_snapshot:string;quote_id:number};
type Invoice={id:number;status:string;amount_piasters:number;verified_paid_piasters:number};
type Payment={id:number;amount_piasters:number;paid_at:string;provider:string};
type Deliverable={id:string;title:string;kind:string;asset_url:string|null;has_private_file?:boolean;customer_decision:string;customer_feedback:string};
type Project={id:string;customer_name:string;status:string;created_at:string};
type ProjectDraft={id:string;title:string;revision:number;draft:CustomerWorkspace;updated_at:string};
type PreviewVersion={id:string;revision:number;approval_status:string;created_at:string;snapshot:CustomerWorkspace&{projectTitle?:string};customer_comment?:string};
const labels:Record<string,string>={new:"جديد",configured:"تم تحديد المواصفات",quoted:"عرض سعر جاهز",pending:"بانتظار المراجعة",approved:"مُعتمد",changes_requested:"تعديلات مطلوبة",revision_requested:"تعديل مطلوب",signed:"موقّع",paid:"مدفوع مؤكد",payment_pending:"بانتظار الدفع",building:"جارٍ التنفيذ",preview_ready:"المعاينة جاهزة",delivered:"تم التسليم",support:"المتابعة والدعم"};
const humanStatus=(status:string)=>labels[status]??status;
type GoogleCredential={credential:string};
type GoogleApi={accounts:{id:{initialize:(config:{client_id:string;callback:(data:GoogleCredential)=>void})=>void;renderButton:(element:HTMLElement,options:Record<string,string>)=>void}}};
declare global {interface Window {google?:GoogleApi}}

export default function CustomerAccount(){
 const {action}=useParams<{action:string}>();const search=useSearchParams();const [email,setEmail]=useState("");const [name,setName]=useState("");const [password,setPassword]=useState("");const [message,setMessage]=useState("");const [deliverables,setDeliverables]=useState<Deliverable[]>([]);const [feedback,setFeedback]=useState<Record<string,string>>({});const [projects,setProjects]=useState<Project[]>([]);const [orders,setOrders]=useState<Order[]>([]);const [quotes,setQuotes]=useState<Quote[]>([]);const [contracts,setContracts]=useState<Contract[]>([]);const [invoices,setInvoices]=useState<Invoice[]>([]);const [invoicePayments,setInvoicePayments]=useState<Record<number,Payment[]>>({}),[openInvoice,setOpenInvoice]=useState<number|null>(null);const [projectId,setProjectId]=useState("");const [accessToken,setAccessToken]=useState("");const googleContainer=useRef<HTMLDivElement>(null);
 const [workspace,setWorkspace]=useState<CustomerWorkspace|null>(null);
 const [projectDrafts,setProjectDrafts]=useState<ProjectDraft[]>([]);
 const [draftTitle,setDraftTitle]=useState("");
 const [selectedProjectDraft,setSelectedProjectDraft]=useState("");
 const [projectLogoVersion,setProjectLogoVersion]=useState(0);
 const [previewVersions,setPreviewVersions]=useState<PreviewVersion[]>([]);
 const [previewFeedback,setPreviewFeedback]=useState("");
 const [guestPending,setGuestPending]=useState(false);
 const [merging,setMerging]=useState(false);
 const [hubTab,setHubTab]=useState<HubTab>("overview");
 const previewRequestRef=useRef(0);
 useEffect(()=>{
   if(action!=="dashboard")return;
   let active=true;
   const guest=loadGuestWorkspace();
   setGuestPending(Object.keys(guest).length>0);
   void fetch("/api/customer/auth/workspace",{credentials:"include",cache:"no-store"}).then(async r=>r.ok?r.json():null)
    .then(data=>{if(active)setWorkspace(data?.workspace?.draft??{});})
    .catch(()=>{if(active)setMessage("تعذر تحميل مسودة حسابك.");});
   return()=>{active=false;};
 },[action]);
 const loadDrafts=useCallback(async()=>{
  try{
   const response=await fetch("/api/customer/auth/project-drafts",{credentials:"include",cache:"no-store"});
   if(!response.ok)throw Error();
   const body=await response.json();
   setProjectDrafts(body.drafts||[]);
   setSelectedProjectDraft(previous=>previous||body.drafts?.[0]?.id||"");

  }catch{setMessage("تعذر تحميل مسودات مشروعاتك");}
 },[]);
 const uploadProjectLogo=async(file?:File)=>{
  if(!file||!selectedProjectDraft)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2097152){
    setMessage("اختر PNG أو JPEG أو WebP بحجم لا يزيد عن 2 ميجابايت");return;
  }
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/logo`,{method:"POST",credentials:"include",headers:{"content-type":file.type},body:file});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"تعذر رفع الشعار");
   setProjectLogoVersion(n=>n+1);setMessage("تم حفظ شعار هذا المشروع في حسابك فقط");
  }catch(e){setMessage(e instanceof Error?e.message:"تعذر رفع الشعار");}
 };
 const loadPreviews=async(id:string)=>{
  const requestId=++previewRequestRef.current;
  setPreviewVersions([]);
  if(!id)return;
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/previews`,{credentials:"include",cache:"no-store"});
   if(!response.ok)throw Error();
   const body=await response.json();if(requestId===previewRequestRef.current)setPreviewVersions(body.previews||[]);
  }catch{if(requestId===previewRequestRef.current){setPreviewVersions([]);setMessage("تعذر تحميل إصدارات المعاينة");}}
 };
 const savePreviewVersion=async()=>{
  if(!selectedProjectDraft)return;
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/previews`,{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:"{}"});
   const body=await response.json();if(!response.ok)throw Error(body.error||"تعذر إنشاء معاينة");
   await loadPreviews(selectedProjectDraft);setMessage("تم حفظ إصدار معاينة جديد من مسودة مشروعك");
  }catch(e){setMessage(e instanceof Error?e.message:"تعذر الحفظ");}
 };
 const decidePreview=async(previewId:string,decision:"approved"|"changes_requested")=>{
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/previews/${encodeURIComponent(previewId)}/decision`,{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({decision,comment:previewFeedback})});
   const body=await response.json();if(!response.ok)throw Error(body.error||"تعذر حفظ القرار");
   setPreviewFeedback("");await loadPreviews(selectedProjectDraft);setMessage("تم تسجيل قرارك على إصدار المعاينة");
  }catch(e){setMessage(e instanceof Error?e.message:"تعذر حفظ القرار");}
 };
 const createProjectDraft=async(fromGuest=false)=>{
  try{
   const previous=fromGuest?loadGuestWorkspace():{};
   const response=await fetch("/api/customer/auth/project-drafts",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({title:draftTitle.trim()||(previous.businessName?`مشروع ${previous.businessName}`:"مشروع جديد"),draft:previous})});
   const body=await response.json();if(!response.ok)throw Error(body.error||"تعذر الإنشاء");
   setSelectedProjectDraft(body.projectDraft.id);setDraftTitle("");await loadDrafts();
   if(fromGuest){try{localStorage.removeItem("atsh_customer_workspace_v1");}catch{}setGuestPending(false)}
   setHubTab("projects");setMessage(fromGuest?"تم إنشاء مشروع مستقل بجميع اختياراتك السابقة.":"تم إنشاء مسودة مستقلة للمشروع");
  }catch(e){setMessage(e instanceof Error?e.message:"تعذر الإنشاء");}
 };
 const importGuestToProjectDraft=async()=>{
  const guest=loadGuestWorkspace();
  const target=projectDrafts.find(d=>d.id===selectedProjectDraft);
  if(!target){setMessage("اختر مشروعًا أولًا");return;}
  if(!Object.keys(guest).length){setMessage("لا توجد اختيارات سابقة لنقلها");return;}
  setMerging(true);
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(target.id)}`,{method:"PATCH",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:target.revision,patch:guest})});
   const result=await response.json();if(!response.ok)throw Error(result.error||"تعذر حفظ المسودة");
   setProjectDrafts(old=>old.map(x=>x.id===target.id?result.projectDraft:x));
   setWorkspace(result.projectDraft.draft);setGuestPending(false);
   try{localStorage.removeItem("atsh_customer_workspace_v1");}catch{}
   setMessage("تم نقل اختيارات المتصفح إلى المشروع المحدد دون التأثير على بقية مشروعاتك");
  }catch(e){setMessage(e instanceof Error?e.message:"فشل النقل؛ تظل الاختيارات على المتصفح");}
  finally{setMerging(false);}
 };
 const loadProjects=useCallback(async()=>{try{const r=await fetch("/api/customer/auth/projects",{credentials:"include",cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();setProjects(d.projects);}catch{setMessage("سجّل الدخول لعرض مشروعاتك");}},[]);
 const request=useCallback(async(path:string,data:Record<string,string>={})=>{setMessage("جارٍ التنفيذ...");try{const response=await fetch(`/api/customer/auth/${path}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const body=await response.json();setMessage(response.ok&&(path==="register"||path==="verification/resend")
  ?"لو البريد مؤهل، هتوصلك رسالة التأكيد. افتح الرابط المرسل ثم سجّل دخولك."
  :response.ok?body.message||"تم بنجاح":body.error||"تعذر إتمام الطلب");if(response.ok&&(path==="login"||path==="google"))location.href="/account/dashboard";if(response.ok&&path==="logout")location.href="/account/login";if(response.ok&&path==="projects/claim"){setAccessToken("");await loadProjects();}}catch{setMessage("تعذر الاتصال بالخدمة");}},[loadProjects]);
 useEffect(()=>{if(action!=="dashboard")return;let cancelled=false;
  const resources=["orders","quotes","contracts","invoices","deliverables"] as const;
  void Promise.all(resources.map(async kind=>{
   const r=await fetch(kind==="deliverables"?"/api/customer/deliverables":`/api/customer/commercial/${kind}`,{credentials:"include",cache:"no-store"});
   if(!r.ok)throw Error("تعذر تحميل المستندات");return {kind,data:await r.json()};
  })).then(items=>{if(cancelled)return;for(const item of items){
   if(item.kind==="deliverables")setDeliverables(item.data.deliverables||[]);
   if(item.kind==="orders")setOrders(item.data.orders||[]);
   if(item.kind==="quotes")setQuotes(item.data.quotes||[]);
   if(item.kind==="contracts")setContracts(item.data.contracts||[]);
   if(item.kind==="invoices")setInvoices(item.data.invoices||[]);
  }}).catch(()=>{if(!cancelled)setMessage("تعذر تحميل بعض المستندات؛ حاول تحديث الصفحة");});
  return()=>{cancelled=true;};
 },[action]);
 useEffect(()=>{if(action==="verify"&&search.get("token"))void request("verify",{token:search.get("token")!});},[action,search,request]);
 useEffect(()=>{if(action==="dashboard"){void loadProjects();void loadDrafts();}},[action,loadProjects,loadDrafts]);
 useEffect(()=>{if(action==="dashboard"&&selectedProjectDraft)void loadPreviews(selectedProjectDraft);},[action,selectedProjectDraft]);
 useEffect(()=>{if(action!=="login"&&action!=="register")return;const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;if(!clientId)return;let cancelled=false;const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.defer=true;script.onload=()=>{if(cancelled||!googleContainer.current||!window.google)return;window.google.accounts.id.initialize({client_id:clientId,callback:({credential})=>{void request("google",{credential});}});window.google.accounts.id.renderButton(googleContainer.current,{theme:"outline",size:"large",text:"continue_with",locale:"ar"});};document.head.appendChild(script);return()=>{cancelled=true;script.remove();};},[action,request]);
 return <main dir="rtl" style={{maxWidth:action==="dashboard"?1120:540,margin:action==="dashboard"?"1rem auto":"5rem auto",padding:action==="dashboard"?"clamp(12px,3vw,24px)":24,background:action==="dashboard"?"#f6f8fb":undefined}}><h1>{({register:"إنشاء حساب",login:"تسجيل الدخول", "resend-verification":"إعادة إرسال تأكيد البريد",forgot:"استعادة كلمة المرور","reset-password":"تعيين كلمة مرور جديدة",verify:"تأكيد البريد",dashboard:"مشروعاتي"} as Record<string,string>)[action]||"حساب العميل"}</h1>
 {! ["verify","dashboard"].includes(action)&&<form onSubmit={e=>{e.preventDefault();const token=search.get("token")||"";
    const route=({register:"register",login:"login","resend-verification":"verification/resend",forgot:"password/forgot","reset-password":"password/reset"} as Record<string,string>)[action]||"login";
    const data:Record<string,string>={};
    if(action!=="reset-password")data.email=email;
    if(action==="register")data.name=name;
    if(["register","login","reset-password"].includes(action))data.password=password;
    if(action==="reset-password")data.token=token;
    void request(route,data);}}>
 {action==="register"&&<label>الاسم<input required value={name} onChange={e=>setName(e.target.value)}/></label>}
 {action!=="reset-password"&&<label>البريد الإلكتروني<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {["register","login","reset-password"].includes(action)&&<label>كلمة المرور<input type="password" minLength={action==="login"?1:12} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 <button type="submit">متابعة</button></form>}
 {(action==="login"||action==="register")&&<><p><a href="/account/forgot">نسيت كلمة المرور؟</a> · <a href="/account/register">إنشاء حساب</a> · <a href="/account/resend-verification">إعادة إرسال التأكيد</a></p><div ref={googleContainer} aria-label="تسجيل الدخول باستخدام Google"/></>}
 {action==="dashboard"&&<>
 <CustomerJourneyHub active={hubTab} onTab={setHubTab} draftCount={projectDrafts.length} projectCount={projects.length} orderCount={orders.length} quoteCount={quotes.length} contractCount={contracts.length} invoiceCount={invoices.length} deliveryCount={deliverables.length}
  currentProject={selectedProjectDraft?(()=>{const project=projectDrafts.find(d=>d.id===selectedProjectDraft);return project?{title:project.title,sectorName:project.draft?.sectorName,id:project.id,revision:project.revision}:undefined})():undefined}
  currentPreviewStatus={selectedProjectDraft&&previewVersions.length?previewVersions[0].approval_status:undefined}/>
 {message&&<p role="status" aria-live="polite" style={{padding:12,borderRadius:10,background:"#eaf2ff",color:"#1f4166"}}>{message}</p>}
 {hubTab==="settings"&&<section style={{border:"1px solid #d4e2ef",borderRadius:12,padding:16,background:"#f5faff",marginBottom:18}}>
   <h2>اختياراتي المحفوظة من جميع مسارات المنصة</h2>
   {guestPending&&<div style={{padding:12,background:"#fff4db",borderRadius:10,marginBottom:12}}>
     <p>هذا المتصفح يحتفظ باختيارات قبل تسجيل الدخول. لضمان عدم خلط بيانات زوار مختلفين، اختر نقلها إلى حسابك الحالي صراحةً.</p>
     <button disabled={merging} type="button" onClick={async()=>{setMerging(true);try{const result=await syncCustomerWorkspace();setWorkspace(result);setGuestPending(false);setMessage("تم ضم اختيارات المتصفح إلى حسابك بنجاح.");}catch{setMessage("فشل نقل الاختيارات. البيانات ما زالت محفوظة في المتصفح.");}finally{setMerging(false);}}}>{merging?"جارٍ الدمج…":"نقل اختيارات هذا المتصفح إلى حسابي"}</button>
   </div>}
   {workspace?<><p>القطاع: {workspace.sectorName||workspace.sectorSlug||"لم يُحدد"} · النشاط: {workspace.businessName||"لم يُحدد"}</p>
    <p>الباقة: {workspace.packageId||"لم تُحدد"} · طريقة التسليم: {workspace.deliveryMethod||"لم تُحدد"}</p>
    {workspace.sectorSlug&&<a href={`/catalog/${encodeURIComponent(workspace.sectorSlug)}`}>فتح النموذج المختار</a>}
    <p style={{fontSize:12,color:"#64748b"}}>هذا ملخص تفضيلات وليس عرض سعر أو عقدًا أو إثبات شراء.</p>
   </>:<p>لم تتوفر مسودة محفوظة بعد.</p>}
 </section>}
 {hubTab==="projects"&&<section style={{border:"1px solid #cbd5e1",borderRadius:12,padding:16,marginBottom:18,background:"white"}}>
  <h2>مسودات مشروعاتي المستقلة</h2>
  <p>كل مشروع له اختيارات منفصلة. اختر المسودة التي تريد استكمالها أو نقل اختيارات المتصفح إليها.</p>
  <label>اسم المشروع الجديد<input maxLength={120} value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="اسم مشروعك"/></label>
  <button type="button" onClick={()=>void createProjectDraft()}>إنشاء مسودة مشروع</button>
  {guestPending&&<button type="button" onClick={()=>void createProjectDraft(true)} style={{marginInlineStart:10,background:"#203958",color:"white",border:0,borderRadius:8,padding:"11px 13px",cursor:"pointer"}}>إنشاء مشروع جديد باختياراتي السابقة</button>}
  {projectDrafts.length===0&&<p style={{padding:12,background:"#f1f5fb",borderRadius:10}}>ليس لديك مشروع محفوظ بعد. أنشئ مسودة أو اختر نموذجًا من المعرض.</p>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10,margin:"12px 0"}}>
   {projectDrafts.map(d=><button type="button" key={d.id} aria-pressed={selectedProjectDraft===d.id} onClick={()=>setSelectedProjectDraft(d.id)} style={{border:selectedProjectDraft===d.id?"2px solid #203958":"1px solid #d8e2ef",borderRadius:12,padding:15,background:selectedProjectDraft===d.id?"#eaf1fb":"white",textAlign:"right",cursor:"pointer"}}>
      <strong style={{display:"block",color:"#203958",marginBottom:6}}>{d.title}</strong><span style={{display:"block",fontSize:13}}>{d.draft.sectorName||"مشروع جديد"} · إصدار {d.revision}</span><small style={{color:"#64748b"}}>آخر تعديل {new Date(d.updated_at).toLocaleDateString("ar-EG")}</small>
   </button>)}
  </div>
  <label>اختر المسودة<select value={selectedProjectDraft} onChange={e=>setSelectedProjectDraft(e.target.value)}>
   <option value="">اختر مشروعًا</option>{projectDrafts.map(d=><option key={d.id} value={d.id}>{d.title} — إصدار {d.revision}</option>)}
  </select></label>
  {selectedProjectDraft&&<><h3>بيانات المشروع المحدد</h3>
   {(()=>{const draft=projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft;return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:10,margin:"12px 0"}}>
    {[["النموذج",draft?.sectorName||draft?.sectorSlug||"لم يُحدد"],["الباقة",draft?.packageId||"لم تُحدد"],["النشاط",draft?.businessName||"لم يُحدد"],["إضافات القطاع",draft?.sectorAddonCodes?.length?`${draft.sectorAddonCodes.length} إضافة مختارة`:"لا توجد إضافات مختارة"],["طريقة التسليم",draft?.deliveryMethod==="source-code"?"شراء/ترخيص الكود":draft?.deliveryMethod==="managed"?"خدمة مُدارة":"لم تُحدد"]].map(([label,value])=><div key={label} style={{padding:12,background:"#f4f7fb",borderRadius:10}}><small style={{color:"#566d85"}}>{label}</small><p style={{margin:"5px 0 0",fontWeight:700}}>{value}</p></div>)}
   </div>})()}
   <a href={`/?draftId=${encodeURIComponent(selectedProjectDraft)}#configurator`} style={{display:"inline-block",margin:"12px 0",padding:"11px 15px",borderRadius:10,background:"#203958",color:"white"}}>استكمال الباقة والتسعير لهذا المشروع</a>
   <a href={`/account/project-preview/${encodeURIComponent(selectedProjectDraft)}`} style={{display:"inline-block",margin:"12px 8px",padding:"11px 15px",borderRadius:10,background:"#e6eef7",color:"#203958"}}>فتح المعاينة التفاعلية المحفوظة لهذا المشروع</a>
   <div style={{display:"grid",gap:9,margin:"12px 0",padding:12,border:"1px solid #cbd5e1",borderRadius:12}}>
    <label>شعار هذا المشروع فقط (حتى 2 ميجابايت)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadProjectLogo(e.target.files?.[0])}/></label>
    <a href={`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/logo?v=${projectLogoVersion}`} target="_blank" rel="noopener noreferrer">عرض شعار المشروع المحفوظ (إن وجد)</a>
   </div>
   <button type="button" onClick={()=>void savePreviewVersion()}>حفظ إصدار معاينة جديد</button>
   <p>المعاينة هنا توثيق لنسخة بيانات التخصيص فقط؛ ليست رابط نشر لنظام تجاري.</p>
   <label>ملاحظات على المعاينة<input maxLength={2000} value={previewFeedback} onChange={e=>setPreviewFeedback(e.target.value)}/></label>
   <ul>{previewVersions.map((preview,index)=><li key={preview.id} style={{padding:12,border:"1px solid #cbd5e1",marginBottom:10}}>
    إصدار {preview.revision} — {preview.approval_status} — {new Date(preview.created_at).toLocaleString("ar-EG")}
    <details><summary>الاختيارات المحفوظة في هذا الإصدار</summary><div style={{padding:10,background:"#f3f7fa",borderRadius:9}}>
     <p>النظام: {preview.snapshot.sectorName||preview.snapshot.sectorSlug||"لم يحدد"}</p>
     <p>اسم النشاط: {preview.snapshot.businessName||"لم يحدد"}</p>
     <p>الباقة: {preview.snapshot.packageId||"لم تحدد"}</p>
     <p>الإضافات: {preview.snapshot.sectorAddonCodes?.length||0} إضافة</p>
     <p>لون الهوية: {preview.snapshot.brandColor||"افتراضي"}</p>
    </div></details>
    {index===0&&preview.approval_status==="pending"&&<div><button type="button" onClick={()=>void decidePreview(preview.id,"approved")}>اعتماد هذا الإصدار</button><button type="button" onClick={()=>void decidePreview(preview.id,"changes_requested")}>طلب تعديلات</button></div>}
   </li>)}</ul>
  </>}
  {guestPending&&<button disabled={!selectedProjectDraft||merging} type="button" onClick={()=>void importGuestToProjectDraft()}>{merging?"جارٍ النقل…":"نقل اختيارات المتصفح إلى المشروع المحدد"}</button>}
 </section>}
 {hubTab==="quotes"&&<section aria-label="الطلبات وعروض الأسعار" style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>مشروعاتي</h2><ul>{projects.map(p=><li key={p.id}>{p.customer_name} — {humanStatus(p.status)}</li>)}</ul><h2>طلباتي المرتبطة بمشروعاتي</h2><ul>{orders.map(o=><li key={o.id}>{o.reference} — {humanStatus(o.status)} — {Number(o.total).toLocaleString("ar-EG")} {o.currency}</li>)}</ul>
 <h2>عروض الأسعار</h2><ul>{quotes.map(q=><li key={q.id}>عرض #{q.id} — {humanStatus(q.status)} — {(q.total_piasters/100).toFixed(2)} {q.currency}</li>)}</ul></section>}
 {hubTab==="contracts"&&<section aria-label="العقود" style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>عقودي</h2><ul>{contracts.map(c=><li key={c.id}>عقد #{c.id} — {humanStatus(c.status)} <button type="button" onClick={()=>{const w=window.open("","_blank","noopener,noreferrer");if(!w)return;const text=document.createElement("pre");text.textContent=c.body_snapshot;w.document.body.appendChild(text);w.print();}}>طباعة</button></li>)}</ul></section>}
 {hubTab==="invoices"&&<section aria-label="الفواتير والمدفوعات" style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>الفواتير وسجل المدفوعات</h2><ul>{invoices.map(i=><li key={i.id}>فاتورة #{i.id} — {humanStatus(i.status)} — الإجمالي {(Number(i.amount_piasters)/100).toFixed(2)} جنيه — المدفوع {(Number(i.verified_paid_piasters)/100).toFixed(2)} جنيه — المتبقي {((Number(i.amount_piasters)-Number(i.verified_paid_piasters))/100).toFixed(2)} جنيه <button type="button" onClick={async()=>{if(openInvoice===i.id){setOpenInvoice(null);return}try{const r=await fetch(`/api/customer/commercial/invoices/${i.id}/payments`,{credentials:'include',cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();setInvoicePayments(x=>({...x,[i.id]:data.payments||[]}));setOpenInvoice(i.id)}catch{setMessage('تعذر تحميل سجل الدفعات')}}}>عرض الدفعات</button>{openInvoice===i.id&&<ul>{(invoicePayments[i.id]||[]).length?(invoicePayments[i.id]||[]).map(p=><li key={p.id}>{(Number(p.amount_piasters)/100).toFixed(2)} جنيه — {new Date(p.paid_at).toLocaleDateString('ar-EG')} — {p.provider}</li>):<li>لا توجد دفعات مؤكدة</li>}</ul>}</li>)}</ul></section>}
 {hubTab==="deliveries"&&<section aria-label="تسليمات ومراجعات العميل" style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>تسليماتي: الفيديوهات والهوية البصرية</h2><ul>{deliverables.map(d=><li key={d.id}><strong>{d.title}</strong> ({d.kind}) — {humanStatus(d.customer_decision)} {d.has_private_file?<a href={`/api/customer/deliverables/${d.id}/file`} download>تحميل الملف الخاص</a>:d.asset_url?<a href={d.asset_url} target="_blank" rel="noopener noreferrer">مشاهدة / تحميل</a>:<span>لم يُرفق ملف بعد</span>}{d.customer_decision==="pending"&&<><input aria-label="ملاحظات التعديل" placeholder="ملاحظات التعديل" value={feedback[d.id]||""} onChange={e=>setFeedback(x=>({...x,[d.id]:e.target.value}))}/>{(["approved","revision_requested"] as const).map(decision=><button key={decision} type="button" onClick={async()=>{const r=await fetch(`/api/customer/deliverables/${d.id}/decision`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,feedback:feedback[d.id]||""})});if(r.ok)setDeliverables(x=>x.map(item=>item.id===d.id?{...item,customer_decision:decision}:item));else setMessage("تعذر تسجيل القرار");}}>{decision==="approved"?"اعتماد":"طلب تعديل"}</button>)}</>}</li>)}</ul></section>}
 {hubTab==="settings"&&<section aria-label="إعدادات الحساب" style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>ربط مشروع سابق بحسابك</h2><form onSubmit={e=>{e.preventDefault();void request("projects/claim",{projectId,accessToken});}}><label>معرف المشروع<input required value={projectId} onChange={e=>setProjectId(e.target.value)} placeholder="UUID"/></label><label>رمز الوصول للمشروع<input required type="password" value={accessToken} onChange={e=>setAccessToken(e.target.value)} autoComplete="off"/></label><button type="submit">ربط المشروع</button></form><button onClick={()=>void request("logout")}>تسجيل الخروج</button></section>}</>}
 <p role="status" aria-live="polite">{action!=="dashboard"?message:""}</p></main>;
}
