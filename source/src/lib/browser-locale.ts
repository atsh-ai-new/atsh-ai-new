export type BrowserLocale="ar"|"en";
export const LOCALE_COOKIE="atsh_locale";
export const LOCALE_DEVICE_COOKIE="atsh_locale_device";
export function primaryBrowserLanguage(tag:string|undefined):string {
 return tag?.trim().toLowerCase().split("-")[0].match(/^[a-z]{2,8}$/)?.[0]??"en";
}
// The primary browser preference wins; unsupported languages use English.
export function selectBrowserLocale(cookie:string|undefined,acceptLanguage:string|null,deviceCookie?:string):BrowserLocale {
 const preferences=(acceptLanguage??"").split(",").map((part,index)=>{
  const [tag,...params]=part.trim().split(";");
  const q=params.map(p=>p.trim()).find(p=>p.startsWith("q="));
  const weight=q===undefined?1:Number(q.slice(2));
  return {tag:tag.toLowerCase(),weight,index};
 }).filter(p=>p.tag&&Number.isFinite(p.weight)&&p.weight>0&&p.weight<=1).sort((a,b)=>b.weight-a.weight||a.index-b.index);
 const device=primaryBrowserLanguage(preferences[0]?.tag);
 // A manual choice applies only to the device language it was made under.
 // Old unbound cookies must not override automatic language detection.
 if((cookie==="ar"||cookie==="en")&&deviceCookie===device)return cookie;
 return device==="ar"?"ar":"en";
}
