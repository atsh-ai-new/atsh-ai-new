"use client";
import {useEffect,useMemo,useState,type CSSProperties} from "react";
import Link from "next/link";
import {themes,sectors} from "../../commerce-engine/src/themes.js";
import CommerceArt from "./commerce-preview-art";
import {designNotes} from "@/lib/commerce-demo-data";
import "./commerce-preview.css";
export function useCommerceOffer(){
 const [state,setState]=useState<{ready:boolean;name:string}>({ready:false,name:""});
 useEffect(()=>{let active=true;fetch("/api/site-content/catalog?metadata=1",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{const item=d?.page?.content?.items?.find((x:{slug:string;published?:boolean;archived?:boolean})=>x.slug==="commerce-engine"&&x.published===true&&!x.archived);if(active&&item)setState({name:item.name,ready:["rent","rent_monthly","copy","code"].every(m=>Number(item.ownershipPrices?.[m]?.price)>0)})}).catch(()=>{});return()=>{active=false}},[]);
 return state;
}
type Theme=typeof themes[number];
const variables=(t:Theme)=>({"--shop-accent":t.accent,"--shop-bg":t.bg,"--shop-ink":t.ink} as CSSProperties);
export function ThemeThumbnail({theme}:{theme:Theme}){
 return <div aria-hidden="true" className={"commerce-thumb thumb-"+theme.layout} style={variables(theme)}><div className="ct-toolbar"><b>ATSH</b><span></span><i></i></div><div className="ct-home"><div className="ct-copy"><small>THE COLLECTION</small><strong>{theme.name.split(" · ")[0]}</strong><span>Discover now</span></div><div className="ct-art"><CommerceArt sector={theme.sector} accent={theme.accent}/></div></div><div className="ct-products">{[0,1,2].map(i=><div key={i}><CommerceArt sector={theme.sector} accent={theme.accent} index={i}/><span></span></div>)}</div></div>
}
export default function CommerceLibrary({locale}:{locale:"ar"|"en"}){
 const en=locale==="en",base=en?"/en":"",t=(a:string,b:string)=>en?b:a;
 const [sector,setSector]=useState("all"),[query,setQuery]=useState(""),[layout,setLayout]=useState("all"),[page,setPage]=useState(1);
 const offer=useCommerceOffer();
 const filtered=useMemo(()=>themes.filter(x=>(sector==="all"||x.sector===sector)&&(layout==="all"||x.layout===layout)&&(!query||[x.name,x.sectorName,x.sector].join(" ").toLowerCase().includes(query.toLowerCase()))),[sector,layout,query]);
 const pages=Math.max(1,Math.ceil(filtered.length/12));
 return <main dir={en?"ltr":"rtl"} className="commerce-library">
  <header className="cl-top"><Link href={base||"/"} className="cl-brand">ATSH <b>AI</b></Link><Link href={base+"/catalog"}>{t("الأنظمة المخصصة","Custom systems")}</Link><Link href={(en?"":"/en")+"/stores"}>{en?"العربية":"English"}</Link></header>
  <section className="cl-hero"><div><span className="cl-kicker">ATSH AI / COMMERCE STUDIO</span><h1>{t("متجرك. بطابعك.","Your store. Your identity.")}</h1><p>{t("اختر قطاعك، جرّب التصميم والتسوق، ثم خصّص متجرًا مرتبطًا بمنظومة المنتجات والمخزون والطلبات والإضافات.","Choose an industry, explore a real interactive design preview, then configure your store with products, inventory, orders and add-ons.")}</p><a href="#store-designs" className="cl-primary">{t("استكشف التصاميم","Explore designs")} ↓</a></div><div className="cl-hero-visual"><ThemeThumbnail theme={themes.find(x=>x.id==="furniture-atelier")!}/><div className="cl-floating">{t("تصاميم قابلة للتخصيص","Customizable designs")}<strong>{themes.length}</strong></div></div></section>
  <div className="cl-metrics"><div><strong>{sectors.length}</strong><span>{t("نشاط تجاري","Industries")}</span></div><div><strong>8</strong><span>{t("اتجاهات بصرية لكل نشاط","Visual styles per industry")}</span></div><div><strong>{t("متصل","Unified")}</strong><span>{t("بمحرك ATSH للتسعير والإضافات","ATSH pricing and add-ons")}</span></div></div>
  <section id="store-designs" className="cl-section"><div className="cl-section-head"><div><small>{t("الخطوة الأولى","STEP 01")}</small><h2>{t("اختر هوية متجرك","Find your store identity")}</h2></div><span>{filtered.length} {t("تصميم","designs")}</span></div>
   <div className="cl-filters"><input type="search" aria-label={t("بحث التصاميم","Search designs")} placeholder={t("ابحث عن تصميم أو نشاط","Search designs or industries")} value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/><select aria-label={t("اتجاه التصميم","Design style")} value={layout} onChange={e=>{setLayout(e.target.value);setPage(1)}}><option value="all">{t("كل الاتجاهات","All styles")}</option>{Object.keys(designNotes).map(x=><option key={x} value={x}>{designNotes[x][en?1:0]}</option>)}</select></div>
   <div className="cl-sector-list"><button aria-pressed={sector==="all"} onClick={()=>{setSector("all");setPage(1)}}>{t("كل الأنشطة","All industries")}</button>{sectors.map(s=><button key={s.id} aria-pressed={sector===s.id} onClick={()=>{setSector(s.id);setPage(1)}}>{en?s.en:s.ar}</button>)}</div>
   <div className="cl-grid">{filtered.slice((page-1)*12,page*12).map(x=><article className="cl-card" key={x.id}><Link href={base+"/stores/"+x.id} aria-label={t("معاينة ","Preview ")+x.name}><ThemeThumbnail theme={x}/></Link><div className="cl-card-body"><span>{en?sectors.find(s=>s.id===x.sector)?.en:x.sectorName}</span><h3>{x.name}</h3><p>{designNotes[x.layout][en?1:0]}</p><Link className="cl-card-link" href={base+"/stores/"+x.id}>{t("معاينة تفاعلية","Interactive preview")} ↗</Link></div></article>)}</div>
   {!filtered.length&&<p role="status">{t("لا توجد نتائج مطابقة.","No matching designs.")}</p>}
   <div className="cl-pagination"><button disabled={page<=1} onClick={()=>{setPage(p=>p-1);document.getElementById("store-designs")?.scrollIntoView()}}>{t("السابق","Previous")}</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>{setPage(p=>p+1);document.getElementById("store-designs")?.scrollIntoView()}}>{t("التالي","Next")}</button></div>
  </section>
  <section className="cl-bottom"><h2>{t("كل تصميم على نفس محرك التجارة","One commerce engine, every design")}</h2><p>{t("المنتجات والمتغيرات، المخزون والطلبات، نقطة البيع، صلاحيات التاجر والصفحات الإضافية. التسعير من نفس محرك ATSH، وليس من قائمة أسعار جديدة.","Products and variants, stock and orders, POS, merchant permissions, and extra pages. All quotations use the same ATSH pricing engine.")}</p><p role="status">{offer.ready?t("عرض المتاجر متاح للتخصيص والتسعير بعد اختيار التصميم.","Store offer is available for pricing after selecting a design."):t("المعاينات متاحة؛ إصدار السعر ينتظر نشر عرض المتاجر المعتمد من الإدارة.","Previews are available; quotation requires the approved store offer to be published.")}</p></section>
 </main>
}
