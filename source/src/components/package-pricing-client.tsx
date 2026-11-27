"use client";
import {useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import AddonPrice from "@/components/addon-price";
import {PriceBreakdown} from "@/components/price-breakdown";
import {roundMoney,summarizePrice} from "@/lib/price-summary";
import AddonGroups from "@/components/addon-groups";
import type {CategorizedAddon} from "@/lib/addon-categories";
import DomainLookup from "@/components/domain-lookup";
import {loadGuestWorkspace,loadAccountWorkspace,loadPricingDraft,savePricingDraft,type PricingDraft} from "@/lib/customer-workspace";
import OwnershipSelector,{ownershipName,ownershipPeriod,type OwnershipMode,type OwnershipPrices} from "./ownership-selector";

type Package={ownershipPrices?:OwnershipPrices|null;list_price?:number|string;discount_percent?:number|string;id:string;name:string;description:string;price:number|string;is_custom_quote:boolean;features?:string[]};
type Option=CategorizedAddon & {list_price?:number|string;discount_percent?:number|string;id:string;package_id:string;code:string;name:string;description:string;price:number|string;pricing_type:string;unit_label?:string;is_required:boolean};
const aliases:Record<string,string>={landing:"11111111-1111-4111-8111-111111111111",multi:"22222222-2222-4222-8222-222222222222",dynamic:"33333333-3333-4333-8333-333333333333",enterprise:"44444444-4444-4444-8444-444444444444"};
export default function PackagePricingPage({locale="ar"}:{locale?:"ar"|"en"}){
 const params=useParams<{packageId:string}>();
 const en=locale==="en";const t=(ar:string,english:string)=>en?english:ar;
 const [catalog,setCatalog]=useState<{packages:Package[];options:Option[]}|null>(null);
 const [vat,setVat]=useState<number|null>(null);
 const [mode,setMode]=useState<OwnershipMode>("rent");
 const [edit,setEdit]=useState<PricingDraft|null>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{let active=true;loadPricingDraft().then(async d=>{if(!active)return;setEdit(d);const saved=d?.draft??(new URLSearchParams(window.location.search).has("editWorkspace")?await loadAccountWorkspace():null)??loadGuestWorkspace();if((aliases[saved.packageId??""]??saved.packageId)===(aliases[params.packageId]??params.packageId)){setMode(saved.ownershipMode??"rent");setSelected(saved.options??[]);setQuantities(saved.optionQuantities??{});setDomainName(saved.domainName??"");setCustomer(c=>({...c,notes:saved.requirements??""}));setRequestDomainBooking(saved.domainChoice==="request-booking");}else if(d)throw Error("Project package mismatch");setReady(true);}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[params.packageId]);
 const [selected,setSelected]=useState<string[]>([]);
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const [error,setError]=useState("");
 const [customer,setCustomer]=useState({name:"",phone:"",email:"",notes:""});
 
 const [submission,setSubmission]=useState("");
 const [domainName,setDomainName]=useState("");
 const [requestDomainBooking,setRequestDomainBooking]=useState(false);
 useEffect(()=>{let active=true;Promise.all([
  fetch("/api/catalog",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("catalog");return r.json()}),
  fetch(`/api/site-content/home?locale=${en?"en":"ar"}`,{cache:"no-store"}).then(async r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([data,config])=>{if(!active)return;setCatalog(data);const rate=config?.vatRate==null?NaN:Number(config.vatRate);setVat(Number.isFinite(rate)&&rate>=0&&rate<=100?rate:null);}).catch(()=>{if(active)setError(t("تعذر تحميل الأسعار المعتمدة. حاول مجددًا.","Unable to load current prices. Please retry."))});return()=>{active=false}},[en]);
 const pkg=catalog?.packages.find(p=>p.id===(aliases[params.packageId]??params.packageId));
 // Domain registration is requested via the live domain lookup above, not as a duplicate priced add-on.
 const options=useMemo(()=>catalog?.options.filter(o=>o.package_id===pkg?.id&&!(/(?:^|[_-])domain(?:[_-]|$)/i.test(o.code)||/^(?:نطاق|دومين)\s*\.(?:com|eg)\b/i.test(o.name)||/^(?:نطاق|دومين)\s+(?:com|eg)\b/i.test(o.name)))??[],[catalog,pkg?.id]);
 const lines=options.filter(o=>o.is_required||selected.includes(o.id)).map(o=>{const unit=Number(o.price);const quantity=o.pricing_type==="per_page"?Math.max(1,Math.min(o.code==="extra_page"?5:50,quantities[o.id]??1)):1;return {...o,quantity,amount:roundMoney(unit*quantity)};});
 const tariff=pkg?.ownershipPrices?.[mode];
 const invalid=!ready||Boolean(pkg&&!pkg.is_custom_quote&&(!tariff||!Number.isFinite(tariff.price)||tariff.price<0))||lines.some(l=>!Number.isFinite(l.amount)||l.amount<0);
 const base=tariff?.price??0;
 const items=[...(pkg&&tariff?[{name:pkg.name+" · "+ownershipName(mode,en),amount:base,period:ownershipPeriod(mode)}]:[]),...lines.map(l=>({name:l.name+(l.quantity>1?` × ${l.quantity}`:""),amount:l.amount,period:l.pricing_type==="monthly"?"monthly" as const:l.pricing_type==="yearly"?"yearly" as const:"fixed" as const}))];
 const summary=summarizePrice(items,vat);
 const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!pkg||pkg.is_custom_quote||invalid||!summary)return;setSubmission("");try{
 await savePricingDraft(edit,{domainName,packageId:pkg.id,ownershipMode:mode,requirements:customer.notes,domainChoice:requestDomainBooking?"request-booking":"existing",options:lines.map(l=>l.id),optionQuantities:Object.fromEntries(lines.map(l=>[l.id,l.quantity])),source:"configurator",projectMode:"custom",draftInvoice:{title:pkg.name,items,...summary,currency:"EGP",savedAt:new Date().toISOString()}},locale);
 }catch(e){setSubmission(e instanceof Error?e.message:t("تعذر حفظ الاختيارات","Unable to save selections"))}};
 return <main dir={en?"ltr":"rtl"} style={{minHeight:"100vh",background:"#f8f7f3",color:"#203958",padding:"28px 16px",fontFamily:"inherit"}}>
  <div style={{maxWidth:1040,margin:"auto"}}>
   <nav style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:22}}><Link href={en?"/en#packages":"/#packages"}>{t("← العودة للباقات","← Back to packages")}</Link><Link href={en?`/packages/${params.packageId}/pricing`:`/en/packages/${params.packageId}/pricing`}>{en?"العربية":"English"}</Link></nav>
   <h1 style={{fontSize:"clamp(26px,4vw,40px)",marginBottom:6}}>{t("جهّز باقتك","Customize your package")}</h1>
   <p>{t("اختر طريقة التشغيل والإضافات. الإجمالي يتحدّث مع كل اختيار.","Choose a delivery option and add-ons. Your total updates as you go.")}</p>
   {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
   {!catalog&&!error&&<p>{t("جارٍ تحميل الأسعار...","Loading prices...")}</p>}
   {catalog&&!pkg&&<p role="alert">{t("هذه الباقة غير متاحة حاليًا.","This package is not currently available.")}</p>}
   {pkg&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:20,alignItems:"start",marginTop:24}}>
    <section style={{background:"white",padding:22,borderRadius:18,border:"1px solid #dbe4ee"}}>
     <h2>{pkg.name}</h2><h3>{t("١. البحث عن الدومين","1. Search for a domain")}</h3><DomainLookup locale={locale} value={domainName} onDomainChange={setDomainName}/><label style={{display:"flex",gap:9,alignItems:"center",margin:"12px 0 20px"}}><input type="checkbox" checked={requestDomainBooking} onChange={e=>setRequestDomainBooking(e.target.checked)}/>{t("أطلب من الإدارة حجز الدومين المختار بعد تأكيد السعر والتوفر","Request management to register the selected domain after confirming availability and price")}</label>{!pkg.is_custom_quote&&<OwnershipSelector prices={pkg.ownershipPrices} mode={mode} onChange={setMode} locale={locale}/>}<p>{pkg.description}</p>{pkg.is_custom_quote&&<strong>{t("السعر بعد مراجعة المتطلبات","Price on request")}</strong>}
     {!!pkg.features?.length&&<ul style={{paddingInlineStart:22}}>{pkg.features.map((feature,i)=><li key={i}>{feature}</li>)}</ul>}
     <h2 style={{marginTop:24}}>{t("الإضافات والتخصيص","Add-ons and customization")}</h2>
     {!options.length&&<p>{t("لا توجد إضافات مسجلة لهذه الباقة.","No add-ons configured for this package.")}</p>}
     <AddonGroups addons={options} locale={locale} isSelected={o=>o.is_required||selected.includes(o.id)} render={o=>{const checked=o.is_required||selected.includes(o.id);const perPage=o.pricing_type==="per_page";return <div key={o.id}>
      <button type="button" disabled={o.is_required} aria-pressed={checked} onClick={()=>toggle(o.id)} className={checked?"select-card selected":"select-card"}><span className="select-mark">{checked?"✓":"+"}</span>
       <span className="select-card-copy"><strong>{o.name}</strong>{o.is_required&&<small> ({t("إلزامية","required")})</small>}<small style={{display:"block",marginTop:4,color:"#64748b"}}>{o.description}</small><AddonPrice item={o} locale={locale} suffix={o.pricing_type==="monthly"?t(" / شهر"," / month"):o.pricing_type==="yearly"?t(" / سنة"," / year"):perPage?t(" / صفحة"," / page"):t(" · مرة واحدة"," · one time")}/></span>
      </button>
      {checked&&perPage&&<label style={{display:"flex",gap:10,alignItems:"center",marginTop:10}}>{t("الكمية","Quantity")}<input type="number" min={1} max={o.code==="extra_page"?5:50} value={quantities[o.id]??1} onChange={e=>setQuantities(q=>({...q,[o.id]:Math.max(1,Math.min(o.code==="extra_page"?5:50,Math.floor(Number(e.target.value)||1)))}))} style={{width:80,padding:7,border:"1px solid #ccd5e1",borderRadius:8}}/></label>}
     </div>}}/>
    </section>
    <aside style={{background:"#edf3fa",padding:22,borderRadius:18,border:"1px solid #cfdeee",position:"sticky",top:12}}>
     <h2>{t("ملخص السعر","Price summary")}</h2>
     {!pkg.is_custom_quote&&summary&&!invalid?<div aria-live="polite"><PriceBreakdown summary={summary} items={items} locale={locale} domain={domainName}/></div>:<p>{pkg.is_custom_quote?t("نراجع المطلوب ونقدّم لك عرض سعر.","We’ll review your requirements and send you a quote."):t("الإجمالي يظهر بعد تحميل الأسعار والضريبة.","The total appears when pricing and tax are available.")}</p>}
     <form onSubmit={submit} style={{marginTop:20,display:"grid",gap:10}}>{pkg.is_custom_quote?<p>{t("هذه الباقة تحتاج عرض سعر معتمد. تواصل مع المبيعات للحصول على عرض معتمد.","This package requires an approved custom quote. Contact sales for an approved quote.")}</p>:<><button type="submit" disabled={invalid||!summary} style={{padding:12,borderRadius:8,border:0,background:"#203958",color:"white"}}>{t("حفظ الاختيارات والمتابعة","Save selections and continue")}</button></>}{submission&&<p role="status">{submission}</p>}</form>
    </aside>
   </div>}
  </div>
 </main>;
}
