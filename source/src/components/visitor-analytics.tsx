"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
export default function VisitorAnalytics(){
 const path=usePathname();
 useEffect(()=>{
 if(!path||/^\/(?:en\/)?(?:admin|team|customer|account|api|login)(?:\/|$)/i.test(path))return;
 let id:string,visitId:string;
 try{id=localStorage.getItem("atsh-analytics-id")||crypto.randomUUID();localStorage.setItem("atsh-analytics-id",id);const previous=Number(sessionStorage.getItem("atsh-journey-last")||0);visitId=(Date.now()-previous<1800000&&sessionStorage.getItem("atsh-journey-id"))||crypto.randomUUID();sessionStorage.setItem("atsh-journey-id",visitId);}catch{return;}
 let source="Direct";try{const host=new URL(document.referrer).hostname;if(host!==location.hostname)source=/google\./i.test(host)?"Google":/facebook\.|fb\.com/i.test(host)?"Facebook":/instagram\./i.test(host)?"Instagram":/youtube\.|youtu\.be/i.test(host)?"YouTube":"Other";}catch{}
 const safePath=path.replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,"redacted").replace(/[^/]*%40[^/]*/gi,"redacted");
 let lastActivity=Date.now(),lastTick=Date.now(),lastScroll=0,lastClick=0,wasVisible=document.visibilityState==="visible";
 const send=(kind:string,label="",activeSeconds=0)=>{if(document.visibilityState!=="visible"&&kind!=="activity")return;try{sessionStorage.setItem("atsh-journey-last",String(Date.now()));}catch{}void fetch("/api/visitor/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,visitId,eventId:crypto.randomUUID(),path:safePath,source,device:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?"mobile":"desktop",view:kind==="page",kind,label,activeSeconds}),keepalive:true}).catch(()=>{});};
 const touch=()=>{lastActivity=Date.now();};
 const classify=(el:Element)=>{const explicit=el.getAttribute("data-analytics-action");if(explicit&&/^[a-z0-9_-]{1,80}$/i.test(explicit))return explicit;const href=el.getAttribute("href")||"";if(/catalog/.test(href))return "catalog";if(/pricing|packages/.test(href))return "pricing";if(/preview/.test(href))return "preview";if(/order/.test(href))return "order";const text=(el.getAttribute("aria-label")||el.textContent||"").trim();const known:[RegExp,string][]=[[/المساعد الذكي|assistant/i,"assistant"],[/إرسال|send/i,"send"],[/معاينة|preview/i,"preview"],[/دومين|domain/i,"domain"],[/التالي|next/i,"next"],[/تأكيد|confirm/i,"confirm"],[/إضاف|add/i,"add"],[/أنظمة مخصصة|catalog/i,"catalog"],[/كوّن طلبك|build your/i,"order"],[/بحث|search/i,"search"]];return known.find(([re])=>re.test(text))?.[1]||el.tagName.toLowerCase();};
 const click=(e:MouseEvent)=>{touch();const el=e.target instanceof Element?e.target.closest("button,a,[role=button],input[type=checkbox],input[type=radio],select"):null;if(el&&Date.now()-lastClick>250){lastClick=Date.now();send("click",classify(el));}};
 const submit=(e:Event)=>{touch();if(e.target instanceof HTMLFormElement)send("submit",classify(e.target));};
 const scroll=()=>{touch();const max=document.documentElement.scrollHeight-innerHeight;if(max>0){const level=Math.min(100,Math.floor(scrollY/max*4)*25);if(level>lastScroll){lastScroll=level;send("scroll",String(level));}}};
 const tick=()=>{const now=Date.now();const seconds=wasVisible&&now-lastActivity<60000?Math.min(15,Math.floor((now-lastTick)/1000)):0;lastTick=now;if(seconds>0)send("activity","",seconds);};
 const originalFetch=window.fetch;
 const trackedFetch:typeof window.fetch=async(input,init)=>{
 const method=(init?.method||(input instanceof Request?input.method:"GET")).toUpperCase();
 let action="";try{const u=new URL(input instanceof Request?input.url:String(input),location.origin);if(u.origin===location.origin&&method==="POST"){if(u.pathname==="/api/visitor/assistant")action="assistant";else if(/^\/api\/(?:visitor\/)?(?:domain|domains)(?:\/|$)/.test(u.pathname))action="domain";else if(/^\/api\/(?:visitor\/)?(?:orders|order)(?:\/|$)/.test(u.pathname))action="order";}}catch{}
 try{const response=await originalFetch.call(window,input,init);if(action)send("result",action+"_"+(response.ok?"http_ok":"http_error"));return response;}catch(error){if(action)send("result",action+"_network_error");throw error;}
 };
 window.fetch=trackedFetch;
 send("page");const timer=setInterval(tick,15000);
 document.addEventListener("click",click,true);document.addEventListener("submit",submit,true);document.addEventListener("pointerdown",touch);document.addEventListener("keydown",touch);window.addEventListener("scroll",scroll,{passive:true});const visibility=()=>{tick();wasVisible=document.visibilityState==="visible";lastTick=Date.now();};document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",tick);
 return()=>{if(window.fetch===trackedFetch)window.fetch=originalFetch;tick();clearInterval(timer);document.removeEventListener("click",click,true);document.removeEventListener("submit",submit,true);document.removeEventListener("pointerdown",touch);document.removeEventListener("keydown",touch);window.removeEventListener("scroll",scroll);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",tick);};
 },[path]);return null;
}
