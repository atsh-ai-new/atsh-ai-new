"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

export default function SocialHeader(){
 const [ticker,setTicker]=useState<{enabled:boolean;text:string;url:string;speed:number;background:string;color:string}|null>(null);
 const [tickerHost,setTickerHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{const en=location.pathname.startsWith("/en");let live=true;void fetch("/api/site-content/home?locale="+(en?"en":"ar"),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(!live)return;const t=d?.page?.content?.newsTicker;if(t&&t.enabled&&typeof t.text==="string"&&t.text.trim())setTicker(t);}).catch(()=>{});return()=>{live=false;};},[]);
 const [host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const holder=document.createElement("div");holder.className="atsh-social-inline-slot";const bar=document.createElement("div");
  const place=()=>{
   const brand=document.querySelector<HTMLElement>(".platform-header .platform-brand, .managed-header .managed-brand, header .atsh-start-brand, header .admin-brand, header a[href=\"/\"]");
   const header=brand?.closest("header")||document.querySelector<HTMLElement>(".platform-header, .managed-header, .admin-header, .customer-header, header");
   if(!header)return;
   if(brand?.parentElement===header){if(holder.parentElement!==header||holder.previousElementSibling!==brand)brand.insertAdjacentElement("afterend",holder);}
   else if(holder.parentElement!==header)header.prepend(holder);
   if(holder.isConnected)setHost(holder);if(header.matches(".platform-header,.managed-header")&&!header.closest(".admin-page")){if(bar.nextElementSibling!==header)header.before(bar);setTickerHost(bar);}
  };
  place();const observer=new MutationObserver(()=>{if(!holder.isConnected)place();});observer.observe(document.body,{childList:true,subtree:true});
  return ()=>{observer.disconnect();holder.remove();bar.remove();};
 },[]);
 if(!host)return null;
 return <>{ticker&&tickerHost&&createPortal(<div className="atsh-news-ticker" style={{background:/^#[0-9a-f]{6}$/i.test(ticker.background)?ticker.background:"#203958",color:/^#[0-9a-f]{6}$/i.test(ticker.color)?ticker.color:"#ffffff"}}><div className="atsh-news-track" style={{animationDuration:Math.max(8,Math.min(90,Number(ticker.speed)||25))+"s"}}>{/^\/(?!\/)|^https:\/\//i.test(ticker.url||"")?<a href={ticker.url}>{ticker.text}</a>:<span>{ticker.text}</span>}</div><style>{`.atsh-news-ticker{overflow:hidden;min-height:30px;display:flex;align-items:center;font-size:12px;line-height:1.5}.atsh-news-track{flex:none;min-width:100%;width:max-content;animation:atsh-news-move linear infinite;white-space:nowrap;text-align:center;padding:5px 12px}.atsh-news-track a{color:inherit}.atsh-news-ticker:hover .atsh-news-track,.atsh-news-ticker:focus-within .atsh-news-track{animation-play-state:paused}@keyframes atsh-news-move{from{transform:translateX(-100%)}to{transform:translateX(100%)}}@media(prefers-reduced-motion:reduce){.atsh-news-track{animation:none;white-space:normal;width:100%}}`}</style></div>,tickerHost)}{createPortal(
 <nav className="atsh-social-header" aria-label="ATSH AI social media">
  <span className="pending" title="YouTube — قريبًا" aria-label="YouTube — قريبًا"><svg viewBox="0 0 24 24" fill="#ff0033" aria-hidden="true"><path d="M22 7.2a2.7 2.7 0 0 0-1.9-1.9C18.4 4.9 12 4.9 12 4.9s-6.4 0-8.1.4A2.7 2.7 0 0 0 2 7.2a28 28 0 0 0 0 9.6 2.7 2.7 0 0 0 1.9 1.9c1.7.4 8.1.4 8.1.4s6.4 0 8.1-.4a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 0-9.6ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></span>
  <a href="https://www.facebook.com/profile.php?id=61587637301618" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="#1877f2" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.7-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/></svg></a>
  <span className="pending" title="Instagram — قريبًا" aria-label="Instagram — قريبًا"><svg viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#e1306c" stroke="none"/></svg></span>
 </nav>,host)}</>;
}
