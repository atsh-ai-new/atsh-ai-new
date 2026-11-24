"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {sectorTemplates,type SectorTemplate} from "@/lib/sector-catalog";
import {normalizeCatalogSectors,resolvePlacement,type CatalogSector} from "@/lib/catalog-sectors";
import {loadGuestWorkspace,saveGuestWorkspace} from "@/lib/customer-workspace";
import CatalogCardPreview from "@/components/catalog-card-preview";
import {englishCatalogSectors,englishTemplateLabel,englishTemplateFeatures} from "@/lib/sector-en";
import {isInteractiveSector} from "@/components/sector-interactive-demo";
type Item=SectorTemplate&{published?:boolean;archived?:boolean;sortOrder?:number;imageUrl?:string;previewUrl?:string;sectorId?:string;subcategoryId?:string;basePrice?:number|null};
const defaults:Item[]=sectorTemplates.map((s,i)=>({...s,published:true,sortOrder:i*10}));
export default function CatalogPage({locale="ar"}:{locale?:"ar"|"en"}){const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
 const [items,setItems]=useState<Item[]>(defaults);
 const [sectors,setSectors]=useState<CatalogSector[]>(locale==="en"?englishCatalogSectors(normalizeCatalogSectors(undefined)):normalizeCatalogSectors(undefined));
 const [query,setQuery]=useState("");
 const [sectorId,setSectorId]=useState("all");
 const [subId,setSubId]=useState("all");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  fetch("/api/site-content/catalog",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error();const arabic=await r.json();if(!en)return {data:arabic,english:null};const english=await fetch("/api/site-content/catalog?locale=en",{cache:"no-store"}).then(async x=>x.ok?x.json():null).catch(()=>null);return {data:arabic,english};}).then(({data,english})=>{
   if(!active||!data?.page||!Array.isArray(data.page.content?.items))return;
   const englishBySlug=new Map<string,Partial<Item>>((Array.isArray(english?.page?.content?.items)?english.page.content.items:[]).filter((x:Item)=>x&&typeof x.slug==="string").map((x:Item)=>[x.slug,x]));
   setItems(data.page.content.items.filter((x:Item)=>x&&typeof x.slug==="string"&&typeof x.name==="string"&&x.published!==false&&!x.archived).map((x:Item)=>en?{...x,name:englishBySlug.get(x.slug)?.name||englishTemplateLabel(x.slug,x.slug),description:englishBySlug.get(x.slug)?.description||englishTemplateLabel(x.slug,"A configurable business system. Request a detailed scope review.","description"),features:englishBySlug.get(x.slug)?.features||englishTemplateFeatures(x.slug,[])}:x));
   setSectors(en?(english?.page?.content?.sectors?normalizeCatalogSectors(english.page.content.sectors):englishCatalogSectors(normalizeCatalogSectors(data.page.content.sectors))):normalizeCatalogSectors(data.page.content.sectors));
  }).catch(()=>{if(active)setNotice(t("نعرض النماذج الافتراضية إلى حين تفعيل النظام المخصص المتصل.","Showing example solutions until the live catalog is available."));});
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  const requested=new URLSearchParams(window.location.search).get("sector");
  if(requested&&sectors.some(s=>s.id===requested&&s.isPublished)){setSectorId(requested);setSubId("all")}
 },[sectors]);
 const published=[...sectors].filter(s=>s.isPublished).sort((a,b)=>a.sortOrder-b.sortOrder);
 const activeSector=published.find(s=>s.id===sectorId);
 const visible=items.filter(item=>{
  const place=resolvePlacement(item,sectors);
  if(!place.sector?.isPublished||place.subcategory?.isPublished===false)return false;
  if(sectorId!=="all"&&place.sector.id!==sectorId)return false;
  if(subId!=="all"&&place.subcategory?.id!==subId)return false;
  return [item.name,item.category,item.description,place.sector.name,place.subcategory?.name,...(item.features??[])].join(" ").toLocaleLowerCase("ar").includes(query.trim().toLocaleLowerCase("ar"));
 }).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
 const groups=published.filter(s=>sectorId==="all"||sectorId===s.id).map(sector=>({sector,records:visible.filter(i=>resolvePlacement(i,sectors).sector?.id===sector.id)})).filter(g=>g.records.length);
 const choose=(item:Item)=>{const prior=loadGuestWorkspace();saveGuestWorkspace({sectorSlug:item.slug,sectorName:item.name,sectorAddonCodes:prior.sectorSlug===item.slug?prior.sectorAddonCodes??[]:[],source:"catalog"});};
 return <main lang={locale} dir={en?"ltr":"rtl"} style={{maxWidth:1160,margin:"auto",padding:"22px 18px 70px",minHeight:"100vh"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"center"}}>
   <Link href={en?"/en":"/"} style={{fontWeight:800,color:"#203958"}}>ATSH AI</Link><Link href={`${base}/start`} style={{color:"#203958",fontWeight:700}}>{t("ابدأ مشروعك","Start a project")}</Link>
   <Link href={`${base}/#configurator`} style={{border:"1px solid #ccd1d6",padding:"10px 15px",borderRadius:10}}>{t("الباقات ومحرك التسعير","Packages & pricing")}</Link>
  </header>
  <section style={{padding:"24px 0 16px"}}>
   <p style={{color:"#4c78ae",fontWeight:700}}>{t("أنظمة مخصصة ATSH AI","ATSH AI solution catalog")}</p>
   <h1 style={{fontSize:"clamp(29px,4vw,49px)",color:"#203958",margin:"8px 0"}}>{t("لا تكيّف أعمالك مع نظام جاهز، بل امتلك نظامًا يتكيف مع أعمالك.","Don’t adapt your business to ready-made software. Get a system that adapts to your business.")}</h1>
   <p style={{lineHeight:1.9,maxWidth:730,color:"#64748b"}}>{t("قطاعات رئيسية، وتخصصات فرعية، ونماذج تفاعلية. اختر النظام المناسب، ثم أضف مواصفاتك واحسب السعر.","Browse sectors, explore interactive demos and customize a solution before requesting a quote.")}</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,145px),1fr))",gap:8,margin:"14px 0"}}>{[t("برمجة خاصة","Custom software"),t("تحكم متكامل","Integrated control"),t("قابلية التوسع","Scalability"),t("هوية مستقلة","Distinct identity"),t("تكامل ذكي","Smart integration"),t("أسعار تنافسية","Competitive pricing")].map(label=><span key={label} style={{fontSize:13,fontWeight:600,color:"#203958"}}>✓ {label}</span>)}</div>
   {notice&&<small role="status" style={{color:"#99660b"}}>{notice}</small>}
  </section>
  <nav aria-label={t("القطاعات الرئيسية","Industry sectors")} style={{display:"flex",gap:9,overflowX:"auto",padding:"0 0 14px",marginBottom:14}}>
   <button type="button" aria-pressed={sectorId==="all"} onClick={()=>{setSectorId("all");setSubId("all");}} style={{flexShrink:0,border:"1px solid #ccd6e1",borderRadius:12,padding:"11px 15px",background:sectorId==="all"?"#203958":"white",color:sectorId==="all"?"white":"#203958",cursor:"pointer"}}>{t("كل القطاعات","All sectors")}</button>
   {published.map(sector=><button key={sector.id} type="button" aria-pressed={sectorId===sector.id} onClick={()=>{setSectorId(sector.id);setSubId("all");}} style={{flexShrink:0,border:"1px solid #ccd6e1",borderRadius:12,padding:"11px 15px",background:sectorId===sector.id?"#203958":"white",color:sectorId===sector.id?"white":"#203958",cursor:"pointer"}}>{sector.icon} {sector.name}</button>)}
  </nav>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
   <input type="search" aria-label={t("البحث في الأنظمة المخصصة","Search catalog")} value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("ابحث باسم النظام أو الميزة...","Search solutions or features...")} style={{flex:"2 1 220px",minWidth:0,padding:12,border:"1px solid #cbd5e1",borderRadius:10}}/>
   {activeSector&&<select value={subId} aria-label={t("التصنيف الفرعي","Subcategory")} onChange={e=>setSubId(e.target.value)} style={{flex:"1 1 180px",padding:12,border:"1px solid #cbd5e1",borderRadius:10}}>
    <option value="all">{t("كل التخصصات","All specialties")}</option>
    {activeSector.subcategories.filter(c=>c.isPublished).sort((a,b)=>a.sortOrder-b.sortOrder).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
   </select>}
   <small style={{alignSelf:"center",color:"#64748b"}}>{visible.length} {t("نموذج","solutions")}</small>
  </div>
  {visible.length===0&&<p role="status">{t("لا توجد نماذج مطابقة. جرّب اختيار قطاع آخر.","No matching solutions. Try a different category.")}</p>}
  {groups.map(({sector,records})=><section key={sector.id} style={{margin:"26px 0 36px"}} aria-labelledby={`sector-${sector.id}`}>
   <h2 id={`sector-${sector.id}`} style={{fontSize:"clamp(22px,3vw,30px)",color:"#203958",margin:"0 0 7px"}}>{sector.icon} {sector.name}</h2>
   <p style={{color:"#64748b",lineHeight:1.7}}>{sector.description}</p>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"0 0 15px"}}>
    {sector.subcategories.filter(c=>c.isPublished&&records.some(i=>resolvePlacement(i,sectors).subcategory?.id===c.id)).sort((a,b)=>a.sortOrder-b.sortOrder).map(c=><span key={c.id} style={{padding:"6px 11px",borderRadius:99,background:"#e9f0f8",color:"#203958",fontSize:12}}>{c.name}</span>)}
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,245px),1fr))",gap:15}}>
    {records.map(item=>{const place=resolvePlacement(item,sectors);return <article key={item.slug} style={{background:"white",padding:12,borderRadius:16,border:"1px solid #e2e8f0",display:"flex",flexDirection:"column",gap:10,minWidth:0}}>
     <div style={{position:"relative",height:360,border:"1px solid #dce4ed",borderRadius:12,overflow:"hidden",background:"#f8fafc"}}>
      <iframe title={t("معاينة تفاعلية: ","Interactive preview: ")+item.name} src={`${base}/catalog/${encodeURIComponent(item.slug)}?embedded=1`} loading="lazy" style={{width:"100%",height:"100%",border:0,background:"white"}} allowFullScreen />
     </div>
     <h3 style={{margin:"2px 0",color:"#203958"}}>{en?englishTemplateLabel(item.slug,item.name):item.name}</h3>
     <Link onClick={()=>choose(item)} href={`${base}/catalog/${encodeURIComponent(item.slug)}?fullscreen=1`} style={{padding:"11px 12px",background:"#203958",color:"white",textAlign:"center",borderRadius:9,fontWeight:700}}>{t("جرّب النظام بملء الشاشة ←","Try full-screen demo →")}</Link>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",borderTop:"1px solid #e2e8f0",paddingTop:12}}>
      <span style={{fontWeight:800,color:"#203958"}}>{typeof item.basePrice==="number"&&Number.isFinite(item.basePrice)&&item.basePrice>=0? t("السعر الأساسي: ","Base price: ")+item.basePrice.toLocaleString(en?"en-EG":"ar-EG")+t(" ج.م"," EGP"):t("السعر يُحدد من لوحة الإدارة","Price pending admin setup")}</span>
      <Link onClick={()=>choose(item)} href={`${base}/catalog/${encodeURIComponent(item.slug)}/pricing`} style={{fontSize:13,color:"#203958",textDecoration:"underline",fontWeight:700}}>{t("أضف المواصفات واحسب الإجمالي ←","Add options & calculate total →")}</Link>
     </div>
     {item.previewUrl?.startsWith("https://")&&<a href={item.previewUrl} target="_blank" rel="noopener noreferrer" style={{textAlign:"center",fontSize:13,color:"#1e749b"}}>{t("افتح نسخة تجريبية منشورة خارجيًا ↗","Open external demo ↗")}</a>}
    </article>})}
   </div>
  </section>)}
 </main>;
}
