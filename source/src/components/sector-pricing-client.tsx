"use client";
import {useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import DomainLookup from "@/components/domain-lookup";
import {saveGuestWorkspace} from "@/lib/customer-workspace";

type Addon={code:string;name:string;description?:string;price:number;pricingType:"fixed"|"monthly"|"yearly"};
type Item={slug:string;name:string;description?:string;basePrice?:number|null;pricedAddons?:Addon[]};
type Quote={items:{code:string;name:string;price:number;pricingType:string}[];subtotal:number;monthly:number;yearly:number;needsCustomQuote:boolean};
export default function SectorPricingPage({locale="ar"}:{locale?:"ar"|"en"}){
 const {slug}=useParams<{slug:string}>();
 const en=locale==="en",base=en?"/en":"";
 const t=(ar:string,english:string)=>en?english:ar;
 const [item,setItem]=useState<Item|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [quote,setQuote]=useState<Quote|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notes,setNotes]=useState("");
 const [domainName,setDomainName]=useState("");
 const [requestDomainBooking,setRequestDomainBooking]=useState(false);
 const money=(n:number)=>new Intl.NumberFormat(en?"en-EG":"ar-EG",{maximumFractionDigits:2}).format(n)+" "+t("ج.م","EGP");
 useEffect(()=>{let active=true;setLoading(true);setError("");
 fetch("/api/site-content/catalog",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  if(!active)return;
  const found=(data?.page?.content?.items as Item[]|undefined)?.find(x=>x.slug===slug);
  if(!found)throw Error("not found");
  setItem(found);setSelected([]);setLoading(false);
 }).catch(()=>{if(active){setLoading(false);setError(t("تعذر تحميل النظام المختار.","Unable to load this solution."))}});
 return()=>{active=false};
 },[slug,en]);
 const codes=useMemo(()=>selected.filter(code=>item?.pricedAddons?.some(a=>a.code===code)),[selected,item]);
 useEffect(()=>{if(!item)return;let active=true;setQuote(null);setError("");
 const query=new URLSearchParams({slug:item.slug,addons:codes.join(",")});
 fetch("/api/sector-price?"+query,{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(active)setQuote(data as Quote)}).catch(()=>{if(active)setError(t("تعذر حساب السعر من الخادم. لا يمكن تأكيد الفاتورة الآن.","Server pricing is unavailable. Estimate cannot be confirmed."))});
 return()=>{active=false};
 },[item,codes.join(","),en]);
 const save=()=>{if(!item||!quote)return;
  saveGuestWorkspace({sectorSlug:item.slug,sectorName:item.name,sectorAddonCodes:codes,source:"catalog",projectMode:"ready",domainName,requirements:[item.name,...(quote.items??[]).map(x=>x.name+" : "+x.price),domainName?`الدومين المطلوب: ${domainName}`:"",requestDomainBooking&&domainName?"طلب حجز الدومين بواسطة الإدارة بعد تأكيد التوفر والسعر":"",notes].filter(Boolean).join("\n")});
  window.location.assign(en?"/en/account/register":"/account/register");
 };
 return <main dir={en?"ltr":"rtl"} style={{background:"#f8f7f3",minHeight:"100vh",padding:"24px 16px",color:"#203958"}}>
 <div style={{maxWidth:1000,margin:"auto"}}>
 <nav style={{display:"flex",justifyContent:"space-between",gap:12}}><Link href={base+"/catalog"}>{t("العودة للكتالوج","Back to catalog")}</Link><Link href={(en?"":"/en")+"/catalog/"+encodeURIComponent(slug)+"/pricing"}>{en?"العربية":"English"}</Link></nav>
 <h1>{t("تخصيص النظام والفاتورة المباشرة","Customize your solution & live estimate")}</h1>
 {loading&&<p>{t("جارٍ تحميل النظام...","Loading solution...")}</p>}
 {error&&<p role="alert" style={{color:"#a33"}}>{error}</p>}
 {item&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:20,alignItems:"start"}}>
 <section style={{background:"white",border:"1px solid #dbe4ee",borderRadius:18,padding:20}}>
 <h2>{item.name}</h2><h3>{t("١. اختيار الدومين","1. Choose a domain")}</h3><DomainLookup locale={locale} onDomainChange={setDomainName}/><label style={{display:"flex",gap:9,alignItems:"center",marginBottom:16}}><input type="checkbox" checked={requestDomainBooking} onChange={e=>setRequestDomainBooking(e.target.checked)}/>{t("أطلب من الإدارة حجز الدومين المختار بعد تأكيد السعر والتوفر","Ask management to register the selected domain after confirming price and availability")}</label><p>{item.description}</p>
 <h3>{t("الإضافات الاختيارية","Optional add-ons")}</h3>
 {!item.pricedAddons?.length&&<p>{t("لا توجد إضافات مسجلة حاليًا لهذا النظام.","No add-ons configured for this solution.")}</p>}
 {(item.pricedAddons??[]).map(a=><label key={a.code} style={{display:"flex",gap:12,padding:"14px 0",borderBottom:"1px solid #e4e9ef",cursor:"pointer"}}>
 <input type="checkbox" checked={codes.includes(a.code)} onChange={()=>setSelected(s=>s.includes(a.code)?s.filter(x=>x!==a.code):[...s,a.code])} style={{width:20,height:20}}/>
 <span><strong>{a.name}</strong><small style={{display:"block",color:"#64748b"}}>{a.description}</small><b>{money(Number(a.price))} {a.pricingType==="monthly"?t("/ شهر","/ month"):a.pricingType==="yearly"?t("/ سنة","/ year"):""}</b></span></label>)}
 <label style={{display:"block",marginTop:18}}>{t("مواصفات ومتطلبات إضافية","Additional requirements")}<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} style={{display:"block",width:"100%",boxSizing:"border-box",padding:12,border:"1px solid #cbd5e1",borderRadius:10}}/></label>
 </section>
 <aside style={{background:"#edf3fa",border:"1px solid #cfdeee",borderRadius:18,padding:20}}>
 <h2>{t("الفاتورة التقديرية المباشرة","Live itemized estimate")}</h2>
 {!quote?<p>{t("جارٍ حساب الأسعار المعتمدة...","Calculating verified prices...")}</p>:<>
 {(quote.items??[]).map((line,i)=><div key={line.code+"-"+i} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"12px 0",borderBottom:"1px solid #cbd5e1"}}><span>{line.name}</span><strong>{money(Number(line.price))}</strong></div>)}
 <p>{t("إجمالي التنفيذ لمرة واحدة","One-time subtotal")}: <b>{money(Number(quote.subtotal))}</b></p>
 <p>{t("اشتراكات شهرية","Monthly")}: <b>{money(Number(quote.monthly))}</b></p>
 <p>{t("اشتراكات سنوية","Yearly")}: <b>{money(Number(quote.yearly))}</b></p>
 {quote.needsCustomQuote&&<p>{t("يتطلب النظام عرض سعر نهائيًا بعد مراجعة المتطلبات.","Final price requires scope review.")}</p>}
 <p style={{fontSize:12}}>{t("الأسعار تقديرية، والضريبة إن وجدت تحدد عند اعتماد الطلب.","Indicative prices; applicable taxes are confirmed before approval.")}</p>
 <button type="button" onClick={save} style={{width:"100%",padding:14,background:"#203958",color:"white",border:0,borderRadius:9,cursor:"pointer"}}>{t("حفظ الإضافات والمتطلبات وإنشاء حساب","Save selections and create account")}</button>
 </>}
 </aside></div>}
 </div></main>;
}
