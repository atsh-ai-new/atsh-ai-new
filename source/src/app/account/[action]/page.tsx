"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useParams,useSearchParams} from "next/navigation";

type Order={id:string;reference:string;status:string;total:number;currency:string;project_id:string};
type Quote={id:number;status:string;total_piasters:number;currency:string};
type Contract={id:number;status:string;body_snapshot:string;quote_id:number};
type Invoice={id:number;status:string;amount_piasters:number;verified_paid_piasters:number};
type Payment={id:number;amount_piasters:number;paid_at:string;provider:string};
type Deliverable={id:string;title:string;kind:string;asset_url:string|null;has_private_file?:boolean;customer_decision:string;customer_feedback:string};
type Project={id:string;customer_name:string;status:string;created_at:string};
type GoogleCredential={credential:string};
type GoogleApi={accounts:{id:{initialize:(config:{client_id:string;callback:(data:GoogleCredential)=>void})=>void;renderButton:(element:HTMLElement,options:Record<string,string>)=>void}}};
declare global {interface Window {google?:GoogleApi}}

export default function CustomerAccount(){
 const {action}=useParams<{action:string}>();const search=useSearchParams();const [email,setEmail]=useState("");const [name,setName]=useState("");const [password,setPassword]=useState("");const [message,setMessage]=useState("");const [deliverables,setDeliverables]=useState<Deliverable[]>([]);const [feedback,setFeedback]=useState<Record<string,string>>({});const [projects,setProjects]=useState<Project[]>([]);const [orders,setOrders]=useState<Order[]>([]);const [quotes,setQuotes]=useState<Quote[]>([]);const [contracts,setContracts]=useState<Contract[]>([]);const [invoices,setInvoices]=useState<Invoice[]>([]);const [invoicePayments,setInvoicePayments]=useState<Record<number,Payment[]>>({}),[openInvoice,setOpenInvoice]=useState<number|null>(null);const [projectId,setProjectId]=useState("");const [accessToken,setAccessToken]=useState("");const googleContainer=useRef<HTMLDivElement>(null);
 const loadProjects=useCallback(async()=>{try{const r=await fetch("/api/customer/auth/projects",{credentials:"include",cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();setProjects(d.projects);}catch{setMessage("سجّل الدخول لعرض مشروعاتك");}},[]);
 const request=useCallback(async(path:string,data:Record<string,string>={})=>{setMessage("جارٍ التنفيذ...");try{const response=await fetch(`/api/customer/auth/${path}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const body=await response.json();setMessage(response.ok?body.message||"تم بنجاح":body.error||"تعذر إتمام الطلب");if(response.ok&&(path==="login"||path==="google"))location.href="/account/dashboard";if(response.ok&&path==="logout")location.href="/account/login";if(response.ok&&path==="projects/claim"){setAccessToken("");await loadProjects();}}catch{setMessage("تعذر الاتصال بالخدمة");}},[loadProjects]);
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
 useEffect(()=>{if(action==="dashboard")void loadProjects();},[action,loadProjects]);
 useEffect(()=>{if(action!=="login"&&action!=="register")return;const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;if(!clientId)return;let cancelled=false;const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.defer=true;script.onload=()=>{if(cancelled||!googleContainer.current||!window.google)return;window.google.accounts.id.initialize({client_id:clientId,callback:({credential})=>{void request("google",{credential});}});window.google.accounts.id.renderButton(googleContainer.current,{theme:"outline",size:"large",text:"continue_with",locale:"ar"});};document.head.appendChild(script);return()=>{cancelled=true;script.remove();};},[action,request]);
 return <main dir="rtl" style={{maxWidth:540,margin:"5rem auto",padding:24}}><h1>{({register:"إنشاء حساب",login:"تسجيل الدخول",forgot:"استعادة كلمة المرور","reset-password":"تعيين كلمة مرور جديدة",verify:"تأكيد البريد",dashboard:"مشروعاتي"} as Record<string,string>)[action]||"حساب العميل"}</h1>
 {! ["verify","dashboard"].includes(action)&&<form onSubmit={e=>{e.preventDefault();const token=search.get("token")||"";void request(({register:"register",login:"login",forgot:"password/forgot","reset-password":"password/reset"} as Record<string,string>)[action]||"login",{email,name,password,token});}}>
 {action==="register"&&<label>الاسم<input required value={name} onChange={e=>setName(e.target.value)}/></label>}
 {action!=="reset-password"&&<label>البريد الإلكتروني<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {action!=="forgot"&&<label>كلمة المرور<input type="password" minLength={action==="login"?1:12} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 <button type="submit">متابعة</button></form>}
 {(action==="login"||action==="register")&&<><p><a href="/account/forgot">نسيت كلمة المرور؟</a> · <a href="/account/register">إنشاء حساب</a></p><div ref={googleContainer} aria-label="تسجيل الدخول باستخدام Google"/></>}
 {action==="dashboard"&&<><h2>مشروعاتي</h2><ul>{projects.map(p=><li key={p.id}>{p.customer_name} — {p.status} — {p.id}</li>)}</ul><h2>طلباتي المرتبطة بمشروعاتي</h2><ul>{orders.map(o=><li key={o.id}>{o.reference} — {o.status} — {o.total} {o.currency}</li>)}</ul>
 <h2>عروض الأسعار</h2><ul>{quotes.map(q=><li key={q.id}>عرض #{q.id} — {q.status} — {(q.total_piasters/100).toFixed(2)} {q.currency}</li>)}</ul>
 <h2>عقودي</h2><ul>{contracts.map(c=><li key={c.id}>عقد #{c.id} — {c.status} <button type="button" onClick={()=>{const w=window.open("","_blank","noopener,noreferrer");if(!w)return;const text=document.createElement("pre");text.textContent=c.body_snapshot;w.document.body.appendChild(text);w.print();}}>طباعة</button></li>)}</ul>
 <h2>الفواتير وسجل المدفوعات</h2><ul>{invoices.map(i=><li key={i.id}>فاتورة #{i.id} — {i.status} — الإجمالي {(Number(i.amount_piasters)/100).toFixed(2)} جنيه — المدفوع {(Number(i.verified_paid_piasters)/100).toFixed(2)} جنيه — المتبقي {((Number(i.amount_piasters)-Number(i.verified_paid_piasters))/100).toFixed(2)} جنيه <button type="button" onClick={async()=>{if(openInvoice===i.id){setOpenInvoice(null);return}try{const r=await fetch(`/api/customer/commercial/invoices/${i.id}/payments`,{credentials:'include',cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();setInvoicePayments(x=>({...x,[i.id]:data.payments||[]}));setOpenInvoice(i.id)}catch{setMessage('تعذر تحميل سجل الدفعات')}}}>عرض الدفعات</button>{openInvoice===i.id&&<ul>{(invoicePayments[i.id]||[]).length?(invoicePayments[i.id]||[]).map(p=><li key={p.id}>{(Number(p.amount_piasters)/100).toFixed(2)} جنيه — {new Date(p.paid_at).toLocaleDateString('ar-EG')} — {p.provider}</li>):<li>لا توجد دفعات مؤكدة</li>}</ul>}</li>)}</ul>
 <h2>تسليماتي: الفيديوهات والهوية البصرية</h2><ul>{deliverables.map(d=><li key={d.id}><strong>{d.title}</strong> ({d.kind}) — {d.customer_decision} {d.has_private_file?<a href={`/api/customer/deliverables/${d.id}/file`} download>تحميل الملف الخاص</a>:d.asset_url?<a href={d.asset_url} target="_blank" rel="noopener noreferrer">مشاهدة / تحميل</a>:<span>لم يُرفق ملف بعد</span>}{d.customer_decision==="pending"&&<><input aria-label="ملاحظات التعديل" placeholder="ملاحظات التعديل" value={feedback[d.id]||""} onChange={e=>setFeedback(x=>({...x,[d.id]:e.target.value}))}/>{(["approved","revision_requested"] as const).map(decision=><button key={decision} type="button" onClick={async()=>{const r=await fetch(`/api/customer/deliverables/${d.id}/decision`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,feedback:feedback[d.id]||""})});if(r.ok)setDeliverables(x=>x.map(item=>item.id===d.id?{...item,customer_decision:decision}:item));else setMessage("تعذر تسجيل القرار");}}>{decision==="approved"?"اعتماد":"طلب تعديل"}</button>)}</>}</li>)}</ul><h2>ربط مشروع سابق بحسابك</h2><form onSubmit={e=>{e.preventDefault();void request("projects/claim",{projectId,accessToken});}}><label>معرف المشروع<input required value={projectId} onChange={e=>setProjectId(e.target.value)} placeholder="UUID"/></label><label>رمز الوصول للمشروع<input required type="password" value={accessToken} onChange={e=>setAccessToken(e.target.value)} autoComplete="off"/></label><button type="submit">ربط المشروع</button></form><button onClick={()=>void request("logout")}>تسجيل الخروج</button></>}
 <p role="status" aria-live="polite">{message}</p></main>;
}
