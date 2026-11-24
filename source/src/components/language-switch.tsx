"use client";
import {usePathname} from "next/navigation";
export default function LanguageSwitch(){
 const pathname=usePathname();
 if(!pathname||pathname.startsWith("/api/"))return null;
 const isEn=pathname==="/en"||pathname.startsWith("/en/");
 // The root URL redirects to English; Arabic must use /ar (rewritten by proxy).
 const current=isEn?pathname.slice(3):pathname;
 const next=isEn?(!current||current==="/"?"/ar":current):pathname==="/"||pathname==="/ar"||pathname==="/ar/"?"/en":"/en"+pathname;
 return <a className="atsh-fab atsh-fab-language" href={next} onClick={event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();window.location.assign(next+window.location.search+window.location.hash);}} hrefLang={isEn?"ar":"en"} lang={isEn?"ar":"en"} aria-label={isEn?"التحويل إلى العربية":"Switch to English"} title={isEn?"العربية":"English"}>🌐</a>;
}
