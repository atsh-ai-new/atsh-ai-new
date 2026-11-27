"use client";
import {useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import AddonPrice from "@/components/addon-price";
import AddonGroups from "@/components/addon-groups";
import type {CategorizedAddon} from "@/lib/addon-categories";
import DomainLookup from "@/components/domain-lookup";
import {loadGuestWorkspace,loadAccountWorkspace,loadPricingDraft,savePricingDraft,type PricingDraft} from "@/lib/customer-workspace";
import OwnershipSelector,{ownershipName,ownershipPeriod,isRental,type OwnershipMode,type OwnershipPrices} from "./ownership-selector";

type Package={ownershipPrices?:OwnershipPrices|null;list_price?:number|string;discount_percent?:number|string;id:string;name:string;description:string;price:number|string;is_custom_quote:boolean;features?:string[]};
type Option=CategorizedAddon & {list_price?:number|string;discount_percent?:number|string;id:string;package_id:string;code:string;name:string;description:string;price:number|string;pricing_type:string;unit_label?:string;is_required:boolean};
const aliases:Record<string,string>={landing:"11111111-1111-4111-8111-111111111111",multi:"22222222-2222-4222-8222-222222222222",dynamic:"33333333-3333-4333-8333-333333333333",enterprise:"44444444-4444-4444-8444-444444444444"};
const round=(n:number)=>Math.round(n*100)/100;
export default function PackagePricingPage({locale="ar"}:{locale?:"ar"|"en"}){
 const params=useParams<{packageId:string}>();
 const en=locale==="en";const t=(ar:string,english:string)=>en?english:ar;
 const [catalog,setCatalog]=useState<{packages:Package[];options:Option[]}|null>(null);
 const [vat,setVat]=useState<number|null>(null);
 const [mode,setMode]=useState<OwnershipMode>("copy");
 const [edit,setEdit]=useState<PricingDraft|null>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{let active=true;loadPricingDraft().then(async d=>{if(!active)return;setEdit(d);const saved=d?.draft??(new URLSearchParams(window.location.search).has("editWorkspace")?await loadAccountWorkspace():null)??loadGuestWorkspace();if((aliases[saved.packageId??""]??saved.packageId)===(aliases[params.packageId]??params.packageId)){setMode(saved.ownershipMode??"copy");setSelected(saved.options??[]);setQuantities(saved.optionQuantities??{});setDomainName(saved.domainName??"");setCustomer(c=>({...c,notes:saved.requirements??""}));setRequestDomainBooking(saved.domainChoice==="request-booking");}else if(d)throw Error("Project package mismatch");setReady(true);}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[params.packageId]);
 const [selected,setSelected]=useState<string[]>([]);
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const [error,setError]=useState("");
 const [customer,setCustomer]=useState({name:"",phone:"",email:"",notes:""});
 
 const [submission,setSubmission]=useState("");
 const [domainName,setDomainName]=useState("");
 const [requestDomainBooking,setRequestDomainBooking]=useState(false);
 useEffect(()=>{
  const request=new AbortController();
  const validVat=(value:unknown)=>{
   if(typeof value!=="number"&&typeof value!=="string")return null;
   if(typeof value==="string"&&!value.trim())return null;
   const rate=Number(value);
   return Number.isFinite(rate)&&rate>=0&&rate<=100?rate:null;
  };
  void (async()=>{
   try{
    const r=await fetch("/api/catalog",{cache:"no-store",signal:request.signal});
    if(!r.ok)throw Error("catalog");
    const data=await r.json();
    if(request.signal.aborted)return;
    setCatalog(data);
    const rate=validVat(data?.vatRate);
    if(rate!==null){setVat(rate);return;}
    // Rolling-deployment fallback: let add-ons render while older servers provide VAT separately.
    const settings=await fetch(`/api/site-content/home?locale=${en?"en":"ar"}&metadata=1`,{cache:"no-store",signal:request.signal}).then(r=>r.ok?r.json():null).catch(()=>null);
    if(!request.signal.aborted)setVat(validVat(settings?.vatRate));
   }catch{if(!request.signal.aborted)setError(en?"Unable to load current prices. Please retry.":"تعذر تحميل الأسعار المعتمدة. حاول مجددًا.");}
  })();
  return()=>request.abort();
 },[en]);
 const pkg=catalog?.packages.find(p=>p.id===(aliases[params.packageId]??params.packageId));
 // Domain registration is requested via the live domain lookup above, not as a duplicate priced add-on.
 const options=useMemo(()=>catalog?.options.filter(o=>o.package_id===pkg?.id&&!(/(?:^|[_-])domain(?:[_-]|$)/i.test(o.code)||/^(?:نطاق|دومين)\s*\.(?:com|eg)\b/i.test(o.name)||/^(?:نطاق|دومين)\s+(?:com|eg)\b/i.test(o.name)))??[],[catalog,pkg?.id]);
 const lines=options.filter(o=>o.is_required||selected.includes(o.id)).map(o=>{const unit=Number(o.price);const quantity=o.pricing_type==="per_page"?Math.max(1,Math.min(o.code==="extra_page"?5:50,quantities[o.id]??1)):1;return {...o,quantity,amount:round(unit*quantity)};});
 const tariff=pkg?.ownershipPrices?.[mode];
 const invalid=!ready||Boolean(pkg&&!pkg.is_custom_quote&&(!tariff||!Number.isFinite(tariff.price)||tariff.price<0))||lines.some(l=>!Number.isFinite(l.amount)||l.amount<0);
 const base=tariff?.price??0;
 const oneTime=round((isRental(mode)?0:base)+lines.filter(l=>!["monthly","yearly"].includes(l.pricing_type)).reduce((a,l)=>a+l.amount,0));
 const monthly=round((mode==="rent_monthly"?base:0)+lines.filter(l=>l.pricing_type==="monthly").reduce((a,l)=>a+l.amount,0));
 const yearly=round((mode==="rent"?base:0)+lines.filter(l=>l.pricing_type==="yearly").reduce((a,l)=>a+l.amount,0));
 const tax=vat===null?null:round((oneTime+monthly+yearly)*vat/100);
 const total=tax===null?null:round(oneTime+monthly+yearly+tax);
 const money=(n:number)=>new Intl.NumberFormat(en?"en-EG":"ar-EG",{maximumFractionDigits:2,minimumFractionDigits:0}).format(n)+" "+t("ج.م","EGP");
 const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!pkg||invalid||vat===null||tax===null||total===null)return;setSubmission("");try{
 const items=[{name:pkg.name+" — "+ownershipName(mode),amount:base,period:ownershipPeriod(mode)},...lines.map(l=>({name:l.name,amount:l.amount,period:l.pricing_type==="monthly"?"monthly" as const:l.pricing_type==="yearly"?"yearly" as const:"fixed" as const}))];
 await savePricingDraft(edit,{domainName,packageId:pkg.id,ownershipMode:mode,requirements:customer.notes,domainChoice:requestDomainBooking?"request-booking":"existing",options:lines.map(l=>l.id),optionQuantities:Object.fromEntries(lines.map(l=>[l.id,l.quantity])),source:"configurator",projectMode:"custom",draftInvoice:{title:pkg.name,items,subtotal:round(oneTime+monthly+yearly),vat:tax,total,fixed:oneTime,monthly,yearly,currency:"EGP",savedAt:new Date().toISOString()}},locale);
 }catch(e){setSubmission(e instanceof Error?e.message:t("تعذر حفظ الاختيارات","Unable to save selections"))}};
 return <main dir={en?"ltr":"rtl"} style={{minHeight:"100vh",background:"#f8f7f3",color:"#203958",padding:"28px 16px",fontFamily:"inherit"}}>
  <div style={{maxWidth:1040,margin:"auto"}}>
   <nav style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:22}}><Link href={en?"/en#packages":"/#packages"}>{t("← العودة للباقات","← Back to packages")}</Link><Link href={en?`/packages/${params.packageId}/pricing`:`/en/packages/${params.packageId}/pricing`}>{en?"العربية":"English"}</Link></nav>
   <h1 style={{fontSize:"clamp(26px,4vw,40px)",marginBottom:6}}>{t("تخصيص الباقة وحساب التكلفة","Customize your package and calculate cost")}</h1>
   <p>{t("اختر الإضافات والكميات، وشاهد تفصيل الأسعار مباشرة.","Select add-ons and quantities to see an instant itemized estimate.")}</p>
   {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
   {!catalog&&!error&&<p>{t("جارٍ تحميل الأسعار...","Loading prices...")}</p>}
   {catalog&&!pkg&&<p role="alert">{t("هذه الباقة غير متاحة حاليًا.","This package is not currently available.")}</p>}
   {pkg&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:20,alignItems:"start",marginTop:24}}>
    <section style={{background:"white",padding:22,borderRadius:18,border:"1px solid #dbe4ee"}}>
     <h2>{pkg.name}</h2><h3>{t("١. البحث عن الدومين","1. Search for a domain")}</h3><DomainLookup locale={locale} value={domainName} onDomainChange={setDomainName}/><label style={{display:"flex",gap:9,alignItems:"center",margin:"12px 0 20px"}}><input type="checkbox" checked={requestDomainBooking} onChange={e=>setRequestDomainBooking(e.target.checked)}/>{t("أطلب من الإدارة حجز الدومين المختار بعد تأكيد السعر والتوفر","Request management to register the selected domain after confirming availability and price")}</label>{!pkg.is_custom_quote&&<OwnershipSelector prices={pkg.ownershipPrices} mode={mode} onChange={setMode} locale={locale}/>}<p>{pkg.description}</p><strong>{pkg.is_custom_quote||!tariff?t("السعر بعد مراجعة المتطلبات","Price on request"):money(base)}</strong>
     {!!pkg.features?.length&&<ul style={{paddingInlineStart:22}}>{pkg.features.map((feature,i)=><li key={i}>{feature}</li>)}</ul>}
     <h2 style={{marginTop:24}}>{t("الإضافات والتخصيص","Add-ons and customization")}</h2>
     {!options.length&&<p>{t("لا توجد إضافات مسجلة لهذه الباقة.","No add-ons configured for this package.")}</p>}
     <AddonGroups addons={options} locale={locale} isSelected={o=>o.is_required||selected.includes(o.id)} render={o=>{const checked=o.is_required||selected.includes(o.id);const perPage=o.pricing_type==="per_page";return <div key={o.id}>
      <button type="button" disabled={o.is_required} aria-pressed={checked} onClick={()=>toggle(o.id)} className={checked?"select-card selected":"select-card"}><span className="select-mark">{checked?"✓":"+"}</span>
       <span className="select-card-copy"><strong>{o.name}</strong>{o.is_required&&<small> ({t("إلزامية","required")})</small>}<small style={{display:"block",marginTop:4,color:"#64748b"}}>{o.description}</small><AddonPrice item={o} locale={locale} suffix={o.pricing_type==="monthly"?t(" / شهر"," / month"):o.pricing_type==="yearly"?t(" / سنة"," / year"):perPage?t(" / وحدة"," / unit"):""}/></span>
      </button>
      {checked&&perPage&&<label style={{display:"flex",gap:10,alignItems:"center",marginTop:10}}>{t("الكمية","Quantity")}<input type="number" min={1} max={o.code==="extra_page"?5:50} value={quantities[o.id]??1} onChange={e=>setQuantities(q=>({...q,[o.id]:Math.max(1,Math.min(o.code==="extra_page"?5:50,Math.floor(Number(e.target.value)||1)))}))} style={{width:80,padding:7,border:"1px solid #ccd5e1",borderRadius:8}}/></label>}
     </div>}}/>
    </section>
    <aside style={{background:"#edf3fa",padding:22,borderRadius:18,border:"1px solid #cfdeee",position:"sticky",top:12}}>
     <h2>{t("ملخص التكلفة التقديرية المباشر (ليس فاتورة)","Live cost estimate (not an invoice)")}</h2>
     <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:12}}><span>{pkg.name}</span><span>{pkg.is_custom_quote?t("حسب الطلب","Custom quote"):tariff?<AddonPrice item={tariff} locale={locale}/>:null}</span></div>
     {lines.map(l=><div key={l.id} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"9px 0",borderTop:"1px solid #d5e0eb"}}><span>{l.name}{l.quantity>1?` × ${l.quantity}`:""}</span><b>{money(l.amount)}</b></div>)}
     <hr style={{border:0,borderTop:"1px solid #bdccda",margin:"18px 0"}}/>
     <p>{t("تنفيذ لمرة واحدة","One-time charges")}: <strong>{money(oneTime)}</strong></p>
     <p>{t("اشتراكات شهرية","Monthly recurring")}: <strong>{money(monthly)}</strong></p>
     <p>{t("اشتراكات سنوية","Yearly recurring")}: <strong>{money(yearly)}</strong></p>
     <p>{t("الضريبة التقديرية","Estimated VAT")}: <strong>{tax===null?t("تحدد لاحقًا","To be confirmed"):money(tax)}</strong></p>
     <h3>{t("إجمالي الدفعة الأولى شامل الضريبة","Initial total incl. VAT")}: {total===null?t("بانتظار تحديد الضريبة","Pending tax rate"):money(total)}</h3>
     <p style={{fontSize:14,fontWeight:600,color:"#52667b"}}>{t("الإجمالي يشمل الدفعة الأولى من الرسوم الدورية؛ التجديد حسب دورة الاشتراك.","The total includes the first recurring charges; renewals follow their billing periods.")}</p>
     {pkg.is_custom_quote&&<p>{t("الباقة تتطلب عرض سعر مخصصًا.","This package requires a custom quote.")}</p>}
     <form onSubmit={submit} style={{marginTop:20,display:"grid",gap:10}}><h3>{t("احفظ اختياراتك وأنشئ حسابك","Save your selections and create an account")}</h3>{pkg.is_custom_quote?<p>{t("هذه الباقة تحتاج عرض سعر معتمد. تواصل مع المبيعات للحصول على عرض معتمد.","This package requires an approved custom quote. Contact sales for an approved quote.")}</p>:<><button type="submit" disabled={invalid||vat===null} style={{padding:12,borderRadius:8,border:0,background:"#203958",color:"white"}}>{t("حفظ الاختيارات والمتابعة","Save selections and continue")}</button></>}{submission&&<p role="status">{submission}</p>}</form>
    </aside>
   </div>}
  </div>
 </main>;
}
