"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useParams,useSearchParams} from "next/navigation";
import { syncCustomerWorkspace, loadGuestWorkspace, type CustomerWorkspace } from "@/lib/customer-workspace";
import CustomerJourneyHub,{type HubTab} from "@/components/customer-journey-hub";
import CustomerProjectAcceptance from "@/components/customer-project-acceptance";
import NotificationInbox from "@/components/notification-inbox";

type Order={id:string;reference:string;status:string;total:number;currency:string;project_id:string};
type Quote={id:number;status:string;total_piasters:number;currency:string};
type Contract={id:number;status:string;body_snapshot:string;quote_id:number};
type Invoice={id:number;quote_id:number;status:string;amount_piasters:number;verified_paid_piasters:number};
type Payment={id:number;amount_piasters:number;paid_at:string;provider:string};
type Deliverable={id:string;title:string;kind:string;asset_url:string|null;has_private_file?:boolean;customer_decision:string;customer_feedback:string};
type Project={id:string;customer_name:string;status:string;created_at:string};
type ActiveService={id:string;service_code:string;service_name:string;description:string;source_type:string;status:string;activated_at:string|null;expires_at:string|null};
type ProjectDraft={id:string;title:string;revision:number;linked_journey_id?:string|null;draft:CustomerWorkspace;updated_at:string};
type PreviewVersion={id:string;revision:number;approval_status:string;created_at:string;snapshot:CustomerWorkspace&{projectTitle?:string};customer_comment?:string};
const labels:Record<string,string>={new:"جديد",configured:"تم تحديد المواصفات",quoted:"عرض سعر جاهز",pending:"بانتظار المراجعة",approved:"مُعتمد",changes_requested:"تعديلات مطلوبة",revision_requested:"تعديل مطلوب",signed:"موقّع",paid:"مدفوع مؤكد",payment_pending:"بانتظار الدفع",building:"جارٍ التنفيذ",preview_ready:"المعاينة جاهزة",delivered:"تم التسليم",support:"المتابعة والدعم"};
const englishStatuses:Record<string,string>={new:"New",configured:"Configured",quoted:"Quote ready",pending:"Pending review",approved:"Approved",changes_requested:"Changes requested",revision_requested:"Revision requested",signed:"Signed",paid:"Paid and verified",payment_pending:"Awaiting payment",building:"In development",preview_ready:"Preview ready",delivered:"Delivered",support:"Support"};
const humanStatus=(status:string,locale:"ar"|"en"="ar")=> (locale==="en"?englishStatuses:labels)[status]??status;
const requestSummaryLines=(body:string)=>{const lines=body.split(/\\n|\r?\n/).map(line=>line.trim()).filter(Boolean);return lines.length>=3&&lines.some(line=>line.startsWith("الباقة:"))&&lines.some(line=>line.startsWith("تنفيذ:"))?lines:null;};
function CustomerMessageBody({body,locale}:{body:string;locale:"ar"|"en"}){const lines=requestSummaryLines(body);if(!lines)return <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{body}</p>;return <details style={{marginTop:8,padding:12,background:"#fff",border:"1px solid #cbd5e1",borderRadius:10}}><summary style={{cursor:"pointer",fontWeight:700}}>{locale==="en"?"Saved project configuration (not an invoice)":"تفاصيل اختيارات المشروع المحفوظة (ليست فاتورة)"}</summary><dl style={{display:"grid",gridTemplateColumns:"minmax(90px,auto) 1fr",gap:8,marginTop:12}}>{lines.map((line,index)=>{const separator=line.indexOf(":");const label=separator>=0?line.slice(0,separator):"—";const value=separator>=0?line.slice(separator+1).trim():line;return <div key={index} style={{display:"contents"}}><dt style={{fontWeight:700,color:"#52667b"}}>{label}</dt><dd style={{margin:0,overflowWrap:"anywhere"}}>{value}</dd></div>})}</dl><small>{locale==="en"?"Estimated figures; final invoice is issued separately.":"الأرقام تقديرية؛ الفاتورة المعتمدة تصدر بصورة مستقلة."}</small></details>}
type GoogleCredential={credential:string};
type GoogleApi={accounts:{id:{initialize:(config:{client_id:string;callback:(data:GoogleCredential)=>void})=>void;renderButton:(element:HTMLElement,options:Record<string,string>)=>void}}};
declare global {interface Window {google?:GoogleApi}}

export default function CustomerAccount({locale="ar"}:{locale?:"ar"|"en"}){const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
 const {action}=useParams<{action:string}>();const search=useSearchParams();const [email,setEmail]=useState("");const [name,setName]=useState("");const [password,setPassword]=useState("");const [notificationConsent,setNotificationConsent]=useState(false);const [message,setMessage]=useState("");const [deliverables,setDeliverables]=useState<Deliverable[]>([]);const [feedback,setFeedback]=useState<Record<string,string>>({});const [projects,setProjects]=useState<Project[]>([]);const [orders,setOrders]=useState<Order[]>([]);const [quotes,setQuotes]=useState<Quote[]>([]);const [contracts,setContracts]=useState<Contract[]>([]);const [invoices,setInvoices]=useState<Invoice[]>([]);const [invoicePayments,setInvoicePayments]=useState<Record<number,Payment[]>>({}),[openInvoice,setOpenInvoice]=useState<number|null>(null);const [projectId,setProjectId]=useState("");const [accessToken,setAccessToken]=useState("");const googleContainer=useRef<HTMLDivElement>(null);
 const [workspace,setWorkspace]=useState<CustomerWorkspace|null>(null);
 const [projectDrafts,setProjectDrafts]=useState<ProjectDraft[]>([]);
 const [activeServices,setActiveServices]=useState<ActiveService[]>([]);
 const [servicesError,setServicesError]=useState("");
 const [draftTitle,setDraftTitle]=useState("");
 const [selectedProjectDraft,setSelectedProjectDraft]=useState("");
 const [projectLogoVersion,setProjectLogoVersion]=useState(0);
 const [previewVersions,setPreviewVersions]=useState<PreviewVersion[]>([]);
 const [previewFeedback,setPreviewFeedback]=useState("");
 const [guestPending,setGuestPending]=useState(false);
 const [merging,setMerging]=useState(false);
 const [hubTab,setHubTab]=useState<HubTab>("projects");

 const [accountStatus,setAccountStatus]=useState<"checking"|"authenticated"|"guest">("checking");
 const previewRequestRef=useRef(0);
 useEffect(()=>{if(action!=="dashboard")return;const tab=search.get("view");if(tab&&["overview","projects","messages","preview","services","quotes","contracts","invoices","deliveries","assistant","settings"].includes(tab))setHubTab(tab as HubTab);else if(search.get("tab")==="invoices")setHubTab("projects");const project=search.get("project");if(project&&/^[0-9a-f-]{36}$/i.test(project))setSelectedProjectDraft(project);},[action,search]);
 useEffect(()=>{if(action!=="dashboard")return;const sync=()=>{const url=new URL(window.location.href);url.searchParams.set("view",hubTab);if(selectedProjectDraft)url.searchParams.set("project",selectedProjectDraft);else url.searchParams.delete("project");window.history.replaceState(window.history.state,"",url);};window.addEventListener("atsh-language-switch",sync);return()=>window.removeEventListener("atsh-language-switch",sync);},[action,hubTab,selectedProjectDraft]);
 useEffect(()=>{if(action!=="dashboard"||accountStatus!=="authenticated"||!loadGuestWorkspace().draftInvoice)return;let active=true;void syncCustomerWorkspace().then(result=>{if(active){setWorkspace(result);setGuestPending(false);}}).catch(()=>{if(active)setMessage(t("تعذر حفظ الفاتورة المؤقتة في حسابك. حاول مجددًا.","Could not save your draft invoice. Please retry."));});return()=>{active=false};},[action,accountStatus]);
 useEffect(()=>{
   if(action!=="dashboard")return;
   let active=true;
   void fetch("/api/customer/auth/me",{credentials:"include",cache:"no-store"})
    .then(response=>{if(!active)return;if(response.ok)setAccountStatus("authenticated");else if(response.status===401||response.status===403)setAccountStatus("guest");else setMessage(t("تعذر التحقق من الجلسة مؤقتًا. أعد المحاولة بعد قليل.","Could not verify your session temporarily. Please try again shortly."));})
    .catch(()=>{if(active)setMessage(t("تعذر الاتصال للتحقق من الجلسة. أعد المحاولة بعد قليل.","Could not connect to verify your session. Please try again shortly."));});
   const guest=loadGuestWorkspace();
   setGuestPending(Object.keys(guest).length>0);
   void fetch("/api/customer/auth/workspace",{credentials:"include",cache:"no-store"}).then(async r=>r.ok?r.json():null)
    .then(data=>{if(active)setWorkspace(data?.workspace?.draft??{});})
    .catch(()=>{if(active)setMessage("تعذر تحميل مسودة حسابك.");});
   return()=>{active=false;};
 },[action]);
 const deleteCustomerProject=async(id:string,title:string,submitted:boolean)=>{
  const question=t(`حذف «${title}» نهائيًا من حسابك ولوحة الإدارة؟ لا يمكن التراجع.`,`Permanently delete “${title}” from your account and admin dashboard? This cannot be undone.`);
  if(!window.confirm(question))return;
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}`,{method:"DELETE",credentials:"include"});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||t("فشل الحذف","Deletion failed"));
   setProjectDrafts(previous=>previous.filter(item=>item.id!==id));
   if(submitted)setProjects(previous=>previous.filter(item=>item.id!==projectDrafts.find(d=>d.id===id)?.linked_journey_id));
   if(selectedProjectDraft===id)setSelectedProjectDraft(projectDrafts.find(item=>item.id!==id)?.id||"");
   if(projectDrafts.length===1){setWorkspace(previous=>previous?{...previous,draftInvoice:undefined}:previous);setGuestPending(false);}
   void fetch("/api/customer/auth/projects",{credentials:"include",cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(d)setProjects(d.projects||[])}).catch(()=>{});
   setMessage(t("تم حذف المشروع نهائيًا.","Project permanently deleted."));
   window.dispatchEvent(new Event("atsh-project-deleted"));
  }catch(error){setMessage(error instanceof Error?error.message:t("تعذر الحذف","Could not delete project"));}
 };
 const draftLoadSequence=useRef(0);
 const loadDrafts=useCallback(async()=>{
  const sequence=++draftLoadSequence.current;
  try{
   const response=await fetch("/api/customer/auth/project-drafts",{credentials:"include",cache:"no-store"});
   if(!response.ok)throw Error();
   const body=await response.json();
   if(sequence!==draftLoadSequence.current)return;
   setProjectDrafts(body.drafts||[]);
   setSelectedProjectDraft(previous=>{const requested=previous||new URLSearchParams(window.location.search).get("project");return body.drafts?.some((d:ProjectDraft)=>d.id===requested)?requested||"":(body.drafts?.[0]?.id||"");});

  }catch{setMessage("تعذر تحميل مسودات مشروعاتك");}
 },[]);

 useEffect(()=>{
  if(hubTab!=="services"||!selectedProjectDraft){setActiveServices([]);return;}
  let live=true;setServicesError("");
  void fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/services`,{credentials:"include",cache:"no-store"})
   .then(async response=>{if(!response.ok)throw Error("Unable to load services");return response.json();})
   .then(data=>{if(live)setActiveServices(Array.isArray(data.services)?data.services:[]);})
   .catch(()=>{if(live){setActiveServices([]);setServicesError(t("تعذر تحميل الخدمات. حاول تحديث الصفحة.","Unable to load services. Please refresh."));}});
  return()=>{live=false;};
 },[hubTab,selectedProjectDraft]);
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
   if(response.status===404){void loadDrafts();return;}
   if(!response.ok)throw Error();
   const body=await response.json();if(requestId===previewRequestRef.current)setPreviewVersions(body.previews||[]);
  }catch{if(requestId===previewRequestRef.current){setPreviewVersions([]);setMessage("تعذر تحميل إصدارات المعاينة");}}
 };
 const [projectMessages,setProjectMessages]=useState<Array<{id:number;actor:string;body:string;created_at:string}>>([]);
 const [projectMessageText,setProjectMessageText]=useState("");
 const [chatSending,setChatSending]=useState(false),[chatSendError,setChatSendError]=useState("");const customerChatStream=useRef<HTMLDivElement>(null);
 const loadProjectMessages=useCallback(async(id:string)=>{try{const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/messages`,{credentials:"include",cache:"no-store"});if(response.ok){const data=await response.json();setProjectMessages(data.messages||[]);}else setProjectMessages([]);}catch{setProjectMessages([]);}},[]);
 useEffect(()=>{const selected=projectDrafts.find(d=>d.id===selectedProjectDraft);if(selected?.linked_journey_id)void loadProjectMessages(selected.id);else setProjectMessages([]);},[selectedProjectDraft,projectDrafts,loadProjectMessages]);
 useEffect(()=>{
  const selected=projectDrafts.find(d=>d.id===selectedProjectDraft);
  if(!selected?.linked_journey_id)return;
  const timer=setInterval(()=>{if(document.visibilityState==="visible")void loadProjectMessages(selected.id);},5000);
  return ()=>clearInterval(timer);
 },[selectedProjectDraft,projectDrafts,loadProjectMessages]);
 useEffect(()=>{const el=customerChatStream.current;if(el)el.scrollTop=el.scrollHeight;},[hubTab,selectedProjectDraft,projectMessages.length]);
 const sendProjectMessage=async()=>{if(chatSending||!selectedProjectDraft||projectMessageText.trim().length<2)return;setChatSending(true);setChatSendError("");try{const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraft)}/messages`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:projectMessageText.trim()})});const result=await response.json();if(!response.ok)throw Error(result.error||"Message failed");setProjectMessageText("");await loadProjectMessages(selectedProjectDraft);setMessage(t("تم إرسال الرسالة للإدارة.","Message sent to management."));}catch(e){setChatSendError(e instanceof Error?e.message:"Message failed");}finally{setChatSending(false);}};
 const submitInFlight=useRef(false);
 const [submittingDraft,setSubmittingDraft]=useState(false);
 const submitDraftToAdmin=async()=>{
  if(!selectedProjectDraft||submitInFlight.current)return;
  const target=projectDrafts.find(d=>d.id===selectedProjectDraft);
  if(!target||target.linked_journey_id){setMessage(t("هذا الطلب أُرسل بالفعل للإدارة.","This request has already been submitted."));return;}
  submitInFlight.current=true;setSubmittingDraft(true);
  setMessage(t("جارٍ إرسال المتطلبات للإدارة...","Submitting requirements to management..."));
  try{
   // The configurator saves the invoice to the account workspace first.
   // Attach those selections to the chosen project draft before submitting it.
   // Never overwrite an already configured project with another workspace snapshot.
   const accountSelection=workspace;
   // A configured project can still lack its invoice. Persist the invoice
   // before submission so clearing the temporary workspace cannot erase it.
   const invoiceToSave=target.draft?.draftInvoice?null:(accountSelection?.draftInvoice||loadGuestWorkspace().draftInvoice);
   if(invoiceToSave){
    const patch={draftInvoice:invoiceToSave};
    const saved=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(target.id)}`,{
     method:"PATCH",credentials:"include",headers:{"content-type":"application/json"},
     body:JSON.stringify({expectedRevision:target.revision,patch})
    });
    const savedBody=await saved.json().catch(()=>({}));
    if(!saved.ok)throw Error(saved.status===409?t("تغيرت المسودة. حدّث الصفحة ثم أعد المحاولة.","Draft changed. Refresh and retry."):String(savedBody.error||t("تعذر نقل الفاتورة إلى مشروعك.","Could not save invoice to your project.")));
    setProjectDrafts(previous=>previous.map(item=>item.id===target.id?savedBody.projectDraft:item));
   }
   ++draftLoadSequence.current;
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(target.id)}/submit`,{method:"POST",credentials:"include"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok){const errorCode=String(result.code||"");const message=errorCode==="PROJECT_REQUIREMENTS_INCOMPLETE"?t("أكمل متطلبات المشروع قبل إرساله للإدارة.","Complete project requirements before submission."):String(result.error||t("تعذر إرسال الطلب. حاول مجددًا.","Submission failed. Please try again."));throw Error(message);}
   // Keep the submitted draft selected while the account lists refresh.
   setProjectDrafts(previous=>previous.map(item=>item.id===target.id?{...item,linked_journey_id:result.projectId||item.linked_journey_id}:item));
   setSelectedProjectDraft(target.id);
   setHubTab("projects");
   await Promise.all([loadDrafts(),loadProjects()]);
   setMessage(result.alreadySubmitted?t("هذا الطلب مسجل بالفعل لدى الإدارة.","This request is already registered with management."):t("تم إرسال المتطلبات للإدارة. يمكنك متابعة المشروع من لوحة التحكم.","Requirements sent to management. Track the project in your dashboard."));
  }catch(error){setMessage(error instanceof Error?error.message:"Submission failed");}
  finally{submitInFlight.current=false;setSubmittingDraft(false);}
 };
 const submitInvoiceToAdmin=async()=>{
  if(submitInFlight.current)return;
  if(selectedProjectDraft&&projectDrafts.some(d=>d.id===selectedProjectDraft&&!d.linked_journey_id)){
   await submitDraftToAdmin();return;
  }
  const invoice=workspace?.draftInvoice||loadGuestWorkspace().draftInvoice;
  if(!invoice){setMessage(t("لا توجد فاتورة لإرسالها.","There is no invoice to submit."));return;}
  submitInFlight.current=true;setSubmittingDraft(true);
  let createdId="";
  try{
   const guest=loadGuestWorkspace();
   // Only send fields explicitly supported by the backend's strict draft schema.
   // Account workspace may contain historical/extra properties that trigger HTTP 400.
   const allowedDraftKeys=new Set(["ownershipMode","sectorSlug","sectorName","packageId","businessName","businessDescription","domainName","brandColor","options","sectorAddonCodes","sectorAddonQuantities","projectMode","solutionType","requirements","pages","bilingual","identity","contentMode","hosting","domainChoice","maintenance","startWindow","contactWindow","stylePreference","inspirationLinks","compliance","logoName","customerName","customerEmail","customerPhone","optionQuantities","deliveryMethod","assistantMessages","source"]);
   const selections=Object.fromEntries(Object.entries({...guest,...workspace}).filter(([key,value])=>allowedDraftKeys.has(key)&&value!==undefined));
   // Persist the client-visible estimate with the submitted project for admin review.
   // This remains indicative and must not be treated as an approved commercial quote.
   selections.draftInvoice=invoice;
   if(!selections.packageId&&!selections.sectorSlug&&selections.projectMode!=="custom"){
    throw Error(t("الفاتورة موجودة لكن بيانات الباقة أو المجال غير محفوظة. ارجع للتسعير واحفظ الاختيارات أولًا.","Invoice found, but package/sector selections are missing. Save your choices in the configurator first."));
   }
   const created=await fetch("/api/customer/auth/project-drafts",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({title:String(invoice.title||"مشروع جديد"),draft:selections})});
   const createdBody=await created.json().catch(()=>({}));
   if(!created.ok||!createdBody.projectDraft?.id)throw Error(String(createdBody.error||t("تعذر إنشاء الطلب.","Could not create the request.")));
   createdId=createdBody.projectDraft.id;
   setSelectedProjectDraft(createdId);
   setProjectDrafts(old=>[createdBody.projectDraft,...old]);
   ++draftLoadSequence.current;
   const sent=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(createdId)}/submit`,{method:"POST",credentials:"include"});
   const sentBody=await sent.json().catch(()=>({}));
   if(!sent.ok)throw Error(String(sentBody.error||t("لم يُرسل الطلب. راجع متطلبات المشروع وأعد المحاولة.","Request not sent. Review project requirements and retry.")));
   try{sessionStorage.removeItem("atsh_customer_workspace_v1");}catch{}
   setGuestPending(false);
   setProjectDrafts(previous=>previous.map(item=>item.id===createdId?{...item,linked_journey_id:sentBody.projectId||item.linked_journey_id}:item));
   setSelectedProjectDraft(createdId);
   setHubTab("projects");
   await Promise.all([loadDrafts(),loadProjects()]);
   setMessage(t("تم إرسال الطلب للإدارة بنجاح.","Request submitted to management successfully.")+(sentBody.reference?` #${sentBody.reference}`:""));
  }catch(error){setMessage((error instanceof Error?error.message:"Submission failed")+(createdId?t(" — تم حفظ المشروع كمسودة ولم يتم تأكيد الإرسال."," — Project saved as a draft; submission not confirmed."):""));}
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
 // Guest selections require explicit customer consent before creating an account-owned project.
 // Automatic imports could create duplicate drafts on network retries and mix data on shared devices.
 const importGuestToProjectDraft=async()=>{
  const guest=loadGuestWorkspace();
  const target=projectDrafts.find(d=>d.id===selectedProjectDraft);
  if(!target){setMessage("اختر مشروعًا أولًا");return;}
  if(target.linked_journey_id){setMessage(t("لا يمكن تعديل مشروع أُرسل للإدارة. أنشئ مسودة جديدة لاستيراد الاختيارات.","This project has already been submitted. Create a new draft to import selections."));return;}
  if(!Object.keys(guest).length){setMessage("لا توجد اختيارات سابقة لنقلها");return;}
  if(merging)return;
  setMerging(true);
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(target.id)}`,{method:"PATCH",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:target.revision,patch:guest})});
   const result=await response.json();
   if(response.status===409){await loadDrafts();throw Error(t("تغيّرت المسودة على جهاز آخر أو أُرسلت للإدارة. حدّثنا البيانات؛ اختيارات المتصفح ما زالت محفوظة.","The draft changed on another device or was submitted. Drafts were refreshed; browser selections are still saved."));}
   if(!response.ok)throw Error(result.error||"تعذر حفظ المسودة");
   setProjectDrafts(old=>old.map(x=>x.id===target.id?result.projectDraft:x));
   setWorkspace(result.projectDraft.draft);setGuestPending(false);
   try{sessionStorage.removeItem("atsh_customer_workspace_v1");}catch{}
   setMessage("تم نقل اختيارات المتصفح إلى المشروع المحدد دون التأثير على بقية مشروعاتك");
  }catch(e){setMessage(e instanceof Error?e.message:"فشل النقل؛ تظل الاختيارات على المتصفح");}
  finally{setMerging(false);}
 };
 const loadProjects=useCallback(async()=>{try{const r=await fetch("/api/customer/auth/projects",{credentials:"include",cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();setProjects(d.projects);}catch{setMessage("سجّل الدخول لعرض مشروعاتك");}},[]);
 useEffect(()=>{if(action!=="dashboard"||accountStatus!=="authenticated" )return;const refresh=()=>{if(document.visibilityState==="visible"&&!submitInFlight.current){void loadProjects();void loadDrafts();}};const timer=window.setInterval(refresh,5000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};},[action,accountStatus,loadProjects,loadDrafts]);
 const request=useCallback(async(path:string,data:Record<string,string>={})=>{setMessage("جارٍ التنفيذ...");try{const response=await fetch(`/api/customer/auth/${path}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const body=await response.json().catch(()=>({error:response.status>=500?"خدمة الحسابات غير متاحة حاليًا (HTTP "+response.status+"). راجع اتصال الواجهة بالخادم في Coolify.":"تعذر قراءة استجابة الخدمة (HTTP "+response.status+")."}));setMessage(response.ok&&(path==="register"||path==="verification/resend")
  ?"لو البريد مؤهل، هتوصلك رسالة التأكيد. افتح الرابط المرسل ثم سجّل دخولك."
  :response.ok?body.message||"تم بنجاح":body.error||"تعذر إتمام الطلب");if(response.ok&&(path==="login"||path==="google"))location.href=`${base}/account/dashboard`;if(response.ok&&path==="logout")location.href=`${base}/account/login`;}catch{setMessage("تعذر الوصول إلى خدمة الحسابات. تحقق من اتصال الموقع بالخادم ثم حاول مجددًا.");}},[loadProjects]);
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
 return <main className={action==="dashboard"?"atsh-account-dashboard":"atsh-account-auth"} lang={locale} dir={en?"ltr":"rtl"} style={{maxWidth:action==="dashboard"?1120:540,margin:action==="dashboard"?"1rem auto":"5rem auto",padding:action==="dashboard"?"clamp(12px,3vw,24px)":24,background:action==="dashboard"?"#f6f8fb":undefined}}>{<a className="atsh-account-brand" href={en?"/en":"/"} aria-label={t("العودة إلى الصفحة الرئيسية","Return to homepage")}><img src="/images/atsh-logo.jpg" alt={t("شعار ATSH AI","ATSH AI logo")}/><span><strong>ATSH <b>AI</b></strong><small>{t("حلول رقمية تصنع فرقًا","Digital solutions that make a difference")}</small></span></a>}{action!=="dashboard"&&<h1>{(en?{"register":"Create an account","login":"Sign in","resend-verification":"Resend verification email","forgot":"Reset password","reset-password":"Choose a new password","verify":"Verify email","dashboard":"My projects"}:({register:"إنشاء حساب",login:"تسجيل الدخول", "resend-verification":"إعادة إرسال تأكيد البريد",forgot:"استعادة كلمة المرور","reset-password":"تعيين كلمة مرور جديدة",verify:"تأكيد البريد",dashboard:"مشروعاتي"} as Record<string,string>))[action]||t("حساب العميل","Customer account")}</h1>}
 {! ["verify","dashboard"].includes(action)&&<form onSubmit={e=>{e.preventDefault();const token=search.get("token")||"";
    const route=({register:"register",login:"login","resend-verification":"verification/resend",forgot:"password/forgot","reset-password":"password/reset"} as Record<string,string>)[action]||"login";
    const data:Record<string,string>={};
    if(action!=="reset-password")data.email=email;
    if(action==="register"){data.name=name;data.notificationConsent=String(notificationConsent);}
    if(["register","login","reset-password"].includes(action))data.password=password;
    if(action==="reset-password")data.token=token;
    void request(route,data);}}>
 {action==="register"&&<label>{t("الاسم","Name")}<input required value={name} onChange={e=>setName(e.target.value)}/></label>}
 {action!=="reset-password"&&<label>{t("البريد الإلكتروني","Email address")}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {["register","login","reset-password"].includes(action)&&<label>{t("كلمة المرور","Password")}<input type="password" minLength={action==="login"?1:12} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 {action==="register"&&<label style={{display:"flex",gap:10,alignItems:"flex-start",margin:"14px 0",lineHeight:1.6}}><input type="checkbox" checked={notificationConsent} onChange={e=>setNotificationConsent(e.target.checked)} style={{width:20,height:20,flexShrink:0,marginTop:3}}/><span>{t("أوافق اختياريًا على استقبال إشعارات الرسائل وتحديثات مشاريعي على هذا الجهاز بعد تفعيل الإشعارات. يمكنني إلغاء الاشتراك لاحقًا.","I optionally agree to receive messages and project updates on this device once notifications are enabled. I can opt out later.")}<small style={{display:"block",opacity:.8}}>{t("الموافقة هنا لا تفعّل إشعارات الهاتف تلقائيًا؛ سيُطلب إذن الجهاز بشكل منفصل بعد تسجيل الدخول.","This preference does not enable device push automatically; device permission will be requested separately after sign-in.")}</small></span></label>}
 <button type="submit">{t("متابعة","Continue")}</button></form>}
 {(action==="login"||action==="register")&&<><p><a href={`${base}/account/login`}>{t("لدي حساب · تسجيل الدخول","Already have an account? Sign in")}</a> · <a href={`${base}/account/register`}>{t("إنشاء حساب جديد","Create a new account")}</a> · <a href={`${base}/account/forgot`}>{t("نسيت كلمة المرور؟","Forgot password?")}</a> · <a href={`${base}/account/resend-verification`}>{t("إعادة إرسال التأكيد","Resend confirmation")}</a></p><div ref={googleContainer} aria-label={t("تسجيل الدخول باستخدام Google","Sign in with Google")}/></>}
 {action==="dashboard"&&accountStatus!=="authenticated"&&<section style={{background:"white",border:"1px solid #dce5ee",borderRadius:16,padding:20}}>
   <h2>{accountStatus==="checking"?t("جارٍ التحقق من حسابك…","Checking account…"):t("سجل دخولك لعرض مشروعاتك","Sign in to view projects")}</h2>
   <p>{t("لحماية المشروعات والعروض والفواتير، لا تظهر لوحة العميل إلا بعد التحقق من الجلسة. اختياراتك غير المحفوظة تبقى على هذا المتصفح حتى تقرر نقلها.","Your projects, quotations and invoices are private. Sign in to securely access them. Unsaved selections remain on this device until you choose to import them.")}</p>
   <div style={{display:"flex",flexWrap:"wrap",gap:11}}><a href={`${base}/account/login`} style={{padding:"11px 15px",background:"#203958",color:"white",borderRadius:10}}>{t("تسجيل الدخول","Sign in")}</a><a href={`${base}/account/register`} style={{padding:"11px 15px",border:"1px solid #cbd5e1",borderRadius:10}}>{t("إنشاء حساب","Create account")}</a></div>
  </section>}
 {action==="dashboard"&&accountStatus==="authenticated"&&<>
 <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><NotificationInbox customer /></div>
 <CustomerJourneyHub locale={locale} active={hubTab} onTab={setHubTab} draftCount={projectDrafts.length} projectCount={projects.length} orderCount={orders.length} quoteCount={quotes.length} contractCount={contracts.length} invoiceCount={invoices.length} deliveryCount={deliverables.length}
  currentProject={selectedProjectDraft?(()=>{const project=projectDrafts.find(d=>d.id===selectedProjectDraft);return project?{title:project.title,sectorName:project.draft?.sectorName,id:project.id,revision:project.revision}:undefined})():undefined}
  currentPreviewStatus={selectedProjectDraft&&previewVersions.length?previewVersions[0].approval_status:undefined}
  currentJourneyStatus={projects.find(project=>project.id===projectDrafts.find(draft=>draft.id===selectedProjectDraft)?.linked_journey_id)?.status}/>
 {message&&<p role="status" aria-live="polite" style={{padding:12,borderRadius:10,background:"#eaf2ff",color:"#1f4166"}}>{message}</p>}
 <style>{`.atsh-account-brand{display:inline-flex;align-items:center;gap:10px;min-width:0;max-width:100%;text-decoration:none;color:#203958;margin-bottom:16px}.atsh-account-brand img{width:42px;height:42px;object-fit:cover;object-position:center;border-radius:50%;border:1px solid #c3c5c5}.atsh-account-brand span{display:flex;flex-direction:column;gap:1px}.atsh-account-brand strong{font:700 17px Inter,"IBM Plex Sans Arabic",sans-serif;letter-spacing:.035em}.atsh-account-brand strong b{color:#27659b}.atsh-account-brand small{font-size:14px;font-weight:600;color:#536983}@media(max-width:620px){.atsh-account-brand img{width:35px;height:35px}.atsh-account-brand strong{font-size:14px}.atsh-account-brand small{font-size:14px}}.atsh-customer-assistant{position:fixed;inset:auto 18px 88px auto;width:min(440px,calc(100vw - 24px));height:min(680px,calc(100dvh - 115px));z-index:1000;background:white;border:1px solid #d5e2f1;border-radius:18px;box-shadow:0 18px 65px #102c4b38;overflow:hidden;display:flex;flex-direction:column}.atsh-customer-assistant-body{flex:1;overflow:auto;min-height:0}.atsh-customer-assistant-launch{position:fixed;bottom:18px;right:18px;z-index:1001;border:0;border-radius:99px;padding:13px 18px;background:#203958;color:white;font:inherit;font-weight:800;box-shadow:0 7px 24px #102c4b40;cursor:pointer}@media(max-width:600px){.atsh-customer-assistant{right:8px;left:8px;bottom:76px;width:auto;height:min(620px,calc(100dvh - 95px))}.atsh-customer-assistant-launch{bottom:12px;right:12px}}`}</style>
  {hubTab==="messages"&&<section className="customer-chat" dir={locale==="en"?"ltr":"rtl"}><header className="customer-chat-head"><button type="button" aria-label={t("رجوع","Back")} onClick={()=>setHubTab("overview")}>‹</button><div><strong>{t("مراسلات الإدارة","Management chat")}</strong><small>ATSH AI</small></div><button type="button" onClick={()=>setHubTab("projects")}>{t("مشروعي","My project")}</button></header><div className="customer-chat-picker"><select aria-label={t("اختر المشروع","Select project")} value={selectedProjectDraft||""} onChange={e=>{setProjectMessages([]);setProjectMessageText("");setSelectedProjectDraft(e.target.value);}}><option value="">{t("اختر مشروعًا","Select a project")}</option>{projectDrafts.filter(d=>d.linked_journey_id).map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></div>{!projectDrafts.find(d=>d.id===selectedProjectDraft)?.linked_journey_id?<p style={{padding:16}}>{t("اختر مشروعًا مرسلًا للإدارة لبدء المحادثة.","Select a submitted project to start chatting.")}</p>:<><div className="customer-chat-stream" ref={customerChatStream} aria-live="polite">{projectMessages.map(m=><div key={m.id} className={m.actor==="customer"?"customer-bubble outgoing":"customer-bubble incoming"}><span>{m.actor==="customer"?t("أنت","You"):t("الإدارة","Management")}</span><CustomerMessageBody body={m.body} locale={locale}/><small>{new Date(m.created_at).toLocaleTimeString(locale==="en"?"en-US":"ar-EG",{hour:"2-digit",minute:"2-digit"})}</small></div>)}</div>{chatSendError&&<p role="alert" style={{padding:"4px 12px",color:"#b91c1c",margin:0}}>{chatSendError}</p>}<form className="customer-chat-compose" onSubmit={e=>{e.preventDefault();void sendProjectMessage();}}><textarea aria-label={t("رسالتك للإدارة","Message to management")} placeholder={t("اكتب رسالة...","Write a message...")} rows={1} maxLength={2000} value={projectMessageText} onChange={e=>setProjectMessageText(e.target.value)}/><button type="submit" aria-label={t("إرسال الرسالة","Send message")} disabled={chatSending||projectMessageText.trim().length<2}>➤</button></form></>}<style>{`
.customer-chat{display:flex;flex-direction:column;height:min(680px,75vh);background:#edf2f7;border:1px solid #d4e2ef;border-radius:16px;overflow:hidden}
.customer-chat-head{display:flex;align-items:center;gap:10px;padding:12px;background:#203958;color:white;flex:none}.customer-chat-head div{flex:1;display:grid;gap:2px}.customer-chat-head small{color:white;font-size:14px}.customer-chat-head button{background:#ffffff20;color:white;border:0;border-radius:8px;padding:8px 12px;font-size:14px}
.customer-chat-picker{padding:6px 12px;background:white;flex:none}.customer-chat-picker select{width:100%;padding:7px;border:1px solid #d4e2ef;border-radius:8px}
.customer-chat-stream{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:7px;padding:12px}.customer-chat .customer-bubble{width:fit-content;max-width:82%;padding:6px 10px;border-radius:12px;background:white;font-size:14px;line-height:1.45;overflow-wrap:anywhere}.customer-bubble.incoming{align-self:flex-start}.customer-chat .customer-bubble.outgoing{align-self:flex-end;background:#d9eaff}.customer-bubble span,.customer-bubble small{font-size:14px;font-weight:600;color:#52657c}.customer-bubble small{display:block;text-align:end}.customer-bubble p{margin:2px 0;font-size:14px;line-height:1.45}
.customer-chat-compose{display:flex;align-items:center;gap:8px;background:white;padding:9px;padding-bottom:max(9px,env(safe-area-inset-bottom));flex:none;margin:0}.customer-chat .customer-chat-compose textarea{flex:1;min-width:0;width:auto;resize:none;border:1px solid #cbd5e1;border-radius:24px;padding:10px 14px;min-height:42px;font-size:16px;margin:0}.customer-chat .customer-chat-compose button{border:0;border-radius:50%;width:44px;height:44px;flex:none;background:#203958;color:white;font-size:20px;padding:0}.customer-chat-compose button:disabled{opacity:.45}
@media(max-width:767px){.customer-chat{position:fixed;inset:0;z-index:2147483000;width:100%;height:100dvh;border:0;border-radius:0;box-sizing:border-box;padding-top:env(safe-area-inset-top)}}
`}</style></section>}
 {hubTab==="preview"&&<section style={{padding:18,background:"#fff",border:"1px solid #dce4ef",borderRadius:14,marginBottom:16}}><h2>{t("معاينة مشروعك","Your project preview")}</h2>{selectedProjectDraft?<><p>{t("افتح المعاينة التفاعلية المتاحة لمشروعك، وتابع إصدارات المراجعة.","Open the interactive preview for your project and review its versions.")}</p><a href={`${base}/account/project-preview/${encodeURIComponent(selectedProjectDraft)}`} style={{display:"inline-block",padding:"12px 16px",background:"#203958",color:"white",borderRadius:10}}>{t("فتح معاينة المشروع","Open project preview")}</a><p>{t("إصدارات المعاينة المحفوظة","Saved preview versions")}: {previewVersions.length}</p><div style={{display:"grid",gap:8,marginTop:12}}>{projectMessages.filter(m=>m.actor==="admin"&&m.body.startsWith("ATSH_PREVIEW_URL: ")).map(m=>{const url=m.body.slice("ATSH_PREVIEW_URL: ".length).trim();try{const parsed=new URL(url);if(parsed.protocol!=="https:")return null;return <a key={m.id} href={url} target="_blank" rel="noopener noreferrer" style={{padding:12,border:"1px solid #bdd5ee",borderRadius:10,color:"#174e83"}}>{t("المعاينة التفاعلية المرسلة من الإدارة","Interactive preview sent by management")} · {new Date(m.created_at).toLocaleDateString(locale==="en"?"en-US":"ar-EG")}</a>;}catch{return null;}})}</div></>:<p>{t("اختر مشروعًا أولًا من تبويب الباقة والمشروع.","Choose a project from the package and project tab first.")}</p>}</section>}
 {hubTab==="services"&&<section style={{padding:18,background:"#fff",border:"1px solid #dce4ef",borderRadius:14,marginBottom:16}}><h2>{t("لوحة خدماتي المستمرة","Ongoing services dashboard")}</h2>{(()=>{const draft=projectDrafts.find(d=>d.id===selectedProjectDraft);const project=projects.find(p=>p.id===draft?.linked_journey_id);if(!project||!["delivered","support"].includes(project.status))return <p>{t("تُتاح لوحة الخدمات بعد تسليم المشروع وتفعيل المتابعة من الإدارة.","The services dashboard becomes available after project delivery and management activation.")}</p>;return <><p>{t("مشروعك","Your project")}: <strong>{draft?.title}</strong> — {humanStatus(project.status,locale)}</p>{servicesError?<p role="alert">{servicesError}</p>:activeServices.length?<div style={{display:"grid",gap:12}}>{activeServices.map(service=><article key={service.id} style={{padding:14,border:"1px solid #cbd5e1",borderRadius:12}}><strong>{service.service_name}</strong><p>{service.description}</p><small>{service.status==="active"?t("نشطة","Active"):service.status==="paused"?t("موقوفة مؤقتًا","Paused"):t("منتهية","Expired")}{service.expires_at?" · "+new Date(service.expires_at).toLocaleDateString(locale==="en"?"en-US":"ar-EG"):""}</small></article>)}</div>:<p role="status" style={{padding:14,border:"1px dashed #cbd5e1",borderRadius:12,color:"#475569"}}>{t("لا توجد خدمات مفعّلة موثّقة لهذا المشروع حتى الآن.","No verified activated services for this project yet.")}</p>}<button type="button" onClick={()=>{setProjectMessageText(t(`طلب مراجعة الخدمات المستمرة للمشروع: ${draft?.title||"مشروعي"}\nبرجاء توضيح الخدمات المفعّلة حاليًا، وأي إضافات أو عروض يمكن تفعيلها من الإدارة.`,`Ongoing services review for project: ${draft?.title||"My project"}\nPlease confirm currently activated services and any available add-ons or offers.`));setHubTab("messages");}}>{t("طلب مراجعة وتفعيل الخدمات","Request service review and activation")}</button></>;})()}</section>}
 {hubTab==="settings"&&<section style={{border:"1px solid #d4e2ef",borderRadius:12,padding:16,background:"#f5faff",marginBottom:18}}>
   <h2>{t("اختياراتي المحفوظة من جميع مسارات المنصة","My saved project preferences")}</h2>
   {guestPending&&<div style={{padding:12,background:"#fff4db",borderRadius:10,marginBottom:12}}>
     <p>{t("هذا المتصفح يحتفظ باختيارات قبل تسجيل الدخول. لضمان عدم خلط بيانات زوار مختلفين، اختر نقلها إلى حسابك الحالي صراحةً.","This browser contains preferences saved before sign-in. Import them into your account only if you agree.")}</p>
     <button disabled={merging} type="button" onClick={async()=>{setMerging(true);try{const result=await syncCustomerWorkspace();setWorkspace(result);setGuestPending(false);setMessage("تم ضم اختيارات المتصفح إلى حسابك بنجاح.");}catch{setMessage("فشل نقل الاختيارات. البيانات ما زالت محفوظة في المتصفح.");}finally{setMerging(false);}}}>{merging?"جارٍ الدمج…":"نقل اختيارات هذا المتصفح إلى حسابي"}</button>
   </div>}
   {workspace?<><p>القطاع: {workspace.sectorName||workspace.sectorSlug||"لم يُحدد"} · النشاط: {workspace.businessName||"لم يُحدد"}</p>
    <p>الباقة: {workspace.packageId||"لم تُحدد"} · طريقة التسليم: {workspace.deliveryMethod||"لم تُحدد"}</p>
    {workspace.sectorSlug&&<a href={`${base}/catalog/${encodeURIComponent(workspace.sectorSlug)}`}>{t("فتح النموذج المختار","Open selected demo")}</a>}
    <p style={{fontSize:14,fontWeight:600,color:"#64748b"}}>{t("هذا ملخص تفضيلات وليس عرض سعر أو عقدًا أو إثبات شراء.","These are preferences only, not a quote, contract or proof of purchase.")}</p>
   </>:<p>{t("لم تتوفر مسودة محفوظة بعد.","No saved draft available yet.")}</p>}
 </section>}
 {hubTab==="overview"&&guestPending&&<section style={{padding:18,background:"#fff4db",border:"1px solid #e7c97d",borderRadius:14,marginBottom:16}}><h2>{t("متطلبات الباقة محفوظة","Your package requirements are saved")}</h2><p>{t("جارٍ نقل الاختيارات إلى مشروعك داخل الحساب. إذا لم يتم النقل، يمكنك إكماله يدويًا.","Your selections are being added to your account project. If needed, you can import them manually.")}</p><button type="button" onClick={()=>setHubTab("projects")}>{t("عرض متطلبات المشروع","View project requirements")}</button></section>}
 {hubTab==="overview"&&projectDrafts.length>0&&<section style={{padding:18,background:"#fff",border:"1px solid #dce4ef",borderRadius:14,marginBottom:16}}><h2>{t("مشروعاتي ومتطلباتي","My projects and requirements")}</h2><p>{t("متطلباتك محفوظة في مشروع مستقل. راجع التفاصيل والمعاينات ثم تابع عروض الإدارة والموافقات والفواتير.","Your requirements are saved as a separate project. Review previews, management quotes, approvals, and invoices.")}</p><button type="button" onClick={()=>setHubTab("projects")}>{t("فتح متطلبات المشروع","Open project requirements")}</button> <button type="button" onClick={()=>setHubTab("quotes")}>{t("طلبات الإدارة وعروض الأسعار","Orders and quotations")}</button> <button type="button" onClick={()=>setHubTab("invoices")}>{t("الفاتورة والدفع","Invoices and payments")}</button></section>}
 {hubTab==="projects"&&<section style={{border:"1px solid #dce4ef",borderRadius:16,padding:"16px",marginBottom:18,background:"#fff"}}>
  {projectDrafts.find(d=>d.id===selectedProjectDraft)?.linked_journey_id&&<CustomerProjectAcceptance key={projectDrafts.find(d=>d.id===selectedProjectDraft)?.linked_journey_id} projectId={projectDrafts.find(d=>d.id===selectedProjectDraft)!.linked_journey_id!} locale={locale}/>}
  {projectDrafts.length>0&&<details style={{marginBottom:14,border:"1px solid #dce4ef",borderRadius:12,padding:12,background:"#fff"}}><summary style={{cursor:"pointer",fontWeight:700}}>{t("إدارة مشروعاتي","Manage my projects")} ({projectDrafts.length})</summary><div style={{display:"grid",gap:8,marginTop:12}}>{projectDrafts.map(item=><div key={item.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:10,border:"1px solid #e2e8f0",borderRadius:10}}><button type="button" onClick={()=>setSelectedProjectDraft(item.id)} style={{flex:1,textAlign:"start",border:0,background:"transparent",font:"inherit",cursor:"pointer"}}>{item.title}</button><button type="button" aria-label={t("حذف مشروع","Delete project")+" "+item.title} onClick={()=>void deleteCustomerProject(item.id,item.title,!!item.linked_journey_id)} style={{color:"#b42318",border:"1px solid #f0b5b0",background:"#fff5f4",padding:"8px 11px",borderRadius:9,cursor:"pointer"}}>{t("حذف","Delete")}</button></div>)}</div></details>}
  {projectDrafts.length>1&&<select aria-label={t("المشروع","Project")} value={selectedProjectDraft} onChange={e=>setSelectedProjectDraft(e.target.value)} style={{width:"100%",padding:12,marginBottom:14,borderRadius:10}}>{projectDrafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>}
  {(()=>{const draft=projectDrafts.find(d=>d.id===selectedProjectDraft);const inv=draft?.draft.draftInvoice||(!draft||!draft.linked_journey_id?(workspace?.draftInvoice||(guestPending?loadGuestWorkspace().draftInvoice:null)):null);const selection=draft?.draft??(guestPending?loadGuestWorkspace():workspace)??loadGuestWorkspace();const slug=selection.source==="configurator"?undefined:selection.sectorSlug;const packageId=selection.packageId;const editQuery=draft?"?editProject="+encodeURIComponent(draft.id):"?editWorkspace=1";const project=projects.find(p=>p.id===draft?.linked_journey_id);return <>
   <h2 style={{margin:"0 0 14px"}}>{t("فاتورة طلبي","My order invoice")}</h2>
   {inv?<div style={{border:"1px solid #dce4ef",borderRadius:14,padding:16,background:"#fafcff"}}>
    <strong style={{fontSize:19}}>{inv.title}</strong>
    {inv.items.map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}><span>{item.name}</span><strong style={{whiteSpace:"nowrap"}}>{item.amount.toLocaleString(en?"en-EG":"ar-EG")} {t("ج.م","EGP")}</strong></div>)}
    <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0"}}><span>{t("المجموع","Subtotal")}</span><strong>{inv.subtotal.toLocaleString(en?"en-EG":"ar-EG")}</strong></div>
    <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}><span>{t("ضريبة القيمة المضافة 14%","VAT 14%")}</span><strong>{inv.vat.toLocaleString(en?"en-EG":"ar-EG")}</strong></div>
    <div style={{display:"flex",justifyContent:"space-between",padding:"15px 0",borderTop:"2px solid #203958",fontSize:19,fontWeight:800}}><span>{t("الإجمالي التقديري","Estimated total")}</span><span>{inv.total.toLocaleString(en?"en-EG":"ar-EG")} {t("ج.م","EGP")}</span></div>
    <div style={{display:"grid",gap:5,fontSize:14,fontWeight:600,color:"#536983"}}><span>{t("لمرة واحدة","One-time")}: {inv.fixed.toLocaleString()} {t("ج.م","EGP")}</span><span>{t("شهريًا","Monthly")}: {inv.monthly.toLocaleString()} {t("ج.م","EGP")}</span><span>{t("سنويًا","Yearly")}: {inv.yearly.toLocaleString()} {t("ج.م","EGP")}</span></div>
    <small style={{display:"block",marginTop:12,color:"#64748b"}}>{t("تقدير مبدئي وليس فاتورة ضريبية نهائية","Estimate, not a final tax invoice")}</small>
   </div>:<p style={{padding:14,background:"#f1f5fb",borderRadius:10}}>{t("لم تختر باقة بعد.","No package selected yet.")}</p>}
   {!draft?.linked_journey_id&&<a href={slug?`${base}/catalog/${encodeURIComponent(slug)}/pricing${editQuery}`:packageId?`${base}/packages/${encodeURIComponent(packageId)}/pricing${editQuery}`:`${base}/catalog`} style={{display:"block",marginTop:14,padding:14,textAlign:"center",borderRadius:11,border:"1px solid #203958",color:"#203958",fontWeight:800,textDecoration:"none"}}>{t("تعديل الباقة وإضافة مكونات","Edit package and add components")}</a>}
   {guestPending&&(draft&&!draft.linked_journey_id?<button type="button" disabled={merging} onClick={()=>void importGuestToProjectDraft()} style={{width:"100%",marginTop:10,padding:13}}>{merging?t("جارٍ حفظ التعديلات…","Saving changes…"):t("حفظ الإضافات في نفس الطلب","Save additions to this request")}</button>:<button type="button" onClick={()=>void createProjectDraft(true)} style={{width:"100%",marginTop:10,padding:13}}>{t("حفظ الاختيارات في مشروع جديد","Save selections to a new project")}</button>)}
   {!draft&&!guestPending&&<button type="button" onClick={()=>void createProjectDraft()} style={{width:"100%",marginTop:10,padding:13}}>{t("إنشاء طلب جديد","Create new request")}</button>}
   {!draft&&inv&&<button type="button" disabled={submittingDraft} onClick={()=>void submitInvoiceToAdmin()} style={{width:"100%",marginTop:10,padding:14,background:"#203958",color:"#fff",border:0,borderRadius:11,fontWeight:800}}>{submittingDraft?t("جارٍ الإرسال…","Submitting…"):t("تأكيد وإرسال الطلب للإدارة","Confirm and submit request")}</button>}
   {draft&&!draft.linked_journey_id&&<button type="button" disabled={submittingDraft||guestPending} onClick={()=>void submitDraftToAdmin()} style={{width:"100%",marginTop:10,padding:14,background:"#203958",color:"#fff",border:0,borderRadius:11,fontWeight:800}}>{submittingDraft?t("جارٍ الإرسال…","Submitting…"):t("تأكيد وإرسال الطلب للإدارة","Confirm and submit request")}</button>}
   <div style={{marginTop:24,padding:16,border:"1px solid #dce4ef",borderRadius:14,background:"#f6f9fd"}} aria-live="polite">
    <h3 style={{margin:"0 0 10px"}}>{t("حالة طلبي الآن","Current request status")}</h3>
    <strong>{project?t(labels[project.status]||project.status,englishStatuses[project.status]||project.status):draft?.linked_journey_id?t("بانتظار تحديث الإدارة","Awaiting management update"):t("لم يُرسل الطلب للإدارة بعد","Request not yet submitted")}</strong>
    {project&&<p style={{margin:"9px 0 0",color:"#536983"}}>{t("الحالة من سجلات الإدارة، وتُحدّث تلقائيًا أثناء فتح الصفحة.","Status comes from management records and refreshes while the page is open.")}</p>}
   </div>
  </>;})()}
 </section>}
 {hubTab==="quotes"&&<section aria-label={t("الطلبات وعروض الأسعار","Orders & quotes")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("مشروعاتي","My projects")}</h2><ul>{projects.map(p=><li key={p.id}>{p.customer_name} — {humanStatus(p.status,locale)}</li>)}</ul><h2>{t("طلباتي المرتبطة بمشروعاتي","Orders for my projects")}</h2><ul>{orders.map(o=><li key={o.id}>{o.reference} — {humanStatus(o.status,locale)} — {Number(o.total).toLocaleString("ar-EG")} {o.currency}</li>)}</ul>
 <h2>{t("عروض الأسعار","Quotations")}</h2><p>{t("راجع كل بند، واقرأ العقد وسجل موافقتك من صفحة محمية مرتبطة بحسابك. يمكنك طلب تعديل قبل الاعتماد.","Review every item and the contract on the secure account page. You can request revisions before approval.")}</p>
 {quotes.length===0&&<p>{t("لا توجد عروض صادرة لحسابك بعد. سيتم إعداد العرض بعد اعتماد نموذج المشروع ومراجعة الطلب.","No quotes issued to your account yet. A quote will be prepared after your project review.")}</p>}
 <ul>{quotes.map(q=><li key={q.id} style={{padding:"12px 0",borderBottom:"1px solid #dfe6ef"}}><strong>عرض #{q.id}</strong> — {humanStatus(q.status,locale)} — {(q.total_piasters/100).toFixed(2)} {q.currency} <a href={`${base}/account/checkout/${q.id}`} style={{display:"inline-block",marginInlineStart:12,color:"#174e83",fontWeight:800}}>{t("مراجعة العرض والعقد والفاتورة ←","Review quote, contract & invoice →")}</a></li>)}</ul></section>}
 {hubTab==="contracts"&&<section aria-label="العقود" style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("عقودي","My contracts")}</h2><ul>{contracts.map(c=><li key={c.id}>عقد #{c.id} — {humanStatus(c.status,locale)} — <a href={`${base}/account/checkout/${c.quote_id}`} style={{color:"#174e83",fontWeight:700}}>{t("التفاصيل وسجل الاعتماد","Details & approval log")}</a> <button type="button" onClick={()=>{const w=window.open("","_blank","noopener,noreferrer");if(!w)return;const text=document.createElement("pre");text.textContent=c.body_snapshot;w.document.body.appendChild(text);w.print();}}>{t("طباعة","Print")}</button></li>)}</ul></section>}
 {hubTab==="invoices"&&workspace?.draftInvoice&&<section aria-label={t("فاتورة الطلب المحفوظة مؤقتًا","Saved provisional invoice")} style={{padding:18,background:"#fff",border:"1px solid #dce4ef",borderRadius:16,marginBottom:16}}>
 <small>{t("مسودة تقديرية محفوظة في حسابك — ليست فاتورة ضريبية معتمدة","Estimated draft saved in your account — not an issued tax invoice")}</small><h2>{t("طلبك الحالي","Your current order")}: {workspace.draftInvoice.title}</h2>
 {workspace.draftInvoice.items.map((item,index)=><div key={index} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid #e8edf1"}}><span>{item.name}<small style={{display:"block",color:"#778697"}}>{item.period==="yearly"?t("سنويًا","Yearly"):item.period==="monthly"?t("شهريًا","Monthly"):t("مرة واحدة","One time")}</small></span><strong>{item.amount.toLocaleString("ar-EG")} {t("ج.م","EGP")}</strong></div>)}
 <div style={{display:"grid",gap:12,marginTop:18}}><div>{t("المجموع قبل الضريبة","Subtotal")}: {workspace.draftInvoice.subtotal.toLocaleString("ar-EG")} {t("ج.م","EGP")}</div><div>{t("ضريبة القيمة المضافة التقديرية (14%)","Estimated VAT (14%)")}: {workspace.draftInvoice.vat.toLocaleString("ar-EG")} {t("ج.م","EGP")}</div><strong style={{fontSize:24}}>{t("الإجمالي التقديري","Estimated total")}: {workspace.draftInvoice.total.toLocaleString("ar-EG")} {t("ج.م","EGP")}</strong><div>{t("رسوم لمرة واحدة","One-time")}: {workspace.draftInvoice.fixed.toLocaleString("ar-EG")} · {t("شهريًا","Monthly")}: {workspace.draftInvoice.monthly.toLocaleString("ar-EG")} · {t("سنويًا","Yearly")}: {workspace.draftInvoice.yearly.toLocaleString("ar-EG")}</div></div>
 </section>}
 {hubTab==="invoices"&&<section aria-label={t("الفواتير والمدفوعات","Invoices & payments")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("الفواتير وسجل المدفوعات","Invoices & payment history")}</h2><p style={{background:"#fff5d8",borderRadius:10,padding:12}}>{t("ربط بوابة الدفع الإلكتروني مؤجل. لا تعتبر أي فاتورة مدفوعة دون تحقق موثوق من السداد، ولا تُدخل بيانات بطاقتك في الموقع الآن.","Online payment is not connected yet. Invoices are marked paid only after verified settlement. Do not enter card details here.")}</p><ul>{invoices.map(i=><li key={i.id}>فاتورة #{i.id} — {humanStatus(i.status,locale)} <a href={`${base}/account/checkout/${i.quote_id}`} style={{color:"#174e83",fontWeight:700}}>{t("عرض فاتورة المشروع","View invoice")}</a> — الإجمالي {(Number(i.amount_piasters)/100).toFixed(2)} جنيه — المدفوع {(Number(i.verified_paid_piasters)/100).toFixed(2)} جنيه — المتبقي {((Number(i.amount_piasters)-Number(i.verified_paid_piasters))/100).toFixed(2)} جنيه <button type="button" onClick={async()=>{if(openInvoice===i.id){setOpenInvoice(null);return}try{const r=await fetch(`/api/customer/commercial/invoices/${i.id}/payments`,{credentials:'include',cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();setInvoicePayments(x=>({...x,[i.id]:data.payments||[]}));setOpenInvoice(i.id)}catch{setMessage('تعذر تحميل سجل الدفعات')}}}>{t("عرض الدفعات","View payments")}</button>{openInvoice===i.id&&<ul>{(invoicePayments[i.id]||[]).length?(invoicePayments[i.id]||[]).map(p=><li key={p.id}>{(Number(p.amount_piasters)/100).toFixed(2)} جنيه — {new Date(p.paid_at).toLocaleDateString('ar-EG')} — {p.provider}</li>):<li>{t("لا توجد دفعات مؤكدة","No confirmed payments")}</li>}</ul>}</li>)}</ul></section>}
 {hubTab==="deliveries"&&<section aria-label={t("تسليمات ومراجعات العميل","Customer deliverables & reviews")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("تسليماتي: الفيديوهات والهوية البصرية","My deliverables: media and branding")}</h2><ul>{deliverables.map(d=><li key={d.id}><strong>{d.title}</strong> ({d.kind}) — {humanStatus(d.customer_decision,locale)} {d.has_private_file?<a href={`/api/customer/deliverables/${d.id}/file`} download>{t("تحميل الملف الخاص","Download private file")}</a>:d.asset_url?<a href={d.asset_url} target="_blank" rel="noopener noreferrer">{t("مشاهدة / تحميل","View / download")}</a>:<span>{t("لم يُرفق ملف بعد","No file attached")}</span>}{d.customer_decision==="pending"&&<><input aria-label={t("ملاحظات التعديل","Revision comments")} placeholder={t("ملاحظات التعديل","Revision comments")} value={feedback[d.id]||""} onChange={e=>setFeedback(x=>({...x,[d.id]:e.target.value}))}/>{(["approved","revision_requested"] as const).map(decision=><button key={decision} type="button" onClick={async()=>{const r=await fetch(`/api/customer/deliverables/${d.id}/decision`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,feedback:feedback[d.id]||""})});if(r.ok)setDeliverables(x=>x.map(item=>item.id===d.id?{...item,customer_decision:decision}:item));else setMessage("تعذر تسجيل القرار");}}>{decision==="approved"?"اعتماد":"طلب تعديل"}</button>)}</>}</li>)}</ul></section>}
 {hubTab==="settings"&&<section aria-label={t("إعدادات الحساب","Account settings")} style={{padding:18,background:"white",border:"1px solid #dce4ef",borderRadius:14}}><h2>{t("إعدادات الحساب","Account settings")}</h2><button onClick={()=>void request("logout")}>{t("تسجيل الخروج","Sign out")}</button></section>}</>}
 {action==="dashboard"&&accountStatus==="authenticated"&&<footer style={{display:"flex",justifyContent:"center",padding:"28px 0 14px"}}><button type="button" onClick={()=>void request("logout")} style={{padding:"11px 22px",border:"1px solid #cbd5e1",borderRadius:12,background:"#fff",color:"#203958",fontWeight:700,cursor:"pointer"}}>{t("إنهاء الجلسة","End session")}</button></footer>}<p role="status" aria-live="polite">{action!=="dashboard"?message:""}</p></main>;
}
