"use client";
import {useEffect,useState} from "react";
import {NewsBubbles} from "./news-bubbles";
import {usePathname} from "next/navigation";
import {readPagePreview} from "@/lib/page-preview";
import {createPortal} from "react-dom";
import {normalizeNewsTickerPosition,type NewsTickerPosition} from "@/lib/news-ticker-position";

export default function SocialHeader(){
 const [ticker,setTicker]=useState<{enabled:boolean;text:string;url:string;speed:number;background:string;color:string;position?:NewsTickerPosition}|null>(null);
 const [tickerHost,setTickerHost]=useState<HTMLElement|null>(null);
 const pathname=usePathname();
 useEffect(()=>{const locale=pathname.startsWith("/en")?"en":"ar";let live=true;setTicker(null);const valid=(t:any)=>t?.enabled&&typeof t.text==="string"&&t.text.trim();const apply=(t:any)=>{if(live)setTicker(valid(t)?t:null);};const preview=readPagePreview("home",locale);if(preview){apply(preview.content.newsTicker);return()=>{live=false;};}const load=async(lang:string)=>{try{const r=await fetch("/api/site-content/home?locale="+lang,{cache:"no-store"});return r.ok?(await r.json())?.page?.content?.newsTicker:null;}catch{return null;}};void (async()=>{const local=await load(locale);if(valid(local)){apply(local);return;}const other=await load(locale==="en"?"ar":"en");apply(valid(other)?{...other,text:locale==="en"?"Explore ATSH AI websites and apps ✦ Customize your system now":"اكتشف مواقع وتطبيقات ATSH AI ✦ خصص نظامك الآن"}:null);})();return()=>{live=false;};},[pathname]);
 const [host,setHost]=useState<HTMLElement|null>(null);
 // Private workspaces always retain the requested top-of-page placement.
 const portal=/^\/(?:ar\/|en\/)?(?:admin|account|team)(?:\/|$)/.test(pathname);
 const position=portal?"top":normalizeNewsTickerPosition(ticker?.position);
 useEffect(()=>{
  const holder=document.createElement("div");holder.className="atsh-social-inline-slot";if(!/^\/(?:ar|en)?\/?$/.test(pathname)&&!/^\/(?:ar\/|en\/)?(?:admin|account|team)(?:\/|$)/.test(pathname))holder.dataset.internalPublic="true";const bar=document.createElement("div");bar.className="atsh-news-slot";
  const placeAtPageTop=()=>{if(document.body.firstElementChild!==bar)document.body.prepend(bar);};
  const place=()=>{
   // A full-screen or embedded demo is its own viewport. Never insert the
   // platform ticker (or social links) ahead of its iframe.
   const params=new URLSearchParams(window.location.search);
   const catalogDemo=/^\/(?:en\/)?catalog\/[^/]+\/?$/.test(pathname);
   if(document.querySelector('main[data-catalog-immersive="true"]')||(catalogDemo&&(params.get("fullscreen")==="1"||params.get("embedded")==="1"))){
    if(holder.isConnected)holder.remove();if(bar.isConnected)bar.remove();setHost(null);setTickerHost(null);return;
   }
   const brand=document.querySelector<HTMLElement>(".platform-header .platform-brand, .managed-header .managed-brand, header .atsh-start-brand, header .admin-brand, header a[href=\"/\"]");
   const header=brand?.closest("header")||document.querySelector<HTMLElement>(".platform-header, .managed-header, .admin-topbar, .admin-header, .customer-header, .atsh-start-header, main > header");
   if(!header){if(holder.isConnected)holder.remove();setHost(null);placeAtPageTop();setTickerHost(bar);return;}
   if(brand?.parentElement===header){if(holder.parentElement!==header||holder.previousElementSibling!==brand)brand.insertAdjacentElement("afterend",holder);}
   else if(holder.parentElement!==header)header.prepend(holder);
   if(holder.isConnected)setHost(holder);
   // Resolve only known page landmarks in the same container as the header.
   // Empty or unavailable anchors fall back above the header without wrapping or
   // rearranging its children, and the observer handles client-side navigation.
   const parent=header.parentElement;
   const hero=parent?.querySelector<HTMLElement>(":scope > .build-hero, :scope > .managed-hero");
   const footer=parent?.querySelector<HTMLElement>(":scope > .platform-footer, :scope > .managed-footer, :scope > footer");
   const after=position==="below_header"?header:position==="after_hero"?hero:null;
   const before=position==="before_footer"?footer:null;
   if(after){if(bar.previousElementSibling!==after)after.after(bar);}
   else if(before){if(bar.nextElementSibling!==before)before.before(bar);}
   else placeAtPageTop();
   setTickerHost(bar);
  };
  place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["data-catalog-immersive"]});
  return ()=>{observer.disconnect();holder.remove();bar.remove();};
 },[pathname,position]);
 return <>{ticker&&tickerHost&&createPortal(<NewsBubbles ticker={ticker} english={pathname.startsWith("/en")}/>,tickerHost)}{host&&createPortal(
 <nav className="atsh-social-header" aria-label="ATSH AI social media">
  <span className="pending" title="YouTube — قريبًا" aria-label="YouTube — قريبًا"><svg viewBox="0 0 24 24" fill="#ff0033" aria-hidden="true"><path d="M22 7.2a2.7 2.7 0 0 0-1.9-1.9C18.4 4.9 12 4.9 12 4.9s-6.4 0-8.1.4A2.7 2.7 0 0 0 2 7.2a28 28 0 0 0 0 9.6 2.7 2.7 0 0 0 1.9 1.9c1.7.4 8.1.4 8.1.4s6.4 0 8.1-.4a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 0-9.6ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></span>
  <a href="https://www.facebook.com/profile.php?id=61587637301618" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="#1877f2" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.7-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/></svg></a>
  <span className="pending" title="Instagram — قريبًا" aria-label="Instagram — قريبًا"><svg viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#e1306c" stroke="none"/></svg></span>
 </nav>,host)}</>;
}
