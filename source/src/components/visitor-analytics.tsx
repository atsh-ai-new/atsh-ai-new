"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
export default function VisitorAnalytics(){
 const path=usePathname();
 useEffect(()=>{
 if(!path||/^\/(?:en\/)?(?:admin|team|customer|account|api|login)(?:\/|$)/i.test(path))return;
 let id:string;
 try{id=localStorage.getItem("atsh-analytics-id")||crypto.randomUUID();localStorage.setItem("atsh-analytics-id",id);}catch{return;}
 let source="Direct";try{const host=new URL(document.referrer).hostname;if(host!==location.hostname)source=/google\./i.test(host)?"Google":/facebook\.|fb\.com/i.test(host)?"Facebook":/instagram\./i.test(host)?"Instagram":/youtube\.|youtu\.be/i.test(host)?"YouTube":"Other";}catch{}
 const send=(view:boolean)=>{if(document.visibilityState!=="visible")return;void fetch("/api/visitor/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,path,source,device:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?"mobile":"desktop",view}),keepalive:true}).catch(()=>{});};
 send(true);const timer=setInterval(()=>send(false),30000);const visible=()=>send(false);document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
 },[path]);return null;
}
