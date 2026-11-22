"use client";
import {useEffect,useRef,useState} from "react";
type CustomerProject={id:string;title:string;customer_name:string;customer_email:string;linked_journey_id:string|null};
type Service={id:string;service_name:string;service_code:string;status:string;source_type:string;description:string};
const endpoint="/api/admin/customer-services";
async function request(url:string,init?:RequestInit){const r=await fetch(url,{...init,credentials:"include",cache:"no-store",headers:{"Content-Type":"application/json",...init?.headers}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"تعذر تنفيذ العملية");return data;}
export default function CustomerServicesAdmin({canEdit}:{canEdit:boolean}){
 const [projectDraftId,setProjectDraftId]=useState("");
 const selectedProject=useRef("");
 const requestSequence=useRef(0);
 const [projects,setProjects]=useState<CustomerProject[]>([]);
 const [projectError,setProjectError]=useState("");
 useEffect(()=>{let active=true;void request("/api/admin/customer-service-projects").then(data=>{if(active)setProjects(data.projects||[]);}).catch(()=>{if(active)setProjectError("تعذر تحميل مشروعات العملاء.");});return()=>{active=false;};},[]);
 const [services,setServices]=useState<Service[]>([]);
 const [name,setName]=useState("");const [code,setCode]=useState("");const [description,setDescription]=useState("");
 const [sourceType,setSourceType]=useState<"manual"|"package"|"addon"|"offer">("manual");
 const [status,setStatus]=useState("pending");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [loaded,setLoaded]=useState(false);
 const refresh=async()=>{const id=selectedProject.current.trim();if(!id)return;const sequence=++requestSequence.current;setBusy(true);setError("");try{const d=await request(endpoint+"?projectDraftId="+encodeURIComponent(id));if(sequence===requestSequence.current){setServices(d.services||[]);setLoaded(true);}}catch(e){if(sequence===requestSequence.current){setError(String(e instanceof Error?e.message:e));setLoaded(false);}}finally{if(sequence===requestSequence.current)setBusy(false);}};
 const create=async()=>{setBusy(true);setError("");try{await request(endpoint,{method:"POST",body:JSON.stringify({projectDraftId:projectDraftId.trim(),serviceCode:code.trim(),serviceName:name.trim(),description,sourceType,status})});setName("");setCode("");await refresh();}catch(e){setError(String(e instanceof Error?e.message:e));}finally{setBusy(false);}};
 const change=async(id:string,next:string)=>{setBusy(true);setError("");try{await request(endpoint+"/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({status:next})});await refresh();}catch(e){setError(String(e instanceof Error?e.message:e));}finally{setBusy(false);}};
 return <section className="admin-content-card" aria-label="خدمات العملاء"><h2>خدمات العملاء المستمرة</h2><p>إدارة تفعيل الخدمات المرتبطة بمسودة مشروع العميل. اختيار إضافة أو باقة لا يفعّل الاشتراك تلقائيًا.</p>
 <label>اختر مشروع العميل <select value={projectDraftId} onChange={e=>{selectedProject.current=e.target.value;++requestSequence.current;setProjectDraftId(e.target.value);setBusy(false);setError("");setLoaded(false);setServices([]);}}><option value="">اختر المشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title} — {p.customer_name} ({p.customer_email})</option>)}</select></label>{projectError&&<p role="alert">{projectError}</p>} <button type="button" disabled={busy||!projectDraftId.trim()} onClick={()=>void refresh()}>عرض الخدمات</button>
 {error&&<p role="alert">{error}</p>}
 {loaded&&<div>{services.length===0?<p>لا توجد خدمات مسجلة لهذا المشروع.</p>:services.map(s=><article key={s.id} style={{padding:12,borderBottom:"1px solid #ddd"}}><strong>{s.service_name}</strong> ({s.service_code}) <p>{s.description}</p><small>{s.source_type} — {s.status}</small>{canEdit&&<label>الحالة <select value={s.status} disabled={busy} onChange={e=>void change(s.id,e.target.value)}>{["pending","active","paused","expired","cancelled"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}</article>)}</div>}
 {canEdit&&<form onSubmit={e=>{e.preventDefault();void create();}} style={{display:"grid",gap:10,marginTop:18}}><h3>إضافة خدمة للمشروع</h3><label>اسم الخدمة <input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label><label>كود الخدمة <input required pattern="[a-zA-Z0-9_-]+" value={code} onChange={e=>setCode(e.target.value)}/></label><label>الوصف <textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><label>المصدر <select value={sourceType} onChange={e=>setSourceType(e.target.value as typeof sourceType)}><option value="manual">إدارة</option><option value="package">باقة</option><option value="addon">إضافة</option><option value="offer">عرض</option></select></label><label>الحالة <select value={status} onChange={e=>setStatus(e.target.value)}><option value="pending">بانتظار التفعيل</option><option value="active">تفعيل الآن</option></select></label><button disabled={busy||!projectDraftId.trim()} type="submit">حفظ الخدمة</button></form>}
 </section>;
}
