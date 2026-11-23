"use client";
import {usePathname} from "next/navigation";
export default function LanguageSwitch(){
 const pathname=usePathname();
 if(!pathname||pathname.startsWith("/api/"))return null;
 const isEn=pathname==="/en"||pathname.startsWith("/en/");
 // The root URL redirects to English; Arabic must use /ar (rewritten by proxy).
 const next=isEn?"/ar":"/en";
 return <a className="atsh-fab atsh-fab-language" href={next} hrefLang={isEn?"ar":"en"} lang={isEn?"ar":"en"} aria-label={isEn?"التحويل إلى العربية":"Switch to English"} title={isEn?"العربية":"English"}>🌐</a>;
}
