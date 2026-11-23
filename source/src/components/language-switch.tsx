"use client";
import {usePathname} from "next/navigation";
export default function LanguageSwitch(){
 const pathname=usePathname();
 if(!pathname||pathname.startsWith("/api/"))return null;
 const isEn=pathname==="/en"||pathname.startsWith("/en/");
 const next=pathname.startsWith("/admin")?"/en":isEn?(pathname==="/en"?"/":pathname.slice(3)):(pathname==="/"?"/en":"/en"+pathname);
 return <a className="atsh-fab atsh-fab-language" href={next} hrefLang={isEn?"ar":"en"} lang={isEn?"ar":"en"} aria-label={isEn?"التحويل إلى العربية":"Switch to English"} title={isEn?"العربية":"English"} onClick={event=>{event.preventDefault();window.location.assign(next+window.location.search+window.location.hash);}}>🌐</a>;
}
