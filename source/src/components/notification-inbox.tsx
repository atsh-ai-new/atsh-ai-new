"use client";
import {useCallback,useEffect,useRef,useState} from "react";

type Notice={id:string;title:string;body:string;target_path:string;created_at:string;read_at:string|null};
const POLL_MS=5000;
function playChime(){
 // One restrained two-note chime for every notification type. No external audio asset.
 const AudioContextClass=window.AudioContext;
 if(!AudioContextClass)return;
 const ctx=new AudioContextClass();
 void ctx.resume().then(()=>{
  const start=ctx.currentTime+0.02;
  for(const [offset,frequency] of [[0,740],[0.13,988]] as const){
   const oscillator=ctx.createOscillator();
   const gain=ctx.createGain();
   oscillator.type="sine";
   oscillator.frequency.value=frequency;
   gain.gain.setValueAtTime(0.0001,start+offset);
   gain.gain.exponentialRampToValueAtTime(0.055,start+offset+0.015);
   gain.gain.exponentialRampToValueAtTime(0.0001,start+offset+0.22);
   oscillator.connect(gain).connect(ctx.destination);
   oscillator.start(start+offset);
   oscillator.stop(start+offset+0.23);
  }
  window.setTimeout(()=>void ctx.close(),650);
 }).catch(()=>void ctx.close());
}
export default function NotificationInbox({customer=false}:{customer?:boolean}){
 const [items,setItems]=useState<Notice[]>([]);
 const [error,setError]=useState("");
 const [soundOn,setSoundOn]=useState(false);
 const base=customer?"/api/customer/auth/notifications":"/api/admin/notifications";
 const storageKey=customer?"atsh-customer-notification-sound":"atsh-admin-notification-sound";
 const previousIds=useRef<Set<string>|null>(null);
 const busy=useRef(false);
 const pending=useRef(false);
 const soundRef=useRef(false);
 useEffect(()=>{
  const enabled=window.localStorage.getItem(storageKey)==="on";
  setSoundOn(enabled);
  soundRef.current=enabled;
 },[storageKey]);
 const refresh=useCallback(async()=>{
  if(busy.current){pending.current=true;return;}
  busy.current=true;
  try{
   const r=await fetch(base,{credentials:"include",cache:"no-store"});
   if(!r.ok)throw new Error(r.status===503?"الإشعارات تنتظر تفعيل قاعدة البيانات":r.status===404?"واجهة الإشعارات غير متاحة على الخادم الحالي":r.status===401?"انتهت جلسة الدخول، يرجى تسجيل الدخول مجددًا":`تعذر تحميل الإشعارات (HTTP ${r.status})`);
   const d=await r.json();
   const next:Notice[]=Array.isArray(d.notifications)?d.notifications:[];
   const nextIds=new Set(next.map(n=>n.id));
   if(previousIds.current!==null&&soundRef.current&&next.some(n=>!n.read_at&&!previousIds.current!.has(n.id))){
    // A single chime even if several messages arrive together.
    playChime();
   }
   previousIds.current=nextIds;
   setItems(next);
   setError("");
  }catch(e){setItems([]);setError(e instanceof Error?e.message:"تعذر تحميل الإشعارات");}
  finally{busy.current=false;if(pending.current){pending.current=false;void refresh();}}
 },[base]);
 useEffect(()=>{
  previousIds.current=null;
  void refresh();
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},POLL_MS);
  const onFocus=()=>void refresh();
  window.addEventListener("focus",onFocus);
  window.addEventListener("atsh-project-deleted",onFocus);
  document.addEventListener("visibilitychange",onFocus);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",onFocus);window.removeEventListener("atsh-project-deleted",onFocus);document.removeEventListener("visibilitychange",onFocus)};
 },[refresh]);
 const unread=items.filter(x=>!x.read_at).length;
 function toggleSound(){
  const next=!soundOn;
  soundRef.current=next;
  setSoundOn(next);
  window.localStorage.setItem(storageKey,next?"on":"off");
  if(next)playChime();
 }
 async function mark(id:string){
  const r=await fetch(base+"/"+encodeURIComponent(id)+"/read",{method:"POST",credentials:"include"});
  if(!r.ok){setError("تعذر تحديث حالة الإشعار");return;}
  await refresh();
 }
 return <div style={{display:"flex",alignItems:"center",gap:6,maxWidth:"100%"}}>
  <details style={{position:"relative",maxWidth:"100%"}}>
   <summary style={{cursor:"pointer",padding:"8px 10px",whiteSpace:"nowrap"}} aria-label={`الإشعارات، ${unread} غير مقروءة`}>🔔 الإشعارات {unread>0?`(${unread})`:""}</summary>
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
  </details>
  <button type="button" onClick={toggleSound} aria-pressed={soundOn} title={soundOn?"كتم صوت الإشعارات":"تشغيل صوت الإشعارات"} style={{cursor:"pointer",border:"1px solid #d8dde5",borderRadius:8,padding:"6px 8px",background:"transparent",whiteSpace:"nowrap"}}>{soundOn?"🔊":"🔇"}<span style={{fontSize:12,marginInlineStart:4}}>{soundOn?"كتم":"صوت"}</span></button>
 </div>;
}
