export type PagePreviewDraft={slug:string;locale:"ar"|"en";content:Record<string,unknown>};
const prefix="atsh-page-preview:";
export function readPagePreview(slug:string,locale:string):PagePreviewDraft|null{
 if(typeof window==="undefined")return null;
 const token=new URLSearchParams(window.location.search).get("atshPreview");
 if(!token||!/^[a-f0-9-]{36}$/.test(token))return null;
 try{
  const raw=window.sessionStorage.getItem(prefix+token);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as PagePreviewDraft;
  return parsed.slug===slug&&parsed.locale===locale&&parsed.content&&typeof parsed.content==="object"&&!Array.isArray(parsed.content)?parsed:null;
 }catch{return null;}
}
export function openPagePreview(draft:PagePreviewDraft){
 const token=crypto.randomUUID();
 window.sessionStorage.setItem(prefix+token,JSON.stringify(draft));
 const path=draft.slug==="home"?(draft.locale==="en"?"/en":"/"):`${draft.locale==="en"?"/en":""}/${encodeURIComponent(draft.slug)}`;
 const url=path+(path.includes("?")?"&":"?")+"atshPreview="+token;
 const opened=window.open(url,"_blank","noopener");
 if(!opened)window.location.assign(url);
}
