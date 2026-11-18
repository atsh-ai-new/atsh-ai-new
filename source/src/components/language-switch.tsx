"use client";
import {usePathname} from "next/navigation";
export default function LanguageSwitch(){
 const pathname=usePathname();
 if(!pathname||pathname.startsWith("/admin")||pathname.startsWith("/api/"))return null;
 const isEn=pathname==="/en"||pathname.startsWith("/en/")||pathname==="/";
 const next=isEn?(pathname==="/en"||pathname==="/"?"/ar":pathname.slice(3)):(pathname==="/ar"?"/en":"/en"+pathname);
 return <a href={next} hrefLang={isEn?"ar":"en"} lang={isEn?"ar":"en"} aria-label={isEn?"Switch page to Arabic":"Switch page to English"} onClick={event=>{event.preventDefault();window.location.assign(next+window.location.search+window.location.hash);}} style={{position:"fixed",insetBlockStart:72,insetInlineEnd:12,zIndex:140,border:"1px solid #cbd5e1",borderRadius:99,background:"#fff",color:"#203958",padding:"6px 11px",fontSize:13,fontWeight:700,textDecoration:"none",boxShadow:"0 2px 12px #20395822",lineHeight:1.5}}>🌐 {isEn?"العربية":"English"}</a>;
}
