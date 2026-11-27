"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {visitorSession} from "../lib/visitor-session";
export default function VisitorAnalytics(){
 const path=usePathname();
 useEffect(()=>{
 if(!path||/^\/(?:en\/)?(?:admin|team|customer|customer-portal|account|api|login)(?:\/|$)/i.test(path))return;
 if(new URLSearchParams(location.search).has("atshPreview"))return;
 let id:string;
 try{id=localStorage.getItem("atsh-analytics-id")||crypto.randomUUID();localStorage.setItem("atsh-analytics-id",id);}catch{return;}
 let source="Direct";try{const host=new URL(document.referrer).hostname;if(host!==location.hostname)source=/google\./i.test(host)?"Google":/facebook\.|fb\.com/i.test(host)?"Facebook":/instagram\./i.test(host)?"Instagram":/youtube\.|youtu\.be/i.test(host)?"YouTube":"Other";}catch{}
 const safePath=path.replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,"redacted").replace(/[^/]*%40[^/]*/gi,"redacted");
 let lastActivity=0,lastTick=Date.now(),lastScroll=0,lastClick=0,lastScrollTouch=0,wasVisible=document.visibilityState==="visible",activitySession:string|null=null,pageRecorded=false;
 const getSession=(now:number,active=false)=>{try{return visitorSession(localStorage,now,()=>crypto.randomUUID(),active);}catch{return null;}};
 const send=(kind:string,visitId:string|null,label="",activeSeconds=0)=>{if(!visitId||(document.visibilityState!=="visible"&&kind!=="activity"))return;void fetch("/api/visitor/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,visitId,eventId:crypto.randomUUID(),path:safePath,source,device:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?"mobile":"desktop",view:kind==="page",kind,label,activeSeconds}),keepalive:true}).catch(()=>{});};
 const touch=()=>{
   if(document.visibilityState!=="visible")return null;
   const now=Date.now(),session=getSession(now,true);
   if(activitySession!==session){lastTick=now;lastScroll=0;lastClick=0;if(pageRecorded)send("activity",session);}
   activitySession=session;
   lastActivity=now;
   return session;
 };
 const page=()=>{const session=touch();if(session){pageRecorded=true;send("page",session);}};
 const classify=(el:Element)=>{const explicit=el.getAttribute("data-analytics-action");if(explicit&&/^[a-z0-9_-]{1,80}$/i.test(explicit))return explicit;const href=el.getAttribute("href")||"";if(/catalog/.test(href))return "catalog";if(/pricing|packages/.test(href))return "pricing";if(/preview/.test(href))return "preview";if(/order/.test(href))return "order";const text=(el.getAttribute("aria-label")||el.textContent||"").trim();const known:[RegExp,string][]=[[/المساعد الذكي|assistant/i,"assistant"],[/إرسال|send/i,"send"],[/معاينة|preview/i,"preview"],[/دومين|domain/i,"domain"],[/التالي|next/i,"next"],[/تأكيد|confirm/i,"confirm"],[/إضاف|add/i,"add"],[/أنظمة مخصصة|catalog/i,"catalog"],[/كوّن طلبك|build your/i,"order"],[/بحث|search/i,"search"]];return known.find(([re])=>re.test(text))?.[1]||el.tagName.toLowerCase();};
 const click=(e:MouseEvent)=>{const session=touch();const el=e.target instanceof Element?e.target.closest("button,a,[role=button],input[type=checkbox],input[type=radio],select"):null;if(el&&Date.now()-lastClick>250){lastClick=Date.now();send("click",session,classify(el));}};
 const submit=(e:Event)=>{const session=touch();if(e.target instanceof HTMLFormElement)send("submit",session,classify(e.target));};
 const scroll=()=>{const now=Date.now(),max=document.documentElement.scrollHeight-innerHeight;if(now-lastScrollTouch<500)return;lastScrollTouch=now;const session=touch();if(max>0){const level=Math.min(100,Math.floor(scrollY/max*4)*25);if(level>lastScroll){lastScroll=level;send("scroll",session,String(level));}}};
 const tick=()=>{const now=Date.now();const seconds=wasVisible&&now-lastActivity<60000?Math.min(15,Math.floor((now-lastTick)/1000)):0;lastTick=now;if(seconds>0&&activitySession===getSession(now))send("activity",activitySession,"",seconds);};
 const originalFetch=window.fetch;
 const trackedFetch:typeof window.fetch=async(input,init)=>{
 const method=(init?.method||(input instanceof Request?input.method:"GET")).toUpperCase();
 let action="";try{const u=new URL(input instanceof Request?input.url:String(input),location.origin);if(u.origin===location.origin&&method==="POST"){if(u.pathname==="/api/visitor/assistant")action="assistant";else if(/^\/api\/(?:visitor\/)?(?:domain|domains)(?:\/|$)/.test(u.pathname))action="domain";else if(/^\/api\/(?:visitor\/)?(?:orders|order)(?:\/|$)/.test(u.pathname))action="order";}}catch{}
 const requestSession=action?getSession(Date.now()):null;
 try{const response=await originalFetch.call(window,input,init);if(action)send("result",requestSession,action+"_"+(response.ok?"http_ok":"http_error"));return response;}catch(error){if(action)send("result",requestSession,action+"_network_error");throw error;}
 };
 window.fetch=trackedFetch;
 page();const timer=setInterval(tick,15000);
 document.addEventListener("click",click,true);document.addEventListener("submit",submit,true);document.addEventListener("pointerdown",touch);document.addEventListener("keydown",touch);window.addEventListener("scroll",scroll,{passive:true});const visibility=()=>{tick();wasVisible=document.visibilityState==="visible";lastTick=Date.now();if(wasVisible&&!pageRecorded)page();};document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",tick);
 return()=>{if(window.fetch===trackedFetch)window.fetch=originalFetch;tick();clearInterval(timer);document.removeEventListener("click",click,true);document.removeEventListener("submit",submit,true);document.removeEventListener("pointerdown",touch);document.removeEventListener("keydown",touch);window.removeEventListener("scroll",scroll);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",tick);};
 },[path]);return null;
}
