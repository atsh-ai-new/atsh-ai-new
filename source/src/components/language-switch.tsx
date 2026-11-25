"use client";
import {usePathname} from "next/navigation";
import {LOCALE_COOKIE} from "@/lib/browser-locale";
export default function LanguageSwitch(){
 const pathname=usePathname();
 if(!pathname||pathname.startsWith("/api/"))return null;
 const isEn=pathname==="/en"||pathname.startsWith("/en/");
 // Explicit home routes avoid renegotiating the selected language.
 const current=isEn?pathname.slice(3):pathname;
 const next=isEn?(!current||current==="/"?"/ar":current):pathname==="/"||pathname==="/ar"||pathname==="/ar/"?"/en":"/en"+pathname;
 return <a className="atsh-fab atsh-fab-language" href={next} onClick={event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();document.cookie=LOCALE_COOKIE+"="+(isEn?"ar":"en")+"; Path=/; Max-Age=31536000; SameSite=Lax"+(window.location.protocol==="https:"?"; Secure":"");window.dispatchEvent(new Event('atsh-language-switch'));window.location.assign(next+window.location.search+window.location.hash);}} hrefLang={isEn?"ar":"en"} lang={isEn?"ar":"en"} aria-label={isEn?"التحويل إلى العربية":"Switch to English"} title={isEn?"العربية":"English"}>🌐</a>;
}
