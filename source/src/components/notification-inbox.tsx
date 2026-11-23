"use client";
import {useCallback,useEffect,useState} from "react";

type Notice={id:string;title:string;body:string;target_path:string;created_at:string;read_at:string|null};
export default function NotificationInbox({customer=false}:{customer?:boolean}){
 const [items,setItems]=useState<Notice[]>([]);
 const [error,setError]=useState("");
 const base=customer?"/api/customer/auth/notifications":"/api/admin/notifications";
 const refresh=useCallback(async()=>{
  try{
   const r=await fetch(base,{credentials:"include",cache:"no-store"});
   if(!r.ok)throw new Error(r.status===503?"الإشعارات تنتظر تفعيل قاعدة البيانات":r.status===404?"واجهة الإشعارات غير متاحة على الخادم الحالي":r.status===401?"انتهت جلسة الدخول، يرجى تسجيل الدخول مجددًا":`تعذر تحميل الإشعارات (HTTP ${r.status})`);
   const d=await r.json();setItems(d.notifications||[]);setError("");
  }catch(e){setError(e instanceof Error?e.message:"تعذر تحميل الإشعارات");}
 },[base]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>clearInterval(timer)},[refresh]);
 const unread=items.filter(x=>!x.read_at).length;
 async function mark(id:string){
  const r=await fetch(base+"/"+encodeURIComponent(id)+"/read",{method:"POST",credentials:"include"});
  if(!r.ok){setError("تعذر تحديث حالة الإشعار");return;}
  await refresh();
 }
 return <details style={{position:"relative",maxWidth:"100%"}}>
  <summary style={{cursor:"pointer",padding:"8px 10px",whiteSpace:"nowrap"}}>🔔 الإشعارات {unread>0?`(${unread})`:""}</summary>
  <section aria-label="صندوق الإشعارات" style={{maxHeight:340,overflowY:"auto",minWidth:260,maxWidth:390,padding:10,background:"var(--surface,#fff)",color:"var(--text,#14243c)",border:"1px solid #d8dde5",borderRadius:10}}>
   {error&&<p role="status">{error}</p>}
   {!error&&items.length===0&&<p>لا توجد إشعارات حاليًا.</p>}
   {items.map(item=><article key={item.id} style={{padding:9,borderBottom:"1px solid #e4e7eb",opacity:item.read_at ? 0.7 : 1}}>
    <strong>{item.title}</strong><p style={{margin:"4px 0",overflowWrap:"anywhere"}}>{item.body}</p>
    <small>{new Date(item.created_at).toLocaleString("ar-EG")}</small>
    <div style={{display:"flex",gap:8,marginTop:5}}>
     {item.target_path.startsWith("/")&&!item.target_path.startsWith("//")&&<a href={item.target_path}>فتح</a>}
     {!item.read_at&&<button type="button" onClick={()=>void mark(item.id)}>تحديد كمقروء</button>}
    </div>
   </article>)}
  </section>
 </details>;
}
