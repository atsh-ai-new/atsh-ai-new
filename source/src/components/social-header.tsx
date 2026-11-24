"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {readPagePreview} from "@/lib/page-preview";
import {createPortal} from "react-dom";

export default function SocialHeader(){
 const [ticker,setTicker]=useState<{enabled:boolean;text:string;url:string;speed:number;background:string;color:string}|null>(null);
 const [tickerHost,setTickerHost]=useState<HTMLElement|null>(null);
 const [top,setTop]=useState(0);
 const [duration,setDuration]=useState(12);
 const pathname=usePathname();
 useEffect(()=>{const locale=pathname.startsWith("/en")?"en":"ar";let live=true;setTicker(null);const valid=(t:any)=>t?.enabled&&typeof t.text==="string"&&t.text.trim();const apply=(t:any)=>{if(live)setTicker(valid(t)?t:null);};const preview=readPagePreview("home",locale);if(preview){apply(preview.content.newsTicker);return()=>{live=false;};}const load=async(lang:string)=>{try{const r=await fetch("/api/site-content/home?locale="+lang,{cache:"no-store"});return r.ok?(await r.json())?.page?.content?.newsTicker:null;}catch{return null;}};void (async()=>{const local=await load(locale);if(valid(local)){apply(local);return;}const other=await load(locale==="en"?"ar":"en");apply(valid(other)?{...other,text:locale==="en"?"Explore ATSH AI websites and apps ✦ Customize your system now":"اكتشف مواقع وتطبيقات ATSH AI ✦ خصص نظامك الآن"}:null);})();return()=>{live=false;};},[pathname]);
 const [host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const holder=document.createElement("div");holder.className="atsh-social-inline-slot";if(!/^\/(?:ar|en)?\/?$/.test(pathname)&&!/^\/(?:ar\/|en\/)?(?:admin|account|team)(?:\/|$)/.test(pathname))holder.dataset.internalPublic="true";const bar=document.createElement("div");bar.className="atsh-news-slot";
  const place=()=>{
   const brand=document.querySelector<HTMLElement>(".platform-header .platform-brand, .managed-header .managed-brand, header .atsh-start-brand, header .admin-brand, header a[href=\"/\"]");
   const header=brand?.closest("header")||document.querySelector<HTMLElement>(".platform-header, .managed-header, .admin-header, .customer-header, header");
   if(!header){if(!bar.isConnected)document.body.prepend(bar);setTickerHost(bar);return;}
   if(brand?.parentElement===header){if(holder.parentElement!==header||holder.previousElementSibling!==brand)brand.insertAdjacentElement("afterend",holder);}
   else if(holder.parentElement!==header)header.prepend(holder);
   if(holder.isConnected)setHost(holder);if(bar.previousElementSibling!==header)header.after(bar);setTickerHost(bar);
  };
  place();const observer=new MutationObserver(()=>{if(!holder.isConnected||!bar.isConnected||(!bar.previousElementSibling&&document.querySelector("header")))place();});observer.observe(document.body,{childList:true,subtree:true});
  return ()=>{observer.disconnect();holder.remove();bar.remove();};
 },[pathname]);
 useEffect(()=>{if(!tickerHost||!ticker)return;tickerHost.dataset.active="true";const sync=()=>{const header=tickerHost.previousElementSibling?.matches("header")?tickerHost.previousElementSibling:null;const top=Math.max(0,header?.getBoundingClientRect().bottom??0);setTop(top);};sync();window.addEventListener("scroll",sync,{passive:true});window.addEventListener("resize",sync);const observer=new ResizeObserver(sync);if(tickerHost.previousElementSibling)observer.observe(tickerHost.previousElementSibling);return()=>{delete tickerHost.dataset.active;observer.disconnect();window.removeEventListener("scroll",sync);window.removeEventListener("resize",sync);};},[tickerHost,ticker]);
 useEffect(()=>{if(!ticker)return;const track=document.querySelector(".atsh-news-track");if(!track)return;const measure=()=>setDuration(Math.max(3,track.scrollWidth/2/(75*25/Math.max(8,Math.min(90,Number(ticker.speed)||25)))));measure();const observer=new ResizeObserver(measure);observer.observe(track);return()=>observer.disconnect();},[ticker,tickerHost]);
 return <>{ticker&&tickerHost&&createPortal(<div className="atsh-news-ticker" dir="ltr" style={{top}} ><div className="atsh-news-track" style={{animationDuration:duration+"s",animationDirection:pathname.startsWith("/en")?"reverse":"normal"}}><div className="atsh-news-copy" dir={pathname.startsWith("/en")?"ltr":"rtl"}>{/^\/(?!\/)|^https:\/\//i.test(ticker.url||"")?<a href={ticker.url}>{ticker.text}</a>:<span>{ticker.text}</span>}</div><div className="atsh-news-copy" dir={pathname.startsWith("/en")?"ltr":"rtl"} aria-hidden="true">{/^\/(?!\/)|^https:\/\//i.test(ticker.url||"")?<a tabIndex={-1} href={ticker.url}>{ticker.text}</a>:<span>{ticker.text}</span>}</div></div><style>{`.atsh-news-slot{min-height:0}.atsh-news-slot[data-active=true]{min-height:30px;background:#fff}.atsh-news-ticker{position:fixed;top:var(--ticker-top,0px);left:0;right:0;z-index:101;background:#fff;color:#6D28D9;text-shadow:none;border-bottom:1px solid #dceef9;font-weight:600;overflow:hidden;min-height:30px;display:flex;align-items:center;font-size:12px;line-height:1.5}.atsh-news-track{display:flex;direction:ltr;flex:none;width:max-content;animation:atsh-news-move linear infinite;white-space:nowrap;text-align:center}.atsh-news-copy{flex:0 0 auto;min-width:100vw;padding:5px 24px;box-sizing:border-box;unicode-bidi:plaintext}.atsh-news-track a{color:inherit}.atsh-news-ticker:hover .atsh-news-track,.atsh-news-ticker:focus-within .atsh-news-track{animation-play-state:paused}@keyframes atsh-news-move{from{transform:translateX(-50%)}to{transform:translateX(0)}}@media(prefers-reduced-motion:reduce){.atsh-news-track{animation:none;white-space:normal;width:100%;min-width:100%}.atsh-news-copy[aria-hidden=true]{display:none}}`}</style></div>,document.body)}{host&&createPortal(
 <nav className="atsh-social-header" aria-label="ATSH AI social media">
  <span className="pending" title="YouTube — قريبًا" aria-label="YouTube — قريبًا"><svg viewBox="0 0 24 24" fill="#ff0033" aria-hidden="true"><path d="M22 7.2a2.7 2.7 0 0 0-1.9-1.9C18.4 4.9 12 4.9 12 4.9s-6.4 0-8.1.4A2.7 2.7 0 0 0 2 7.2a28 28 0 0 0 0 9.6 2.7 2.7 0 0 0 1.9 1.9c1.7.4 8.1.4 8.1.4s6.4 0 8.1-.4a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 0-9.6ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></span>
  <a href="https://www.facebook.com/profile.php?id=61587637301618" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="#1877f2" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.7-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/></svg></a>
  <span className="pending" title="Instagram — قريبًا" aria-label="Instagram — قريبًا"><svg viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#e1306c" stroke="none"/></svg></span>
 </nav>,host)}</>;
}
