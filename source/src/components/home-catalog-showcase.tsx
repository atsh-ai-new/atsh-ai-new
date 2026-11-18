"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {normalizeCatalogSectors,resolvePlacement,type CatalogSector} from "@/lib/catalog-sectors";
import CatalogCardPreview from "@/components/catalog-card-preview";
import type {SectorTemplate} from "@/lib/sector-catalog";

type PricedAddon={code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"};
export type HomeCatalogItem=SectorTemplate&{
 published?:boolean;archived?:boolean;sortOrder?:number;imageUrl?:string;demoSlug?:string;
 sectorId?:string;subcategoryId?:string;basePrice?:number|null;pricedAddons?:PricedAddon[];
};
type Props={
 selectedSlug?:string;
 selectedAddons:string[];
 onSelect:(item:HomeCatalogItem)=>void;
 onToggleAddon:(code:string,checked:boolean)=>void;
};
const safeImage=(url?:string)=>Boolean(url&&(/^(\/api\/site-media\/[0-9a-f-]{36})/i.test(url)||/^https:\/\//i.test(url)));
const money=(amount:number)=>`${amount.toLocaleString("ar-EG",{maximumFractionDigits:2})} ج.م`;

export default function HomeCatalogShowcase({selectedSlug,selectedAddons,onSelect,onToggleAddon}:Props){
 const [items,setItems]=useState<HomeCatalogItem[]>([]);
 const [sectors,setSectors]=useState<CatalogSector[]>([]);
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 const [activeSector,setActiveSector]=useState("all");
 const [activeSub,setActiveSub]=useState("all");
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/site-content/catalog",{signal:controller.signal,cache:"no-store"})
   .then(async response=>{if(!response.ok)throw Error();return response.json()})
   .then(data=>{
    const content=data?.page?.content;
    if(!Array.isArray(content?.items))throw Error("missing catalog");
    setItems(content.items.filter((item:HomeCatalogItem)=>item&&typeof item.slug==="string"&&typeof item.name==="string"&&item.published!==false&&!item.archived));
    setSectors(normalizeCatalogSectors(content.sectors));
   })
   .catch(error=>{if(error?.name!=="AbortError")setNotice("تعذر تحميل الكتالوج المنشور حاليًا. يمكنك فتح معرض النماذج كاملًا.")})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[]);
 const published=useMemo(()=>sectors.filter(s=>s.isPublished).sort((a,b)=>a.sortOrder-b.sortOrder),[sectors]);
 const active=published.find(s=>s.id===activeSector);
 const visible=items.filter(item=>{
  const place=resolvePlacement(item,sectors);
  return place.sector?.isPublished&&place.subcategory?.isPublished!==false
   &&(activeSector==="all"||place.sector.id===activeSector)
   &&(activeSub==="all"||place.subcategory?.id===activeSub);
 }).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
 const displayed=expanded?visible:visible.slice(0,6);
 const selected=items.find(x=>x.slug===selectedSlug);
 const selectedPlace=selected?resolvePlacement(selected,sectors):null;
 const choose=(item:HomeCatalogItem)=>{onSelect(item)};
 return <div className="home-catalog-showcase" aria-label="الكتالوجات والتطبيقات المتاحة" style={{marginTop:34}}>
  <style>{`
    .hc-filter{display:flex;gap:9px;overflow-x:auto;padding:7px 1px 13px}.hc-filter button{flex-shrink:0;border:1px solid #d7e0eb;background:white;border-radius:10px;padding:10px 13px;color:#203958;cursor:pointer;font:inherit}.hc-filter button[aria-pressed=true]{background:#203958;color:white;border-color:#203958}
    .hc-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:15px 0}
    .hc-card{display:flex;flex-direction:column;gap:9px;min-width:0;border-radius:16px;border:1px solid #dfe6ef;background:white;padding:16px}
    .hc-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:auto}.hc-actions a,.hc-actions button{flex:1 1 140px;text-align:center;border:1px solid #203958;border-radius:10px;padding:10px 12px;font:inherit;font-weight:700;text-decoration:none;background:white;color:#203958;cursor:pointer}.hc-actions button{background:#203958;color:white}
    .hc-active{background:#eff5fc;border:1px solid #b7d0e7;border-radius:16px;padding:16px;margin-top:13px}
    .hc-active label{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #d9e5f0;flex-wrap:wrap}
    @media(max-width:850px){.hc-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:560px){.hc-cards{grid-template-columns:1fr}.hc-card{padding:13px}.hc-actions a,.hc-actions button{flex-basis:110px}.hc-active{padding:13px}}
  `}</style>
  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
   <div><span className="section-kicker">باقاتنا ونماذج الأعمال</span><h3 style={{fontSize:"clamp(23px,3vw,31px)",margin:"6px 0",color:"#203958"}}>اختر نظامًا جاهزًا وجرّبه قبل الطلب</h3><p style={{margin:0,color:"#61718a",lineHeight:1.8}}>قطاع ← تخصص ← نموذج تفاعلي ← تفاصيل وإضافات وتسعير. يمكن إضافة وتحديث النماذج من لوحة الإدارة.</p></div>
   <Link href="/catalog" style={{color:"#203958",fontWeight:800,textDecoration:"underline",whiteSpace:"nowrap"}}>جميع القطاعات والكتالوجات ←</Link>
  </div>
  {loading?<p role="status">جارٍ تحميل الأنظمة المنشورة…</p>:notice?<p role="status">{notice}</p>:<>
   <nav aria-label="فلترة الكتالوجات الرئيسية" className="hc-filter">
    <button type="button" aria-pressed={activeSector==="all"} onClick={()=>{setActiveSector("all");setActiveSub("all");setExpanded(false)}}>كل القطاعات ({visible.length})</button>
    {published.map(s=><button type="button" key={s.id} aria-pressed={activeSector===s.id} onClick={()=>{setActiveSector(s.id);setActiveSub("all");setExpanded(false)}}>{s.icon} {s.name}</button>)}
   </nav>
   {active&&<nav aria-label="التخصصات الفرعية" className="hc-filter" style={{paddingTop:0}}>
    <button type="button" aria-pressed={activeSub==="all"} onClick={()=>setActiveSub("all")}>كل تخصصات {active.name}</button>
    {active.subcategories.filter(c=>c.isPublished).map(c=><button type="button" key={c.id} aria-pressed={activeSub===c.id} onClick={()=>{setActiveSub(c.id);setExpanded(false)}}>{c.name}</button>)}
   </nav>}
   {!visible.length&&<p role="status">لا توجد نماذج منشورة في هذا التخصص. اختر قطاعًا آخر.</p>}
   <div className="hc-cards">{displayed.map(item=>{
    const place=resolvePlacement(item,sectors);
    const addons=Array.isArray(item.pricedAddons)?item.pricedAddons:[];
    const price=typeof item.basePrice==="number"&&Number.isFinite(item.basePrice)&&item.basePrice>=0?item.basePrice:null;
    return <article className="hc-card" key={item.slug} aria-label={item.name}>
     {safeImage(item.imageUrl)?<img src={item.imageUrl} alt={`صورة توضيحية: ${item.name}`} loading="lazy" style={{width:"100%",height:135,objectFit:"cover",borderRadius:11}}/>:<div style={{height:135,overflow:"hidden",borderRadius:11}}><CatalogCardPreview slug={item.slug} name={item.name}/></div>}
     <small style={{color:"#3d6897",fontWeight:700}}>{place.sector?.name} / {place.subcategory?.name||"عام"}</small>
     <h4 style={{margin:0,color:"#203958",fontSize:20}}>{item.icon} {item.name}</h4>
     <p style={{margin:0,color:"#66788b",lineHeight:1.7,flex:1}}>{item.description}</p>
     <p style={{margin:0,fontSize:13,color:"#66788b"}}>{(item.features||[]).slice(0,3).join(" · ")}</p>
     <small style={{fontWeight:800,color:"#203958"}}>{price===null?"التكلفة وفق عرض سعر مخصص":`من ${money(price)} قبل الإضافات والضرائب`}{addons.length?` · ${addons.length} إضافات`:""}</small>
     <div className="hc-actions"><Link href={`/catalog/${encodeURIComponent(item.slug)}`}>جرّب النموذج ↗</Link><button type="button" onClick={()=>choose(item)}>اختيار وإضافة تفاصيل ←</button></div>
    </article>;
   })}</div>
   {visible.length>6&&<button type="button" onClick={()=>setExpanded(x=>!x)} style={{padding:"11px 16px",border:"1px solid #cedaea",background:"white",borderRadius:11,color:"#203958",cursor:"pointer"}}>{expanded?"عرض مختصر":`عرض باقي النماذج (${visible.length-6})`}</button>}
   <div style={{marginTop:12}}><Link href={activeSector==="all"?"/catalog":`/catalog?sector=${encodeURIComponent(activeSector)}`} style={{color:"#203958",textDecoration:"underline",fontWeight:800}}>الانتقال لمعرض {active?.name||"القطاعات"} بجميع التفاصيل والمعاينات ←</Link></div>
   {selected&&selectedPlace?.sector?.isPublished&&selectedPlace?.subcategory?.isPublished!==false&&<section className="hc-active" aria-label="إضافات النموذج المختار">
     <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"center"}}><div><h4 style={{margin:"0 0 6px"}}>تخصيص {selected.name}</h4><small>اختيارات الإضافات هنا تنتقل إلى محرك السعر الرسمي أدناه. لا تُعد الأسعار ظاهرة كفاتورة أو طلب شراء.</small></div><Link href={`/catalog/${encodeURIComponent(selected.slug)}`} style={{color:"#203958",fontWeight:700}}>شرح ومشاهدة النموذج الكامل ↗</Link></div>
     {(selected.pricedAddons||[]).length?selected.pricedAddons?.map(addon=><label key={addon.code}>
       <input type="checkbox" checked={selectedAddons.includes(addon.code)} onChange={e=>onToggleAddon(addon.code,e.target.checked)} />
       <span style={{flex:"1 1 130px"}}>{addon.name}</span><b>{money(addon.price)} {addon.pricingType==="monthly"?"/ شهري":addon.pricingType==="yearly"?"/ سنوي":"مرة واحدة"}</b>
      </label>):<p>يمكن تخصيص هذه الخدمة من معالج الطلب. لا توجد إضافات قطاعية مسعّرة منشورة حتى الآن.</p>}
     <a href="#configurator" style={{display:"inline-block",marginTop:12,padding:"11px 16px",background:"#203958",color:"white",borderRadius:10,textDecoration:"none"}}>استكمال المواصفات وعرض السعر الفعلي ←</a>
   </section>}
  </>}
 </div>;
}
