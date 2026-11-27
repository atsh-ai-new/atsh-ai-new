"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {LOCALE_COOKIE,LOCALE_DEVICE_COOKIE,primaryBrowserLanguage} from "@/lib/browser-locale";
export default function LanguageSwitch(){
 const pathname=usePathname();
 const [worksTarget,setWorksTarget]=useState("/en");
 useEffect(()=>{
   if(pathname!=="/works")return;
   const update=()=>setWorksTarget(document.querySelector('link[rel="alternate"][hreflang="en"][href="https://atsh-ai.com/en/works"]')?"/en/works":"/en");
   update();
   const observer=new MutationObserver(update);
   observer.observe(document.head,{childList:true});
   return ()=>observer.disconnect();
 },[pathname]);
 if(!pathname||pathname.startsWith("/api/"))return null;
 const isEn=pathname==="/en"||pathname.startsWith("/en/");
 // Explicit home routes avoid renegotiating the selected language.
 const current=isEn?pathname.slice(3):pathname;
 const next=pathname==="/works"?worksTarget:isEn?(!current||current==="/"?"/ar":current):pathname==="/"||pathname==="/ar"||pathname==="/ar/"?"/en":"/en"+pathname;
 return <a className="atsh-fab atsh-fab-language" href={next} onClick={event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();const attributes="; Path=/; Max-Age=31536000; SameSite=Lax"+(window.location.protocol==="https:"?"; Secure":"");document.cookie=LOCALE_COOKIE+"="+(isEn?"ar":"en")+attributes;document.cookie=LOCALE_DEVICE_COOKIE+"="+primaryBrowserLanguage(navigator.languages?.[0]||navigator.language)+attributes;window.dispatchEvent(new Event('atsh-language-switch'));window.location.assign(next+window.location.search+window.location.hash);}} hrefLang={isEn?"ar":"en"} lang={isEn?"ar":"en"} aria-label={isEn?"التحويل إلى العربية":"Switch to English"} title={isEn?"العربية":"English"}>🌐</a>;
}
