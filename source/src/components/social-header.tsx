"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

export default function SocialHeader(){
 const [host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const holder=document.createElement("div");holder.className="atsh-social-inline-slot";
  const place=()=>{
   const brand=document.querySelector<HTMLElement>(".platform-header .platform-brand, .managed-header .managed-brand, header .atsh-start-brand, header .admin-brand, header a[href=\"/\"]");
   const header=brand?.closest("header")||document.querySelector<HTMLElement>(".platform-header, .managed-header, .admin-header, .customer-header, header");
   if(!header)return;
   if(brand?.parentElement===header){if(holder.parentElement!==header||holder.previousElementSibling!==brand)brand.insertAdjacentElement("afterend",holder);}
   else if(holder.parentElement!==header)header.prepend(holder);
   if(holder.isConnected)setHost(holder);
  };
  place();const observer=new MutationObserver(()=>{if(!holder.isConnected)place();});observer.observe(document.body,{childList:true,subtree:true});
  return ()=>{observer.disconnect();holder.remove();};
 },[]);
 if(!host)return null;
 return createPortal(
 <nav className="atsh-social-header" aria-label="ATSH AI social media">
  <span className="pending" title="YouTube — قريبًا" aria-label="YouTube — قريبًا"><svg viewBox="0 0 24 24" fill="#ff0033" aria-hidden="true"><path d="M22 7.2a2.7 2.7 0 0 0-1.9-1.9C18.4 4.9 12 4.9 12 4.9s-6.4 0-8.1.4A2.7 2.7 0 0 0 2 7.2a28 28 0 0 0 0 9.6 2.7 2.7 0 0 0 1.9 1.9c1.7.4 8.1.4 8.1.4s6.4 0 8.1-.4a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 0-9.6ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></span>
  <a href="https://www.facebook.com/profile.php?id=61587637301618" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="#1877f2" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.7-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/></svg></a>
  <span className="pending" title="Instagram — قريبًا" aria-label="Instagram — قريبًا"><svg viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#e1306c" stroke="none"/></svg></span>
 </nav>,host);
}
