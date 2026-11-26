"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AddonPrice from "@/components/addon-price";
import AddonGroups from "@/components/addon-groups";
import DomainLookup from "@/components/domain-lookup";
import type {CategorizedAddon} from "@/lib/addon-categories";
import {loadGuestWorkspace,saveGuestWorkspace} from "@/lib/customer-workspace";

type Addon=CategorizedAddon & {list_price?:number|string;discount_percent?:number|string;required?:boolean;code:string;name:string;description?:string;price:number;pricingType:"fixed"|"monthly"|"yearly"|"per_page"};
type Catalog={slug:string;name:string;basePrice:number|null;pricedAddons?:Addon[];published?:boolean;archived?:boolean};
export default function CatalogPricingClient({slug}:{slug:string}){
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [sharedAddons,setSharedAddons]=useState<Addon[]>([]);
 const [status,setStatus]=useState<"loading"|"ready"|"missing">("loading");
 const [selected,setSelected]=useState<string[]>([]);
 const [pages,setPages]=useState(0);
 const [writingPages,setWritingPages]=useState(1);
 const [details,setDetails]=useState("");
 const [domainName,setDomainName]=useState("");
 const [locale,setLocale]=useState<"ar"|"en">("ar");
 useEffect(()=>{
  setLocale(window.location.pathname.startsWith("/en/")||new URLSearchParams(window.location.search).get("lang")==="en"?"en":"ar");
  const saved=loadGuestWorkspace();
  if(saved.sectorSlug===slug)setDomainName(saved.domainName??"");
  if(saved.sectorSlug===slug&&Array.isArray(saved.sectorAddonCodes)){setSelected(saved.sectorAddonCodes.filter(code=>code!=="extra_page"));setPages(saved.sectorAddonCodes.includes("extra_page")?saved.sectorAddonQuantities?.extra_page??1:0);setWritingPages(Object.entries(saved.sectorAddonQuantities??{}).find(([code])=>code!=="extra_page")?.[1]??1);}
  let active=true;
  fetch("/api/site-content/catalog",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
   if(!active)return;
   const item=(data?.page?.content?.items??[]).find((x:Catalog)=>x.slug===slug&&x.published!==false&&!x.archived);
   if(!item){setStatus("missing");return;}
   setCatalog(item);setStatus("ready");
  }).catch(()=>{if(active)setStatus("missing");});
  fetch("/api/catalog",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Shared add-ons unavailable");return r.json()}).then(data=>{
   if(!active)return;
   const byCode=new Map<string,Addon>();
   for(const option of data?.sharedOptions??data?.options??[]){
    if(!option?.code||option.visibility==="packages"||!Number.isFinite(Number(option.price))||["logo_design","visual_identity","domain","domain_com","domain_eg"].includes(option.code))continue;
    if(!byCode.has(option.code))byCode.set(option.code,{required:!!option.is_required,list_price:option.list_price,discount_percent:option.discount_percent,code:option.code,category_code:option.category_code,sort_order:option.sort_order,category_sort_order:option.category_sort_order,name:option.name,description:option.description??"",price:Number(option.price),pricingType:option.pricing_type==="monthly"?"monthly":option.pricing_type==="yearly"?"yearly":option.pricing_type==="per_page"?"per_page":"fixed"});
   }
   setSharedAddons([...byCode.values()]);
   setPages(old=>byCode.has("extra_page")?Math.max(byCode.get("extra_page")?.required?1:0,old):0);
   setSelected(old=>[...new Set([...old.filter(code=>byCode.has(code)),...Array.from(byCode.values()).filter(a=>a.required&&a.code!=="extra_page").map(a=>a.code)])]);
  }).catch(()=>{if(active)setSharedAddons([]);});
  return()=>{active=false};
 },[slug]);
 const en=locale==="en",t=(ar:string,english:string)=>en?english:ar;
 const addons=useMemo(()=>sharedAddons,[sharedAddons]);
 const pageAddon=addons.find(a=>a.code==="extra_page");
 const base=typeof catalog?.basePrice==="number"&&Number.isFinite(catalog.basePrice)?catalog.basePrice:null;
 const amountFor=(a:Addon)=>Number(a.price)*(a.pricingType==="per_page"?writingPages:1);
 const fixed=addons.filter(a=>a.code!=="extra_page"&&selected.includes(a.code)&&(a.pricingType==="fixed"||a.pricingType==="per_page")).reduce((n,a)=>n+amountFor(a),0)+pages*Number(pageAddon?.price??0);
 const monthly=addons.filter(a=>selected.includes(a.code)&&a.pricingType==="monthly").reduce((n,a)=>n+Number(a.price),0);
 const yearly=addons.filter(a=>selected.includes(a.code)&&a.pricingType==="yearly").reduce((n,a)=>n+Number(a.price),0);
 const money=(n:number)=>n.toLocaleString(en?"en-EG":"ar-EG",{maximumFractionDigits:2})+" "+t("ج.م","EGP");
 const save=()=>{if(!catalog)return;const items=[{name:catalog.name,amount:base??0,period:"fixed" as const},...addons.filter(a=>a.code!=="extra_page"&&selected.includes(a.code)).map(a=>({name:a.name,amount:amountFor(a),period:a.pricingType==="per_page"?"fixed" as const:a.pricingType})),...(pages>0&&pageAddon?[{name:`صفحات إضافية × ${pages}`,amount:pages*Number(pageAddon.price),period:"fixed" as const}]:[])];const subtotal=(base??0)+fixed+monthly+yearly;saveGuestWorkspace({domainName,sectorSlug:slug,sectorName:catalog.name,sectorAddonCodes:[...selected,...(pages>0&&pageAddon?["extra_page"]:[])],sectorAddonQuantities:Object.fromEntries([...addons.filter(a=>a.code!=="extra_page"&&a.pricingType==="per_page"&&selected.includes(a.code)).map(a=>[a.code,writingPages] as const),...(pages>0&&pageAddon?[["extra_page",pages] as const]:[])]),source:"catalog",projectMode:"ready",businessDescription:[pages>0?`${pages} صفحات إضافية`:"",details].filter(Boolean).join(" — "),draftInvoice:{title:catalog.name,items,subtotal,vat:subtotal*.14,total:subtotal*1.14,fixed:(base??0)+fixed,monthly,yearly,currency:"EGP",savedAt:new Date().toISOString()}});};
 const cardStyle={border:"1px solid #d8e1eb",borderRadius:12,padding:"12px 14px",background:"#fff"} as const;
 return <main lang={locale} dir={en?"ltr":"rtl"} style={{maxWidth:780,margin:"0 auto",padding:"18px 14px 70px",color:"#203958"}}>
  <Link href={en?"/en/catalog":"/catalog"} style={{color:"#203958"}}>{t("← العودة","← Back")}</Link>
  {status==="loading"?<p>{t("جارٍ تحميل التسعير...","Loading pricing...")}</p>:status==="missing"?<p role="alert">{t("تعذر تحميل النظام المخصص. حاول مجددًا.","Catalog unavailable. Please try again.")}</p>:<div style={{display:"grid",gap:13,marginTop:20}}>
   <header><small>{t("تخصيص النظام المخصص","Catalog configuration")}</small><h1 style={{fontSize:"clamp(24px,5vw,34px)",margin:"5px 0"}}>{catalog?.name}</h1><p style={{margin:0,color:"#60728a"}}>{t("النظام المخصص جاهز؛ أضف فقط ما تحتاجه دون اختيار باقة موقع جديدة.","Your catalog is already selected. Add only the features you need.")}</p></header>
   <section style={cardStyle}><strong>{t("سعر النظام المخصص الأساسي","Catalog base price")}</strong><p style={{fontSize:24,fontWeight:800,margin:"7px 0"}}>{base===null?t("السعر يحدده المسؤول","Price pending admin setup"):money(base)}</p></section>
   <section style={cardStyle}><h2 style={{fontSize:18,margin:"0 0 10px"}}>{t("البحث عن الدومين","Search for a domain")}</h2><DomainLookup locale={locale} source="catalog" onDomainChange={setDomainName}/>{domainName&&<p><small>{t("الدومين المختار","Selected domain")}: <b dir="ltr">{domainName}</b></small></p>}</section>
   <section className="catalog-addon-section"><h2 style={{fontSize:19,margin:"4px 0 12px"}}>{t("الإضافات والتكاملات","Add-ons and integrations")}</h2>
    <AddonGroups addons={addons} locale={locale} isSelected={a=>a.code==="extra_page"?pages>0||!!a.required:!!a.required||selected.includes(a.code)} render={a=>a.code==="extra_page"&&pageAddon?<div key={a.code} className={pages>0?"select-card selected":"select-card"} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><span className="select-card-copy"><strong>{t("صفحات إضافية","Additional pages")}</strong><small>{t("اختر عدد الصفحات الإضافية","Choose additional pages")}</small><AddonPrice item={pageAddon} locale={locale} prefix="+" suffix={t(" / صفحة"," / page")}/></span><span className="page-quantity"><button type="button" disabled={pages<=(pageAddon.required?1:0)} onClick={()=>setPages(n=>Math.max(pageAddon.required?1:0,n-1))} aria-label={t("تقليل الصفحات","Remove page")}>−</button><output aria-live="polite">{pages}</output><button type="button" disabled={pages===5} onClick={()=>setPages(n=>Math.min(5,n+1))} aria-label={t("زيادة الصفحات","Add page")}>+</button></span></div>:<button key={a.code} type="button" disabled={a.required} onClick={()=>setSelected(old=>old.includes(a.code)?old.filter(c=>c!==a.code):[...old,a.code])} aria-pressed={selected.includes(a.code)} className={selected.includes(a.code)?"select-card selected":"select-card"} style={{textAlign:"start",cursor:"pointer"}}><span className="select-mark">{selected.includes(a.code)?"✓":"+"}</span><span className="select-card-copy"><strong>{a.name}</strong>{a.description&&<small>{a.description}</small>}<AddonPrice item={a} locale={locale} prefix="+" suffix={a.pricingType==="monthly"?t(" / شهريًا"," / month"):a.pricingType==="yearly"?t(" / سنويًا"," / year"):a.pricingType==="per_page"?t(" / صفحة"," / page"):""}/></span></button>}/>
    {addons.some(a=>a.code!=="extra_page"&&a.pricingType==="per_page"&&selected.includes(a.code))&&<label style={{display:"grid",gap:6,marginTop:12}}>{t("عدد صفحات المحتوى المطلوب","Number of content pages")}<input type="number" min={1} max={50} value={writingPages} onChange={e=>setWritingPages(Math.max(1,Math.min(50,Math.floor(Number(e.target.value)||1))))}/></label>}
   </section>
   <section style={cardStyle}><label style={{display:"grid",gap:7}}><strong>{t("تفاصيل أو متطلبات أخرى","Other details or requirements")}</strong><textarea rows={3} value={details} onChange={e=>setDetails(e.target.value)} placeholder={t("اكتب تفاصيل الطلب الإضافية","Describe any other requirements")} style={{width:"100%",boxSizing:"border-box",border:"1px solid #cad6e2",borderRadius:8,padding:10}}/></label></section>
   <section style={{...cardStyle,padding:"22px 20px",borderRadius:24}} aria-live="polite">
    <div style={{color:"#718398",fontSize:14,fontWeight:600}}>{t("ملخص مباشر","Live summary")}</div>
    <h2 style={{fontSize:27,margin:"8px 0 20px"}}>{t("طلبك الحالي","Your current order")}</h2>
    <div style={{background:"#f5f7f9",border:"1px solid #e0e6eb",borderRadius:12,padding:"13px 15px",color:"#718398",fontSize:14,fontWeight:600,marginBottom:18}}>{t("تفاصيل النظام والإضافات المحددة","Selected system and add-ons")}</div>
    {([{name:catalog?.name??t("النظام المخصص","Custom system"),amount:base??0,period:t("مرة واحدة","One-time")},...addons.filter(a=>a.code!=="extra_page"&&selected.includes(a.code)).map(a=>({name:a.name,amount:amountFor(a),period:a.pricingType==="monthly"?t("شهريًا","Monthly"):a.pricingType==="yearly"?t("سنويًا","Yearly"):t("مرة واحدة","One-time")})),...(pages>0&&pageAddon?[{name:t(`صفحات إضافية × ${pages}`,`Additional pages × ${pages}`),amount:pages*Number(pageAddon.price),period:t("مرة واحدة","One-time")}]:[]) ]).map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",padding:"14px 0",borderBottom:"1px solid #e6e9ed"}}><div style={{textAlign:"start"}}><div>{item.name}</div><small style={{color:"#9aa3ad"}}>{item.period}</small></div><strong style={{whiteSpace:"nowrap",fontSize:14}}>{money(item.amount)}</strong></div>)}
    <div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"17px 0 10px",color:"#667586"}}><span>{t("المجموع قبل الضريبة","Subtotal before tax")}</span><strong>{base===null?"—":money(base+fixed+monthly+yearly)}</strong></div>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0 17px",borderBottom:"1px solid #dce2e8",color:"#667586"}}><span>{t("ضريبة القيمة المضافة (14%)","VAT (14%)")}</span><strong>{base===null?"—":money((base+fixed+monthly+yearly)*0.14)}</strong></div>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"20px 0 18px"}}><span style={{color:"#667586"}}>{t("الإجمالي التقديري","Estimated total")}</span><strong style={{fontSize:"clamp(21px,5vw,30px)",color:"#203958",whiteSpace:"nowrap"}}>{base===null?"—":money((base+fixed+monthly+yearly)*1.14)}</strong></div>
    {[[t("رسوم لمرة واحدة","One-time fees"),base===null?"—":money(base+fixed)],[t("رسوم شهرية متكررة","Recurring monthly fees"),money(monthly)],[t("رسوم سنوية متكررة","Recurring annual fees"),money(yearly)]].map(([label,value])=><div key={label} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"14px 12px",marginBottom:10,background:"#f7f7f4",borderRadius:12,fontSize:14,fontWeight:600,color:"#687584"}}><span>{label}</span><strong>{value}</strong></div>)}
    <p style={{fontSize:14,fontWeight:600,color:"#87919d",textAlign:"center",margin:"18px 0 0"}}>{t("الأسعار استرشادية بالجنيه المصري؛ تُراجع البنود والضريبة قبل إصدار عرض رسمي.","Indicative EGP pricing; line items and taxes are reviewed before a formal quote.")}</p>
   </section>
   <Link href={en?"/en/account/dashboard?tab=invoices":"/account/dashboard?tab=invoices"} onClick={save} style={{background:"#203958",color:"#fff",borderRadius:11,padding:15,textAlign:"center",fontWeight:800,textDecoration:"none"}}>{t("استكمل طلب النظام المخصص ←","Continue catalog request →")}</Link>
  </div>}
 </main>;
}
