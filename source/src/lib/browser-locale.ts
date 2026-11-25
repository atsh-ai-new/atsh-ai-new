export type BrowserLocale="ar"|"en";
export const LOCALE_COOKIE="atsh_locale";
// The primary browser preference wins; unsupported languages use English.
export function selectBrowserLocale(cookie:string|undefined,acceptLanguage:string|null):BrowserLocale {
 if(cookie==="ar"||cookie==="en")return cookie;
 const preferences=(acceptLanguage??"").split(",").map((part,index)=>{
  const [tag,...params]=part.trim().split(";");
  const q=params.map(p=>p.trim()).find(p=>p.startsWith("q="));
  const weight=q===undefined?1:Number(q.slice(2));
  return {tag:tag.toLowerCase(),weight,index};
 }).filter(p=>p.tag&&Number.isFinite(p.weight)&&p.weight>0&&p.weight<=1).sort((a,b)=>b.weight-a.weight||a.index-b.index);
 return preferences[0]?.tag.split("-")[0]==="ar"?"ar":"en";
}
