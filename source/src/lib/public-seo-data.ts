import { cache } from "react";
import { normalizeCatalogSectors, resolvePlacement, validCatalogId } from "./catalog-sectors";
import { englishCatalogSectors, englishTemplateFeatures, englishTemplateLabel } from "./sector-en";
import type { SectorTemplate } from "./sector-catalog";
import { cleanText, localPath, pageMetadata, noIndex, validPublicSlug, type Locale } from "./seo";
import type { OwnershipPrices } from "@/components/ownership-selector";

export type SiteConfig = { page?: { slug?:string; content?:Record<string,unknown>; updated_at?:string } | null; theme?: { navy:string;blue:string;gold:string;page:string;logoUrl?:string;heroImageUrl?:string;backgroundImageUrl?:string;fontFamily?:string;cardRadius?:number } | null; vatRate?:number };
export type PageLink = {slug:string;title:string;updatedAt?:string};
export type CatalogItem = SectorTemplate & {published?:boolean;archived?:boolean;sortOrder?:number;imageUrl?:string;previewUrl?:string;hasPreviewHtml?:boolean;previewAssetId?:string;demoSlug?:string;sectorId?:string;subcategoryId?:string;basePrice?:number|null;ownershipPrices?:OwnershipPrices|null;pricedAddons?:Array<{code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"|"per_page";isRequired?:boolean}>};
function apiOrigin() {
  try {
    const url = new URL(process.env.ATSH_API_BASE_URL || "");
    if (url.protocol === "https:" || (url.protocol === "http:" && (process.env.NODE_ENV !== "production" || ["atsh-website-api","atsh-website-api-internal"].includes(url.hostname)))) return url;
  } catch {}
  return null;
}
async function publicJson<T>(path:string):Promise<T|null> {
  const origin=apiOrigin();
  if(!origin)return null;
  try {
    const response=await fetch(new URL(path,origin),{cache:"no-store",signal:AbortSignal.timeout(5000)});
    return response.ok?await response.json() as T:null;
  } catch {return null;}
}
export const publicPage=cache((slug:string,locale:Locale)=>publicJson<SiteConfig>("/api/site-content/"+encodeURIComponent(slug)+"?metadata=1&locale="+locale));
export const publicPages=cache(async(locale:Locale)=>{
  const data=await publicJson<{pages?:PageLink[]}>("/api/site-pages?locale="+locale);
  return Array.isArray(data?.pages)?data.pages.filter(p=>p&&typeof p.slug==="string"&&validPublicSlug(p.slug)):[];
});
function itemsFrom(config:SiteConfig|null):CatalogItem[] {
  const rows=config?.page?.content?.items;
  if(!Array.isArray(rows))return [];
  return rows.filter(x=>x&&typeof x.slug==="string"&&validCatalogId(x.slug)&&typeof x.name==="string"&&x.name.trim()&&x.published!==false&&!x.archived).map(x=>{
    // Never send executable demo bodies to the browser in the page payload.
    const {previewHtml,previewHtmlName,...item}=x;
    return item as CatalogItem;
  });
}
export const publicCatalog=cache(async(locale:Locale)=>{
  const [ar,en]=await Promise.all([publicPage("catalog","ar"),locale==="en"?publicPage("catalog","en"):Promise.resolve(null)]);
  if(!ar)return null;
  const sectors=normalizeCatalogSectors(ar.page?.content?.sectors);
  const translated=new Map(itemsFrom(en).map(x=>[x.slug,x]));
  const items=itemsFrom(ar).filter(x=>{if(x.slug==="commerce-engine")return false;const p=resolvePlacement(x,sectors);return p.sector?.isPublished&&p.subcategory?.isPublished!==false;}).map(x=>{
    if(locale==="ar")return x;
    const tr=translated.get(x.slug);
    return {...x,name:tr?.name||englishTemplateLabel(x.slug,x.name),description:tr?.description||englishTemplateLabel(x.slug,x.description,"description"),features:tr?.features||englishTemplateFeatures(x.slug,x.features??[])};
  });
  return {items,sectors:locale==="ar"?sectors:en?.page?.content?.sectors?normalizeCatalogSectors(en.page.content.sectors):englishCatalogSectors(sectors),updatedAt:ar.page?.updated_at};
});
export const publicSystem=cache(async(slug:string,locale:Locale)=>(await publicCatalog(locale))?.items.find(x=>x.slug===slug));
export async function systemMetadata(slug:string,locale:Locale){
  const catalog=await publicCatalog(locale);
  const item=catalog?.items.find(x=>x.slug===slug);
  if(!item)return {...(catalog?noIndex:{}),title:locale==="ar"?"النظام المخصص | ATSH AI":"Business software | ATSH AI"};
  const path="/catalog/"+slug;
  const title=locale==="ar"?item.name+" – برنامج إدارة "+(item.category||"الأعمال"):item.name+" – Business management software";
  const description=[cleanText(item.description,130),...(Array.isArray(item.features)?item.features.slice(0,4):[])].filter(Boolean).join(" · ");
  return pageMetadata(locale,localPath(locale,path),title,description||item.name,localPath(locale==="ar"?"en":"ar",path));
}
export async function managedMetadata(slug:string,locale:Locale){
  if(!validPublicSlug(slug))return noIndex;
  const [payload,other]=await Promise.all([publicPage(slug,locale),publicPages(locale==="ar"?"en":"ar")]);
  if(!payload)return {};
  if(!payload.page)return noIndex;
  const content=payload.page.content;
  return pageMetadata(locale,localPath(locale,"/"+slug),cleanText(content?.title,75)||slug,cleanText(content?.description)||cleanText(content?.title)||slug,other.some(x=>x.slug===slug)?localPath(locale==="ar"?"en":"ar","/"+slug):undefined);
}
