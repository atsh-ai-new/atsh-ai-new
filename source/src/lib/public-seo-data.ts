import { notFound } from "next/navigation";
import { cache } from "react";
import { normalizeCatalogSectors, resolvePlacement, validCatalogId } from "./catalog-sectors";
import { englishCatalogSectors, englishTemplateFeatures, englishTemplateLabel } from "./sector-en";
import type { SectorTemplate } from "./sector-catalog";
import { cleanText, localPath, pageMetadata, publicSeoImage, noIndex, validPublicSlug, type Locale } from "./seo";
import type { OwnershipPrices } from "@/components/ownership-selector";

export type SiteConfig = { page?: { slug?:string; content?:Record<string,unknown>; updated_at?:string } | null; theme?: { navy:string;blue:string;gold:string;page:string;logoUrl?:string;heroImageUrl?:string;backgroundImageUrl?:string;fontFamily?:string;cardRadius?:number } | null; vatRate?:number };
export type PageLink = {slug:string;title:string;updatedAt?:string};
export type CatalogItem = SectorTemplate & {published?:boolean;archived?:boolean;sortOrder?:number;imageUrl?:string;previewUrl?:string;hasPreviewHtml?:boolean;previewAssetId?:string;demoSlug?:string;seoTitle?:string;seoDescription?:string;updatedAt?:string;sectorId?:string;subcategoryId?:string;basePrice?:number|null;ownershipPrices?:OwnershipPrices|null;pricedAddons?:Array<{code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"|"per_page";isRequired?:boolean}>};
function apiOrigin() {
  try {
    const url = new URL(process.env.ATSH_API_BASE_URL || "");
    if (url.protocol === "https:" || (url.protocol === "http:" && (process.env.NODE_ENV !== "production" || ["atsh-website-api","atsh-website-api-internal"].includes(url.hostname)))) return url;
  } catch {}
  return null;
}
async function publicJson<T>(path:string,timeoutMs=5000):Promise<T|null> {
  const origin=apiOrigin();
  if(!origin)return null;
  try {
    const response=await fetch(new URL(path,origin),{cache:"no-store",signal:AbortSignal.timeout(timeoutMs)});
    return response.ok?await response.json() as T:null;
  } catch {return null;}
}
export const publicMonthlyVisitorCount=cache(async()=>{
  const result=await publicJson<{monthly:number}>("/api/visitor/monthly-count",1200);
  return result&&Number.isSafeInteger(result.monthly)&&result.monthly>=0?result.monthly:undefined;
});
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
  const [ar,en]=await Promise.all([publicPage("catalog","ar"),publicPage("catalog","en")]);
  if(!ar)return null;
  const sectors=normalizeCatalogSectors(ar.page?.content?.sectors);
  const translated=new Map(itemsFrom(en).map(x=>[x.slug,x]));
  const original=itemsFrom(ar);
  const translatedSlugs=new Set(original.filter(item=>{
    const tr=translated.get(item.slug);
    const desc=cleanText(tr?.description||englishTemplateLabel(item.slug,item.description,"description"),200);
    const label=cleanText(tr?.name||englishTemplateLabel(item.slug,item.name),100);
    return [label,desc].every(value=>/[A-Za-z]/.test(value)&&!/[\u0600-\u06ff]/.test(value));
  }).map(item=>item.slug));
  const items=original.filter(x=>{if(x.slug==="commerce-engine")return false;const p=resolvePlacement(x,sectors);return p.sector?.isPublished&&p.subcategory?.isPublished!==false;}).map(x=>{
    if(locale==="ar")return x;
    const tr=translated.get(x.slug);
    return {...x,name:tr?.name||englishTemplateLabel(x.slug,x.name),category:tr?.category||englishTemplateLabel(x.slug,x.category,"category"),seoTitle:tr?.seoTitle,seoDescription:tr?.seoDescription,description:tr?.description||englishTemplateLabel(x.slug,x.description,"description"),features:tr?.features||englishTemplateFeatures(x.slug,x.features??[])};
  });
  return {items,sectors:locale==="ar"?sectors:en?.page?.content?.sectors?normalizeCatalogSectors(en.page.content.sectors):englishCatalogSectors(sectors),updatedAt:ar.page?.updated_at,translatedSlugs};
});
export const publicGallery=cache(async(locale:Locale)=>{
  const catalog=await publicCatalog(locale);
  if(!catalog)return;
  return {sectors:catalog.sectors,items:catalog.items.map(({slug,name,category,icon,description,features,sortOrder,sectorId,subcategoryId,imageUrl,previewUrl,previewAssetId,basePrice,ownershipPrices})=>({
    slug,name,category,icon,description,features,sortOrder,sectorId,subcategoryId,imageUrl,previewUrl,previewAssetId,basePrice,ownershipPrices,
    // Gallery cards do not need demo rows, module state or per-system add-on prices.
    modules:[],sampleStats:[],sampleRows:[],note:""
  }))};
});
export const publicSystem=cache(async(slug:string,locale:Locale)=>(await publicCatalog(locale))?.items.find(x=>x.slug===slug));
export async function systemMetadata(slug:string,locale:Locale,preview=false){
  if(preview)return noIndex;
  const catalog=await publicCatalog(locale);
  if(!catalog)return noIndex;
  const item=catalog.items.find(x=>x.slug===slug);
  if(!item)return notFound();
  if(locale==="en"&&!catalog.translatedSlugs.has(slug))return {...noIndex,title:item.name+" | ATSH AI"};
  const path="/catalog/"+slug;
  const title=cleanText(item.seoTitle,65)||(locale==="ar"?item.name+" – برنامج إدارة "+(item.category||"الأعمال"):item.name+" – "+(item.category||"Business management")+" software");
  const description=cleanText(item.seoDescription)||[cleanText(item.description,130),...(Array.isArray(item.features)?item.features.filter(x=>typeof x==="string"&&(locale!=="en"||!/[\u0600-\u06ff]/.test(x))).slice(0,3):[])].filter(Boolean).join(" · ");
  return pageMetadata(locale,localPath(locale,path),title,description||item.name,catalog.translatedSlugs.has(slug)?localPath(locale==="ar"?"en":"ar",path):undefined,publicSeoImage(item.imageUrl));
}
export async function managedMetadata(slug:string,locale:Locale,preview=false){
  if(preview)return noIndex;
  if(!validPublicSlug(slug))return notFound();
  const [payload,other]=await Promise.all([publicPage(slug,locale),publicPages(locale==="ar"?"en":"ar")]);
  if(!payload)return noIndex;
  if(!payload.page)return notFound();
  const content=payload.page.content;
  return pageMetadata(locale,localPath(locale,"/"+slug),cleanText(content?.seoTitle,65)||cleanText(content?.title,75)||slug,
    cleanText(content?.seoDescription)||cleanText(content?.description)||cleanText(content?.title)||slug,
    other.some(x=>x.slug===slug)?localPath(locale==="ar"?"en":"ar","/"+slug):undefined,publicSeoImage(content?.seoImageUrl));
}
