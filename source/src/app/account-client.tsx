"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useParams,useSearchParams} from "next/navigation";
import { syncCustomerWorkspace, loadGuestWorkspace, type CustomerWorkspace } from "@/lib/customer-workspace";
import CustomerJourneyHub,{type HubTab} from "@/components/customer-journey-hub";
import Concierge from "@/components/concierge";

type Order={id:string;reference:string;status:string;total:number;currency:string;project_id:string};
type Quote={id:number;status:string;total_piasters:number;currency:string};
type Contract={id:number;status:string;body_snapshot:string;quote_id:number};
type Invoice={id:number;quote_id:number;status:string;amount_piasters:number;verified_paid_piasters:number};
type Payment={id:number;amount_piasters:number;paid_at:string;provider:string};
type Deliverable={id:string;title:string;kind:string;asset_url:string|null;has_private_file?:boolean;customer_decision:string;customer_feedback:string};
type Project={id:string;customer_name:string;status:string;created_at:string};
type ProjectDraft={id:string;title:string;revision:number;linked_journey_id?:string|null;draft:CustomerWorkspace;updated_at:string};
type PreviewVersion={id:string;revision:number;approval_status:string;created_at:string;snapshot:CustomerWorkspace&{projectTitle?:string};customer_comment?:string};
const labels:Record<string,string>={new:"جديد",configured:"تم تحديد المواصفات",quoted:"عرض سعر جاهز",pending:"بانتظار المراجعة",approved:"مُعتمد",changes_requested:"تعديلات مطلوبة",revision_requested:"تعديل مطلوب",signed:"موقّع",paid:"مدفوع مؤكد",payment_pending:"بانتظار الدفع",building:"جارٍ التنفيذ",preview_ready:"المعاينة جاهزة",delivered:"تم التسليم",support:"المتابعة والدعم"};
const englishStatuses:Record<string,string>={new:"New",configured:"Configured",quoted:"Quote ready",pending:"Pending review",approved:"Approved",changes_requested:"Changes requested",revision_requested:"Revision requested",signed:"Signed",paid:"Paid and verified",payment_pending:"Awaiting payment",building:"In development",preview_ready:"Preview ready",delivered:"Delivered",support:"Support"};
const humanStatus=(status:string,locale:"ar"|"en"="ar")=> (locale==="en"?englishStatuses:labels)[status]??status;
type GoogleCredential={credential:string};
type GoogleApi={accounts:{id:{initialize:(config:{client_id:string;callback:(data:GoogleCredential)=>void})=>void;renderButton:(element:HTMLElement,options:Record<string,string>)=>void}}};
declare global {interface Window {google?:GoogleApi}}

export default function CustomerAccount({locale="ar"}:{locale?:"ar"|"en"}){const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
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
 const [assistantOpen,setAssistantOpen]=useState(false);
 const [accountStatus,setAccountStatus]=useState<"checking"|"authenticated"|"guest">("checking");
 const previewRequestRef=useRef(0);
 useEffect(()=>{
   if(action!=="dashboard")return;
   let active=true;
   void fetch("/api/customer/auth/me",{credentials:"include",cache:"no-store"})
    .then(response=>{if(active)setAccountStatus(response.ok?"authenticated":"guest")})
    .catch(()=>{if(active)setAccountStatus("guest")});
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
 const [projectMessages,setProjectMessages]=useState<Array<{id:number;actor:string;body:string;created_at:string}>>([]);
 const [projectMessageText,setProjectMessageText]=useState("");
 const loadProjectMessages=useCallback(async(id:string)=>{try{const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/messages`,{credentials:"include",cache:"no-store"});if(response.ok){const data=await response.json();setProjectMessages(data.messages||[]);}else setProjectMessages([]);}catch{setProjectMessages([]);}},[]);
 useEffect(()=>{const selected=projectDrafts.find(d=>d.id===selectedProjectDraft);if(selected?.linked_journey_id)void loadProjectMessages(selected.id);else setProjectMessages([]);},[selectedProjectDraft,projectDrafts,loadProjectMessages]);
 const sendProjectMessage=async()=>{if(!selectedProjectDraft||projectMessageText.trim().length<2)return;try{const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/messages`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:projectMessageText.trim()})});const result=await response.json();if(!response.ok)throw Error(result.error||"Message failed");setProjectMessageText("");await loadProjectMessages(selectedProjectDraft);setMessage(t("تم إرسال الرسالة للإدارة.","Message sent to management."));}catch(e){setMessage(e instanceof Error?e.message:"Message failed");}};
 const submitInFlight=useRef(false);
 const [submittingDraft,setSubmittingDraft]=useState(false);
 const submitDraftToAdmin=async()=>{
  if(!selectedProjectDraft||submitInFlight.current)return;
  const target=projectDrafts.find(d=>d.id===selectedProjectDraft);
  if(!target||target.linked_journey_id){setMessage(t("هذا الطلب أُرسل بالفعل للإدارة.","This request has already been submitted."));return;}
  submitInFlight.current=true;setSubmittingDraft(true);
  setMessage(t("جارٍ إرسال المتطلبات للإدارة...","Submitting requirements to management..."));
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(target.id)}/submit`,{method:"POST",credentials:"include"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Submission failed");
   await Promise.all([loadDrafts(),loadProjects()]);
   setMessage(result.alreadySubmitted?t("هذا الطلب مسجل بالفعل لدى الإدارة.","This request is already registered with management."):t("تم إرسال المتطلبات للإدارة. يمكنك متابعة المشروع من لوحة التحكم.","Requirements sent to management. Track the project in your dashboard."));
  }catch(error){setMessage(error instanceof Error?error.message:"Submission failed");}
  finally{submitInFlight.current=false;setSubmittingDraft(false);}
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
   if(fromGuest){try{sessionStorage.removeItem("atsh_customer_workspace_v1");}catch{}setGuestPending(false)}
   setHubTab("projects");setMessage(fromGuest?"تم إنشاء مشروع مستقل بجميع اختياراتك السابقة.":"تم إنشاء مسودة مستقلة للمشروع");
  }catch(e){setMessage(e instanceof Error?e.message:"تعذر الإنشاء");}
 };
 const autoImported=useRef(false);
 useEffect(()=>{if(action!=="dashboard"||accountStatus!=="authenticated"||!guestPending||autoImported.current)return;const guest=loadGuestWorkspace();if((!guest.packageId&&!guest.sectorSlug)||!["configurator","catalog"].includes(guest.source||""))return;autoImported.current=true;void createProjectDraft(true);},[action,accountStatus,guestPending]);
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
   try{sessionStorage.removeItem("atsh_customer_workspace_v1");}catch{}
   setMessage("تم نقل اختيارات المتصفح إلى المشروع المحدد دون التأثير على بقية مشروعاتك");
  }catch(e){setMessage(e instanceof Error?e.message:"فشل النقل؛ تظل الاختيارات على المتصفح");}
  finally{setMerging(false);}
 };
 const loadProjects=useCallback(async()=>{try{const r=await fetch("/api/customer/auth/projects",{credentials:"include",cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();setProjects(d.projects);}catch{setMessage("سجّل الدخول لعرض مشروعاتك");}},[]);
 const request=useCallback(async(path:string,data:Record<string,string>={})=>{setMessage("جارٍ التنفيذ...");try{const response=await fetch(`/api/customer/auth/${path}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const body=await response.json().catch(()=>({error:response.status>=500?"خدمة الحسابات غير متاحة حاليًا (HTTP "+response.status+"). راجع اتصال الواجهة بالخادم في Coolify.":"تعذر قراءة استجابة الخدمة (HTTP "+response.status+")."}));setMessage(response.ok&&(path==="register"||path==="verification/resend")
  ?"لو البريد مؤهل، هتوصلك رسالة التأكيد. افتح الرابط المرسل ثم سجّل دخولك."
  :response.ok?body.message||"تم بنجاح":body.error||"تعذر إتمام الطلب");if(response.ok&&(path==="login"||path==="google"))location.href=`${base}/account/dashboard`;if(response.ok&&path==="logout")location.href=`${base}/account/login`;if(response.ok&&path==="projects/claim"){setAccessToken("");await loadProjects();}}catch{setMessage("تعذر الوصول إلى خدمة الحسابات. تحقق من اتصال الموقع بالخادم ثم حاول مجددًا.");}},[loadProjects]);
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
 useEffect(()=>{if(action!=="login"&&action!=="register")return;const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;if(!clientId)return;let cancelled=false;const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.defer=true;script.onload=()=>{if(cancelled||!googleContainer.current||!window.google)return;window.google.accounts.id.initialize({client_id:clientId,callback:({credential})=>{void request("google",{credential});}});window.google.accounts.id.renderButton(googleContainer.current,{theme:"outline",size:"large",text:"continue_with",locale:locale});};document.head.appendChild(script);return()=>{cancelled=true;script.remove();};},[action,request]);
 return <main className={action==="dashboard"?"atsh-account-dashboard":"atsh-account-auth"} lang={locale} dir={en?"ltr":"rtl"} style={{maxWidth:action==="dashboard"?1120:540,margin:action==="dashboard"?"1rem auto":"5rem auto",padding:action==="dashboard"?"clamp(12px,3vw,24px)":24,background:action==="dashboard"?"#f6f8fb":undefined}}><h1>{(en?{"register":"Create an account","login":"Sign in","resend-verification":"Resend verification email","forgot":"Reset password","reset-password":"Choose a new password","verify":"Verify email","dashboard":"My projects"}:({register:"إنشاء حساب",login:"تسجيل الدخول", "resend-verification":"إعادة إرسال تأكيد البريد",forgot:"استعادة كلمة المرور","reset-password":"تعيين كلمة مرور جديدة",verify:"تأكيد البريد",dashboard:"مشروعاتي"} as Record<string,string>))[action]||t("حساب العميل","Customer account")}</h1>
 {! ["verify","dashboard"].includes(action)&&<form onSubmit={e=>{e.preventDefault();const token=search.get("token")||"";
    const route=({register:"register",login:"login","resend-verification":"verification/resend",forgot:"password/forgot","reset-password":"password/reset"} as Record<string,string>)[action]||"login";
    const data:Record<string,string>={};
    if(action!=="reset-password")data.email=email;
    if(action==="register")data.name=name;
    if(["register","login","reset-password"].includes(action))data.password=password;
    if(action==="reset-password")data.token=token;
    void request(route,data);}}>
 {action==="register"&&<label>{t("الاسم","Name")}<input required value={name} onChange={e=>setName(e.target.value)}/></label>}
 {action!=="reset-password"&&<label>{t("البريد الإلكتروني","Email address")}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {["register","login","reset-password"].includes(action)&&<label>{t("كلمة المرور","Password")}<input type="password" minLength={action==="login"?1:12} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 <button type="submit">{t("متابعة","Continue")}</button></form>}
 {(action==="login"||action==="register")&&<><p><a href={`${base}/account/login`}>{t("لدي حساب · تسجيل الدخول","Already have an account? Sign in")}</a> · <a href={`${base}/account/register`}>{t("إنشاء حساب جديد","Create a new account")}</a> · <a href={`${base}/account/forgot`}>{t("نسيت كلمة المرور؟","Forgot password?")}</a> · <a href={`${base}/account/resend-verification`}>{t("إعادة إرسال التأكيد","Resend confirmation")}</a></p><div ref={googleContainer} aria-label={t("تسجيل الدخول باستخدام Google","Sign in with Google")}/></>}
 {action==="dashboard"&&accountStatus!=="authenticated"&&<section style={{background:"white",border:"1px solid #dce5ee",borderRadius:16,padding:20}}>
   <h2>{accountStatus==="checking"?t("جارٍ التحقق من حسابك…","Checking account…"):t("سجل دخولك لعرض مشروعاتك","Sign in to view projects")}</h2>
   <p>{t("لحماية المشروعات والعروض والفواتير، لا تظهر لوحة العميل إلا بعد التحقق من الجلسة. اختياراتك غير المحفوظة تبقى على هذا المتصفح حتى تقرر نقلها.","Your projects, quotations and invoices are private. Sign in to securely access them. Unsaved selections remain on this device until you choose to import them.")}</p>
   <div style={{display:"flex",flexWrap:"wrap",gap:11}}><a href={`${base}/account/login`} style={{padding:"11px 15px",background:"#203958",color:"white",borderRadius:10}}>{t("تسجيل الدخول","Sign in")}</a><a href={`${base}/account/register`} style={{padding:"11px 15px",border:"1px solid #cbd5e1",borderRadius:10}}>{t("إنشاء حساب","Create account")}</a></div>
  </section>}
 {action==="dashboard"&&accountStatus==="authenticated"&&<>
 <CustomerJourneyHub locale={locale} active={hubTab} onTab={setHubTab} draftCount={projectDrafts.length} projectCount={projects.length} orderCount={orders.length} quoteCount={quotes.length} contractCount={contracts.length} invoiceCount={invoices.length} deliveryCount={deliverables.length}
  currentProject={selectedProjectDraft?(()=>{const project=projectDrafts.find(d=>d.id===selectedProjectDraft);return project?{title:project.title,sectorName:project.draft?.sectorName,id:project.id,revision:project.revision}:undefined})():undefined}
  currentPreviewStatus={selectedProjectDraft&&previewVersions.length?previewVersions[0].approval_status:undefined}
  currentJourneyStatus={projects.find(project=>project.id===projectDrafts.find(draft=>draft.id===selectedProjectDraft)?.linked_journey_id)?.status}/>
 {message&&<p role="status" aria-live="polite" style={{padding:12,borderRadius:10,background:"#eaf2ff",color:"#1f4166"}}>{message}</p>}
 <style>{`.atsh-customer-assistant{position:fixed;inset:auto 18px 88px auto;width:min(440px,calc(100vw - 24px));height:min(680px,calc(100dvh - 115px));z-index:1000;background:white;border:1px solid #d5e2f1;border-radius:18px;box-shadow:0 18px 65px #102c4b38;overflow:hidden;display:flex;flex-direction:column}.atsh-customer-assistant-body{flex:1;overflow:auto;min-height:0}.atsh-customer-assistant-launch{position:fixed;bottom:18px;right:18px;z-index:1001;border:0;border-radius:99px;padding:13px 18px;background:#203958;color:white;font:inherit;font-weight:800;box-shadow:0 7px 24px #102c4b40;cursor:pointer}@media(max-width:600px){.atsh-customer-assistant{right:8px;left:8px;bottom:76px;width:auto;height:min(620px,calc(100dvh - 95px))}.atsh-customer-assistant-launch{bottom:12px;right:12px}}`}</style>
 <button type="button" className="atsh-customer-assistant-launch" aria-expanded={assistantOpen} aria-controls="atsh-customer-assistant-panel" onClick={()=>setAssistantOpen(value=>!value)}>{assistantOpen?t("إغلاق المساعد ×","Close assistant ×"):t("✦ اسأل مساعد ATSH","✦ Ask ATSH AI")}</button>
 {assistantOpen&&<aside id="atsh-customer-assistant-panel" className="atsh-customer-assistant" role="dialog" aria-modal="false" aria-label={t("مساعد ATSH AI","ATSH AI assistant")} dir={en?"ltr":"rtl"}><header style={{padding:"12px 16px",background:"#203958",color:"white",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong>{t("مساعد ATSH AI","ATSH AI assistant")}</strong><button type="button" aria-label={t("إغلاق المساعد","Close assistant")} onClick={()=>setAssistantOpen(false)} style={{background:"transparent",border:"1px solid #9eb4cb",color:"white",borderRadius:8,padding:"5px 10px",cursor:"pointer"}}>×</button></header><div className="atsh-customer-assistant-body"><Concierge locale={locale} embedded /></div></aside>}
  {hubTab==="settings"&&<section style={{border:"1px solid #d4e2ef",borderRadius:12,padding:16,background:"#f5faff",marginBottom:18}}>
   <h2>{t("اختياراتي المحفوظة من جميع مسارات المنصة","My saved project preferences")}</h2>
   {guestPending&&<div style={{padding:12,background:"#fff4db",borderRadius:10,marginBottom:12}}>
     <p>{t("هذا المتصفح يحتفظ باختيارات قبل تسجيل الدخول. لضمان عدم خلط بيانات زوار مختلفين، اختر نقلها إلى حسابك الحالي صراحةً.","This browser contains preferences saved before sign-in. Import them into your account only if you agree.")}</p>
     <button disabled={merging} type="button" onClick={async()=>{setMerging(true);try{const result=await syncCustomerWorkspace();setWorkspace(result);setGuestPending(false);setMessage("تم ضم اختيارات المتصفح إلى حسابك بنجاح.");}catch{setMessage("فشل نقل الاختيارات. البيانات ما زالت محفوظة في المتصفح.");}finally{setMerging(false);}}}>{merging?"جارٍ الدمج…":"نقل اختيارات هذا المتصفح إلى حسابي"}</button>
   </div>}
   {workspace?<><p>القطاع: {workspace.sectorName||workspace.sectorSlug||"لم يُحدد"} · النشاط: {workspace.businessName||"لم يُحدد"}</p>
    <p>الباقة: {workspace.packageId||"لم تُحدد"} · طريقة التسليم: {workspace.deliveryMethod||"لم تُحدد"}</p>
    {workspace.sectorSlug&&<a href={`${base}/catalog/${encodeURIComponent(workspace.sectorSlug)}`}>{t("فتح النموذج المختار","Open selected demo")}</a>}
    <p style={{fontSize:12,color:"#64748b"}}>{t("هذا ملخص تفضيلات وليس عرض سعر أو عقدًا أو إثبات شراء.","These are preferences only, not a quote, contract or proof of purchase.")}</p>
   </>:<p>{t("لم تتوفر مسودة محفوظة بعد.","No saved draft available yet.")}</p>}
 </section>}
 {hubTab==="overview"&&guestPending&&<section style={{padding:18,background:"#fff4db",border:"1px solid #e7c97d",borderRadius:14,marginBottom:16}}><h2>{t("متطلبات الباقة محفوظة","Your package requirements are saved")}</h2><p>{t("جارٍ نقل الاختيارات إلى مشروعك داخل الحساب. إذا لم يتم النقل، يمكنك إكماله يدويًا.","Your selections are being added to your account project. If needed, you can import them manually.")}</p><button type="button" onClick={()=>setHubTab("projects")}>{t("عرض متطلبات المشروع","View project requirements")}</button></section>}
 {hubTab==="overview"&&projectDrafts.length>0&&<section style={{padding:18,background:"#fff",border:"1px solid #dce4ef",borderRadius:14,marginBottom:16}}><h2>{t("مشروعاتي ومتطلباتي","My projects and requirements")}</h2><p>{t("متطلباتك محفوظة في مشروع مستقل. راجع التفاصيل والمعاينات ثم تابع عروض الإدارة والموافقات والفواتير.","Your requirements are saved as a separate project. Review previews, management quotes, approvals, and invoices.")}</p><button type="button" onClick={()=>setHubTab("projects")}>{t("فتح متطلبات المشروع","Open project requirements")}</button> <button type="button" onClick={()=>setHubTab("quotes")}>{t("طلبات الإدارة وعروض الأسعار","Orders and quotations")}</button> <button type="button" onClick={()=>setHubTab("invoices")}>{t("الفاتورة والدفع","Invoices and payments")}</button></section>}
 {hubTab==="projects"&&<section style={{border:"1px solid #cbd5e1",borderRadius:12,padding:16,marginBottom:18,background:"white"}}>
  <h2>{t("طلباتي وفواتيري التقديرية","My requests and estimated invoices")}</h2>
  <p>{t("كل مشروع له اختيارات منفصلة. اختر المسودة التي تريد استكمالها أو نقل اختيارات المتصفح إليها.","Each project has independent selections. Choose which draft to continue or import into.")}</p>
  <label>{t("اسم المشروع الجديد","New project name")}<input maxLength={120} value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder={t("اسم مشروعك","Project name")}/></label>
  <button type="button" onClick={()=>void createProjectDraft()}>{t("إنشاء مسودة مشروع","Create project draft")}</button>
  {guestPending&&<button type="button" onClick={()=>void createProjectDraft(true)} style={{marginInlineStart:10,background:"#203958",color:"white",border:0,borderRadius:8,padding:"11px 13px",cursor:"pointer"}}>{t("إنشاء مشروع جديد باختياراتي السابقة","Create a project with my saved selections")}</button>}
  {projectDrafts.length===0&&<p style={{padding:12,background:"#f1f5fb",borderRadius:10}}>{t("ليس لديك مشروع محفوظ بعد. أنشئ مسودة أو اختر نموذجًا من المعرض.","No saved projects yet. Create a draft or explore interactive demos.")}</p>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:10,margin:"12px 0"}}>
   {projectDrafts.map(d=><button type="button" key={d.id} aria-pressed={selectedProjectDraft===d.id} onClick={()=>setSelectedProjectDraft(d.id)} style={{border:selectedProjectDraft===d.id?"2px solid #203958":"1px solid #d8e2ef",borderRadius:12,padding:15,background:selectedProjectDraft===d.id?"#eaf1fb":"white",textAlign:en?"left":"right",cursor:"pointer"}}>
      <strong style={{display:"block",color:"#203958",marginBottom:6}}>{d.title}</strong><span style={{display:"block",fontSize:13}}>{d.draft.sectorName||t("مشروع جديد","New project")}</span><small style={{color:"#64748b"}}>آخر تعديل {new Date(d.updated_at).toLocaleDateString("ar-EG")}</small>
   </button>)}
  </div>
  <label>{t("اختر الطلب","Choose request")}<select value={selectedProjectDraft} onChange={e=>setSelectedProjectDraft(e.target.value)}>
   <option value="">{t("اختر مشروعًا","Choose a project")}</option>{projectDrafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
  </select></label>
  {selectedProjectDraft&&<><h3>{t("ملخص الطلب","Request summary")}</h3>
   {(()=>{const draft=projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft;return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:10,margin:"12px 0"}}>
    {[["النموذج",draft?.sectorName||draft?.sectorSlug||"لم يُحدد"],["الباقة",draft?.packageId||"لم تُحدد"],["النشاط",draft?.businessName||"لم يُحدد"],["إضافات القطاع",draft?.sectorAddonCodes?.length?`${draft.sectorAddonCodes.length} إضافة مختارة`:"لا توجد إضافات مختارة"],["طريقة التسليم",draft?.deliveryMethod==="source-code"?"شراء/ترخيص الكود":draft?.deliveryMethod==="managed"?"خدمة مُدارة":"لم تُحدد"]].map(([label,value])=><div key={label} style={{padding:12,background:"#f4f7fb",borderRadius:10}}><small style={{color:"#566d85"}}>{label}</small><p style={{margin:"5px 0 0",fontWeight:700}}>{value}</p></div>)}
   </div>})()}
   <div style={{padding:14,background:"#edf6ff",border:"1px solid #bdd5ee",borderRadius:12,margin:"12px 0"}}><h3>{t("إرسال الطلب للإدارة","Submit request to management")}</h3><p>{projectDrafts.find(d=>d.id===selectedProjectDraft)?.linked_journey_id?t("أُرسل المشروع بالفعل إلى الإدارة. تابع المراجعة والمراسلات من حسابك.","This project has been submitted. Follow its review and messages in your account."):t("بعد مراجعة اختياراتك، أرسلها للإدارة لبدء المراجعة وإعداد المعاينة والعرض.","After reviewing your selections, submit them to management for review, preview and quotation.")}</p><button type="button" disabled={!!projectDrafts.find(d=>d.id===selectedProjectDraft)?.linked_journey_id||!((projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft.packageId)||(projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft.sectorSlug)||(projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft.projectMode==="custom"&&projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft.requirements?.trim()))} onClick={()=>void submitDraftToAdmin()} disabled={submittingDraft}>{submittingDraft?t("جارٍ الإرسال...","Submitting..."):t("إرسال الطلب للإدارة","Submit request to management")}</button><div style={{marginTop:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><button type="button" disabled aria-disabled="true" title={t("يتاح بعد موافقة الإدارة وربط بوابة الدفع","Available after management approval and payment integration")}>{t("الدفع الإلكتروني","Online payment")}</button><small>{t("يُفعّل بعد اعتماد عرض الإدارة وتوفير رابط دفع آمن.","Enabled after management approves the offer and a secure payment link is available.")}</small></div></div>
   {projectDrafts.find(d=>d.id===selectedProjectDraft)?.linked_journey_id&&<section style={{padding:14,border:"1px solid #d4e2ef",borderRadius:12,margin:"12px 0"}}><h3>{t("رسائل الإدارة","Messages from management")}</h3><div aria-live="polite" style={{maxHeight:320,overflowY:"auto",display:"grid",gap:8}}>{projectMessages.map(m=><div key={m.id} style={{padding:10,background:m.actor==="customer"?"#e9f3ff":"#f1f5f9",borderRadius:8,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}><strong>{m.actor==="customer"?t("أنت","You"):t("الإدارة","Management")}</strong>{m.actor==="admin"&&m.body.startsWith("ATSH_PREVIEW_URL: ")?(()=>{const url=m.body.slice(18).trim();try{const parsed=new URL(url);return parsed.protocol==="https:"?<a href={url} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:10,color:"#174e83",fontWeight:700}}>{t("فتح المعاينة التفاعلية المنشورة ↗","Open published interactive preview ↗")}</a>:<p>{m.body}</p>;}catch{return <p>{m.body}</p>}})():<p>{m.body}</p>}<small>{new Date(m.created_at).toLocaleString(locale==="en"?"en-US":"ar-EG")}</small></div>)}</div><label>{t("رسالة أو طلب تعديل","Message or revision request")}<textarea rows={3} maxLength={2000} value={projectMessageText} onChange={e=>setProjectMessageText(e.target.value)} placeholder={t("اكتب تفاصيل التعديل المطلوب...","Describe your requested changes...")}/></label><button type="button" disabled={projectMessageText.trim().length<2} onClick={()=>void sendProjectMessage()}>{t("إرسال للإدارة","Send to management")}</button><button type="button" onClick={()=>void loadProjectMessages(selectedProjectDraft)}>{t("تحديث الرسائل","Refresh messages")}</button></section>}
   <a href={`${base}/configure?draftId=${encodeURIComponent(selectedProjectDraft)}#configurator`} style={{display:"inline-block",margin:"12px 0",padding:"11px 15px",borderRadius:10,background:"#203958",color:"white"}}>{t("استكمال الإضافات لهذا المشروع","Continue project add-ons")}</a>
   <a href={`${base}/account/project-preview/${encodeURIComponent(selectedProjectDraft)}`} style={{display:"inline-block",margin:"12px 8px",padding:"11px 15px",borderRadius:10,background:"#e6eef7",color:"#203958"}}>{t("معاينة مشروعي","Preview my project")}</a>
   <details style={{margin:"12px 0",padding:12,border:"1px solid #cbd5e1",borderRadius:12}}><summary style={{cursor:"pointer",fontWeight:700}}>{t("تغيير شعار المشروع","Change project logo")}</summary>
    <label>{t("شعار هذا المشروع فقط (حتى 2 ميجابايت)","Logo for this project (up to 2 MB)")}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadProjectLogo(e.target.files?.[0])}/></label>
    <a href={`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/logo?v=${projectLogoVersion}`} target="_blank" rel="noopener noreferrer">{t("عرض شعار المشروع المحفوظ (إن وجد)","View saved project logo (if any)")}</a>
   </details>
    <details style={{margin:"12px 0",padding:12,border:"1px solid #dce4ef",borderRadius:12}}><summary style={{fontWeight:700,cursor:"pointer"}}>{t("تفاصيل ومعاينات المشروع","Project details and previews")}</summary>   <div style={{padding:14,border:"1px solid #d6e4f0",borderRadius:12,background:"#f5f9ff"}}><h3>{t("تفاصيل طلبي","My request details")}</h3><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",lineHeight:1.7}}>{projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft.requirements||t("لم تُسجل تفاصيل المتطلبات بعد.","No detailed requirements saved yet.")}</p><button type="button" disabled={!projectDrafts.find(d=>d.id===selectedProjectDraft)?.draft.requirements} onClick={()=>void savePreviewVersion()}>{t("حفظ تفاصيل الطلب","Save request details")}</button><p style={{fontSize:13,color:"#52667b"}}>{t("تُحفظ نسخة مرقمة في حسابك للمراجعة. لا يعني ذلك أن الإدارة وافقت أو أن معاينة منشورة جاهزة.","A numbered review snapshot is saved to your account. This does not mean management approval or a deployed preview is available.")}</p></div>

   <label>{t("ملاحظات على المعاينة","Preview comments")}<input maxLength={2000} value={previewFeedback} onChange={e=>setPreviewFeedback(e.target.value)}/></label>
   <ul>{previewVersions.map((preview,index)=><li key={preview.id} style={{padding:12,border:"1px solid #cbd5e1",marginBottom:10}}>
    {t("معاينة المشروع","Project preview")} — {new Date(preview.created_at).toLocaleDateString(en?"en-US":"ar-EG")}
    <details><summary>{t("الاختيارات المحفوظة في هذا الإصدار","Saved selections for this version")}</summary><div style={{padding:10,background:"#f3f7fa",borderRadius:9}}>
     <p>النظام: {preview.snapshot.sectorName||preview.snapshot.sectorSlug||"لم يحدد"}</p>
     <p>اسم النشاط: {preview.snapshot.businessName||"لم يحدد"}</p>
     <p>الباقة: {preview.snapshot.packageId||"لم تحدد"}</p>
     <p>الإضافات: {preview.snapshot.sectorAddonCodes?.length||0} إضافة</p>
     <p>لون الهوية: {preview.snapshot.brandColor||"افتراضي"}</p>
    </div></details>
    {index===0&&preview.approval_status==="pending"&&<div><button type="button" onClick={()=>void decidePreview(preview.id,"approved")}>{t("اعتماد هذا الإصدار","Approve this version")}</button><button type="button" onClick={()=>void decidePreview(preview.id,"changes_requested")}>{t("طلب تعديلات","Request revisions")}</button></div>}
   </li>)}</ul>
    </details>  </>}
  {guestPending&&<button disabled={!selectedProjectDraft||merging} type="button" onClick={()=>void importGuestToProjectDraft()}>{merging?"جارٍ النقل…":"نقل اختيارات المتصفح إلى المشروع المحدد"}</button>}
 </section>}
 {hubTab==="quotes"&&<section aria-label={t("الطلبات وعروض الأسعار","Orders & quotes")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("مشروعاتي","My projects")}</h2><ul>{projects.map(p=><li key={p.id}>{p.customer_name} — {humanStatus(p.status,locale)}</li>)}</ul><h2>{t("طلباتي المرتبطة بمشروعاتي","Orders for my projects")}</h2><ul>{orders.map(o=><li key={o.id}>{o.reference} — {humanStatus(o.status,locale)} — {Number(o.total).toLocaleString("ar-EG")} {o.currency}</li>)}</ul>
 <h2>{t("عروض الأسعار","Quotations")}</h2><p>{t("راجع كل بند، واقرأ العقد وسجل موافقتك من صفحة محمية مرتبطة بحسابك. يمكنك طلب تعديل قبل الاعتماد.","Review every item and the contract on the secure account page. You can request revisions before approval.")}</p>
 {quotes.length===0&&<p>{t("لا توجد عروض صادرة لحسابك بعد. سيتم إعداد العرض بعد اعتماد نموذج المشروع ومراجعة الطلب.","No quotes issued to your account yet. A quote will be prepared after your project review.")}</p>}
 <ul>{quotes.map(q=><li key={q.id} style={{padding:"12px 0",borderBottom:"1px solid #dfe6ef"}}><strong>عرض #{q.id}</strong> — {humanStatus(q.status,locale)} — {(q.total_piasters/100).toFixed(2)} {q.currency} <a href={`${base}/account/checkout/${q.id}`} style={{display:"inline-block",marginInlineStart:12,color:"#174e83",fontWeight:800}}>{t("مراجعة العرض والعقد والفاتورة ←","Review quote, contract & invoice →")}</a></li>)}</ul></section>}
 {hubTab==="contracts"&&<section aria-label="العقود" style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("عقودي","My contracts")}</h2><ul>{contracts.map(c=><li key={c.id}>عقد #{c.id} — {humanStatus(c.status,locale)} — <a href={`${base}/account/checkout/${c.quote_id}`} style={{color:"#174e83",fontWeight:700}}>{t("التفاصيل وسجل الاعتماد","Details & approval log")}</a> <button type="button" onClick={()=>{const w=window.open("","_blank","noopener,noreferrer");if(!w)return;const text=document.createElement("pre");text.textContent=c.body_snapshot;w.document.body.appendChild(text);w.print();}}>{t("طباعة","Print")}</button></li>)}</ul></section>}
 {hubTab==="invoices"&&<section aria-label={t("الفواتير والمدفوعات","Invoices & payments")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("الفواتير وسجل المدفوعات","Invoices & payment history")}</h2><p style={{background:"#fff5d8",borderRadius:10,padding:12}}>{t("ربط بوابة الدفع الإلكتروني مؤجل. لا تعتبر أي فاتورة مدفوعة دون تحقق موثوق من السداد، ولا تُدخل بيانات بطاقتك في الموقع الآن.","Online payment is not connected yet. Invoices are marked paid only after verified settlement. Do not enter card details here.")}</p><ul>{invoices.map(i=><li key={i.id}>فاتورة #{i.id} — {humanStatus(i.status,locale)} <a href={`${base}/account/checkout/${i.quote_id}`} style={{color:"#174e83",fontWeight:700}}>{t("عرض فاتورة المشروع","View invoice")}</a> — الإجمالي {(Number(i.amount_piasters)/100).toFixed(2)} جنيه — المدفوع {(Number(i.verified_paid_piasters)/100).toFixed(2)} جنيه — المتبقي {((Number(i.amount_piasters)-Number(i.verified_paid_piasters))/100).toFixed(2)} جنيه <button type="button" onClick={async()=>{if(openInvoice===i.id){setOpenInvoice(null);return}try{const r=await fetch(`/api/customer/commercial/invoices/${i.id}/payments`,{credentials:'include',cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();setInvoicePayments(x=>({...x,[i.id]:data.payments||[]}));setOpenInvoice(i.id)}catch{setMessage('تعذر تحميل سجل الدفعات')}}}>{t("عرض الدفعات","View payments")}</button>{openInvoice===i.id&&<ul>{(invoicePayments[i.id]||[]).length?(invoicePayments[i.id]||[]).map(p=><li key={p.id}>{(Number(p.amount_piasters)/100).toFixed(2)} جنيه — {new Date(p.paid_at).toLocaleDateString('ar-EG')} — {p.provider}</li>):<li>{t("لا توجد دفعات مؤكدة","No confirmed payments")}</li>}</ul>}</li>)}</ul></section>}
 {hubTab==="deliveries"&&<section aria-label={t("تسليمات ومراجعات العميل","Customer deliverables & reviews")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("تسليماتي: الفيديوهات والهوية البصرية","My deliverables: media and branding")}</h2><ul>{deliverables.map(d=><li key={d.id}><strong>{d.title}</strong> ({d.kind}) — {humanStatus(d.customer_decision,locale)} {d.has_private_file?<a href={`/api/customer/deliverables/${d.id}/file`} download>{t("تحميل الملف الخاص","Download private file")}</a>:d.asset_url?<a href={d.asset_url} target="_blank" rel="noopener noreferrer">{t("مشاهدة / تحميل","View / download")}</a>:<span>{t("لم يُرفق ملف بعد","No file attached")}</span>}{d.customer_decision==="pending"&&<><input aria-label={t("ملاحظات التعديل","Revision comments")} placeholder={t("ملاحظات التعديل","Revision comments")} value={feedback[d.id]||""} onChange={e=>setFeedback(x=>({...x,[d.id]:e.target.value}))}/>{(["approved","revision_requested"] as const).map(decision=><button key={decision} type="button" onClick={async()=>{const r=await fetch(`/api/customer/deliverables/${d.id}/decision`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,feedback:feedback[d.id]||""})});if(r.ok)setDeliverables(x=>x.map(item=>item.id===d.id?{...item,customer_decision:decision}:item));else setMessage("تعذر تسجيل القرار");}}>{decision==="approved"?"اعتماد":"طلب تعديل"}</button>)}</>}</li>)}</ul></section>}
 {hubTab==="settings"&&<section aria-label={t("إعدادات الحساب","Account settings")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("ربط مشروع سابق بحسابك","Connect an existing project")}</h2><form onSubmit={e=>{e.preventDefault();void request("projects/claim",{projectId,accessToken});}}><label>{t("معرف المشروع","Project ID")}<input required value={projectId} onChange={e=>setProjectId(e.target.value)} placeholder="UUID"/></label><label>{t("رمز الوصول للمشروع","Project access token")}<input required type="password" value={accessToken} onChange={e=>setAccessToken(e.target.value)} autoComplete="off"/></label><button type="submit">{t("ربط المشروع","Link project")}</button></form><button onClick={()=>void request("logout")}>{t("تسجيل الخروج","Sign out")}</button></section>}</>}
 <p role="status" aria-live="polite">{action!=="dashboard"?message:""}</p></main>;
}
