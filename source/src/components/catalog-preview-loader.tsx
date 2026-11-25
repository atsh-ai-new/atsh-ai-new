"use client";
import { useEffect, useState } from "react";
import { findSector, interactiveDemoSlug, type SectorTemplate } from "@/lib/sector-catalog";
import SectorPreview from "@/components/sector-preview";
import Link from "next/link";
import {englishTemplateLabel} from "@/lib/sector-en";
import { readPagePreview } from "@/lib/page-preview";
type Item=SectorTemplate & {published?:boolean;archived?:boolean;previewUrl?:string;previewHtml?:string;hasPreviewHtml?:boolean;demoSlug?:string;pricedAddons?:Array<{code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"}>;basePrice?:number|null};
export default function CatalogPreviewLoader({slug,locale="ar"}:{slug:string;locale?:"ar"|"en"}) {const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
 const [item,setItem]=useState<Item|undefined>(undefined);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
   let active=true;
   const preview=readPagePreview("catalog",locale);
   const previewItem=(preview?.content?.items as Item[]|undefined)?.find(x=>x.slug===slug);
   if(previewItem){setItem(previewItem);setReady(true);return()=>{active=false};}
   const fromHome=new URLSearchParams(window.location.search).get("featuredHome")==="1";
   Promise.all([fetch("/api/site-content/catalog?metadata=1",{cache:"no-store"}).then(async r=>r.ok?r.json():null),fromHome?fetch("/api/site-content/home?locale=ar&metadata=1",{cache:"no-store"}).then(async r=>r.ok?r.json():null):Promise.resolve(null)]).then(async ([data,home])=>{
     if(!active)return;
     const list=data?.page?.content?.items;
     const entry=Array.isArray(list)?list.find((x:Item)=>x?.slug===slug):undefined;
     // Fail closed when a page or catalog entry is unpublished/unavailable.
     // Do not expose an old local fallback after an admin has hidden a demo.
     const config=home?.page?.content;const chosen=Array.isArray(config?.featuredSystemSlugs)?config.featuredSystemSlugs.includes(slug):Array.isArray(list)&&list.filter((x:Item)=>x?.published!==false&&!x?.archived).slice(0,4).some((x:Item)=>x.slug===slug);const available=fromHome?chosen&&config?.featuredSystemHtml?.[slug]?.available:entry?.hasPreviewHtml;
     let html:string|undefined;
     if(available){const response=await fetch("/api/site-content/"+(fromHome?"home":"catalog")+"?demo="+encodeURIComponent(slug),{cache:"no-store"});if(!response.ok)throw Error("Demo unavailable");const result=await response.json();if(typeof result.html!=="string")throw Error("Invalid demo");html=result.html;}
     if(!active)return;
     setItem(entry&&entry.published!==false&&!entry.archived?{...entry,previewHtml:html}:undefined);
   }).catch(()=>{if(active)setItem(undefined)}).finally(()=>{if(active)setReady(true)});
   return()=>{active=false};
 },[slug,locale]);
 if(!ready&&!item)return <main lang={locale} dir={en?"ltr":"rtl"} style={{padding:30}}>{t("جارٍ تحميل المعاينة…","Loading interactive demo…")}</main>;
 if(!item)return <main lang={locale} dir={en?"ltr":"rtl"} style={{padding:30}}><h1>{t("النظام المخصص غير متاح","Demo unavailable")}</h1><Link href={`${base}/catalog`}>{t("العودة إلى المعرض","Back to catalog")}</Link></main>;
 // A persisted catalog entry can contain an older, shortened module list.
 // Keep every operational tab of the built-in interactive demos, then append
 // admin-defined extra sections without overwriting the CMS entry or its pricing.
 const builtIn=findSector(interactiveDemoSlug(item.slug,item.demoSlug)??item.slug);
 const modules=[...new Set([...(builtIn?.modules??[]),...(Array.isArray(item.modules)?item.modules:[])].filter((value):value is string=>typeof value==="string"&&value.trim().length>0))];
 return <>
  {item.previewUrl?.startsWith("https://")&&<div dir={en?"ltr":"rtl"} style={{maxWidth:1280,margin:"12px auto 0",padding:"12px 18px",background:"#eef6ff",border:"1px solid #d6e4f4",borderRadius:12}}>
    <strong>{t("نسخة تفاعلية إضافية منشورة لهذا النظام المخصص","An additional interactive demo is available")}</strong>
    <a href={item.previewUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginInlineStart:14,color:"#174e83",fontWeight:700,textDecoration:"underline"}}>{t("افتح النسخة الخارجية ↗","Open external demo ↗")}</a>
    <small style={{display:"block",color:"#64748b",marginTop:5}}>{t("الرابط يُدار من لوحة التحكم وقد يفتح موقعًا خارجيًا مستقلًا عن ATSH AI.","The linked demo is managed by ATSH AI and may open an external website.")}</small>
  </div>}
  <SectorPreview key={item.slug} previewHtml={item.previewHtml} locale={locale} template={{...item,modules:modules.length?modules:["لوحة القيادة"],sampleRows:item.sampleRows??[],sampleStats:item.sampleStats??[]}} demoSlug={interactiveDemoSlug(item.slug,item.demoSlug)} pricedAddons={item.pricedAddons??[]} basePrice={item.basePrice??null} />
 </>;
}
