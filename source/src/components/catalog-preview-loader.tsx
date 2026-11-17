"use client";
import { useEffect, useState } from "react";
import { findSector, type SectorTemplate } from "@/lib/sector-catalog";
import SectorPreview from "@/components/sector-preview";
import Link from "next/link";
type Item=SectorTemplate & {published?:boolean;archived?:boolean;previewUrl?:string};
export default function CatalogPreviewLoader({slug}:{slug:string}) {
 const [item,setItem]=useState<Item|undefined>(findSector(slug));
 const [ready,setReady]=useState(false);
 useEffect(()=>{
   let active=true;
   fetch("/api/site-content/catalog",{cache:"no-store"}).then(async r=>r.ok?r.json():null).then(data=>{
     if(!active)return;
     const list=data?.page?.content?.items;
     if(Array.isArray(list)){
       const entry=list.find((x:Item)=>x?.slug===slug);
       if(entry)setItem(entry.published===false||entry.archived?undefined:entry);
     }
   }).catch(()=>{}).finally(()=>{if(active)setReady(true)});
   return()=>{active=false};
 },[slug]);
 if(!ready&&!item)return <main dir="rtl" style={{padding:30}}>جارٍ تحميل المعاينة…</main>;
 if(!item)return <main dir="rtl" style={{padding:30}}><h1>الكتالوج غير متاح</h1><Link href="/catalog">العودة إلى المعرض</Link></main>;
 return <SectorPreview template={{...item,modules:item.modules?.length?item.modules:["لوحة القيادة"],sampleRows:item.sampleRows??[],sampleStats:item.sampleStats??[]}} />;
}
