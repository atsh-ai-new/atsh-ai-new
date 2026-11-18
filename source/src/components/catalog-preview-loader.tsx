"use client";
import { useEffect, useState } from "react";
import { findSector, interactiveDemoSlug, type SectorTemplate } from "@/lib/sector-catalog";
import SectorPreview from "@/components/sector-preview";
import Link from "next/link";
type Item=SectorTemplate & {published?:boolean;archived?:boolean;previewUrl?:string;demoSlug?:string};
export default function CatalogPreviewLoader({slug}:{slug:string}) {
 const [item,setItem]=useState<Item|undefined>(undefined);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
   let active=true;
   fetch("/api/site-content/catalog",{cache:"no-store"}).then(async r=>r.ok?r.json():null).then(data=>{
     if(!active)return;
     const list=data?.page?.content?.items;
     const entry=Array.isArray(list)?list.find((x:Item)=>x?.slug===slug):undefined;
     // Fail closed when a page or catalog entry is unpublished/unavailable.
     // Do not expose an old local fallback after an admin has hidden a demo.
     setItem(entry&&entry.published!==false&&!entry.archived?entry:undefined);
   }).catch(()=>{if(active)setItem(undefined)}).finally(()=>{if(active)setReady(true)});
   return()=>{active=false};
 },[slug]);
 if(!ready&&!item)return <main dir="rtl" style={{padding:30}}>جارٍ تحميل المعاينة…</main>;
 if(!item)return <main dir="rtl" style={{padding:30}}><h1>الكتالوج غير متاح</h1><Link href="/catalog">العودة إلى المعرض</Link></main>;
 // A persisted catalog entry can contain an older, shortened module list.
 // Keep every operational tab of the built-in interactive demos, then append
 // admin-defined extra sections without overwriting the CMS entry or its pricing.
 const builtIn=findSector(interactiveDemoSlug(item.slug,item.demoSlug)??item.slug);
 const modules=[...new Set([...(builtIn?.modules??[]),...(Array.isArray(item.modules)?item.modules:[])].filter((value):value is string=>typeof value==="string"&&value.trim().length>0))];
 return <>
  {item.previewUrl?.startsWith("https://")&&<div dir="rtl" style={{maxWidth:1280,margin:"12px auto 0",padding:"12px 18px",background:"#eef6ff",border:"1px solid #d6e4f4",borderRadius:12}}>
    <strong>نسخة تفاعلية إضافية منشورة لهذا الكتالوج</strong>
    <a href={item.previewUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginInlineStart:14,color:"#174e83",fontWeight:700,textDecoration:"underline"}}>افتح النسخة الخارجية ↗</a>
    <small style={{display:"block",color:"#64748b",marginTop:5}}>الرابط يُدار من لوحة التحكم وقد يفتح موقعًا خارجيًا مستقلًا عن ATSH AI.</small>
  </div>}
  <SectorPreview template={{...item,modules:modules.length?modules:["لوحة القيادة"],sampleRows:item.sampleRows??[],sampleStats:item.sampleStats??[]}} />
 </>;
}
