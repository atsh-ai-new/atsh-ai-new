"use client";
import {useEffect,useMemo,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";

type Package={id:string;name:string;description:string;price:number|string;is_custom_quote:boolean;features?:string[]};
type Option={id:string;package_id:string;code:string;name:string;description:string;price:number|string;pricing_type:string;unit_label?:string;is_required:boolean};
const aliases:Record<string,string>={landing:"11111111-1111-4111-8111-111111111111",multi:"22222222-2222-4222-8222-222222222222",dynamic:"33333333-3333-4333-8333-333333333333",enterprise:"44444444-4444-4444-8444-444444444444"};
const round=(n:number)=>Math.round(n*100)/100;
export default function PackagePricingPage(){
 const params=useParams<{locale:string;packageId:string}>();
 const en=params.locale==="en";const t=(ar:string,english:string)=>en?english:ar;
 const [catalog,setCatalog]=useState<{packages:Package[];options:Option[]}|null>(null);
 const [vat,setVat]=useState<number|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const [error,setError]=useState("");
 const [copied,setCopied]=useState(false);
 useEffect(()=>{let active=true;Promise.all([
  fetch("/api/catalog",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("catalog");return r.json()}),
  fetch(`/api/site-content/home?locale=${en?"en":"ar"}`,{cache:"no-store"}).then(async r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([data,config])=>{if(!active)return;setCatalog(data);const rate=Number(config?.vatRate);setVat(Number.isFinite(rate)&&rate>=0&&rate<=100?rate:null);}).catch(()=>{if(active)setError(t("تعذر تحميل الأسعار المعتمدة. حاول مجددًا.","Unable to load current prices. Please retry."))});return()=>{active=false}},[en]);
 const pkg=catalog?.packages.find(p=>p.id===(aliases[params.packageId]??params.packageId));
 const options=useMemo(()=>catalog?.options.filter(o=>o.package_id===pkg?.id)??[],[catalog,pkg?.id]);
 const lines=options.filter(o=>o.is_required||selected.includes(o.id)).map(o=>{const unit=Number(o.price);const quantity=o.pricing_type==="per_page"?Math.max(1,Math.min(50,quantities[o.id]??1)):1;return {...o,quantity,amount:round(unit*quantity)};});
 const invalid=Boolean(pkg&&!pkg.is_custom_quote&&(!Number.isFinite(Number(pkg.price))||Number(pkg.price)<0))||lines.some(l=>!Number.isFinite(l.amount)||l.amount<0);
 const base=pkg&&!pkg.is_custom_quote?Number(pkg.price):0;
 const oneTime=round(base+lines.filter(l=>!["monthly","yearly"].includes(l.pricing_type)).reduce((a,l)=>a+l.amount,0));
 const monthly=round(lines.filter(l=>l.pricing_type==="monthly").reduce((a,l)=>a+l.amount,0));
 const yearly=round(lines.filter(l=>l.pricing_type==="yearly").reduce((a,l)=>a+l.amount,0));
 const tax=vat===null?null:round(oneTime*vat/100);
 const total=tax===null?null:round(oneTime+tax);
 const money=(n:number)=>new Intl.NumberFormat(en?"en-EG":"ar-EG",{maximumFractionDigits:2,minimumFractionDigits:0}).format(n)+" "+t("ج.م","EGP");
 const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 const summary=[pkg?.name??"",...lines.map(l=>`${l.name} × ${l.quantity}: ${money(l.amount)} (${l.pricing_type})`),`${t("تكلفة التنفيذ","One-time")}: ${money(oneTime)}`,`${t("شهريًا","Monthly")}: ${money(monthly)}`,`${t("سنويًا","Yearly")}: ${money(yearly)}`,tax===null?t("الضريبة تُحدد عند اعتماد العرض","Tax to be confirmed"):`${t("ضريبة التنفيذ","One-time VAT")}: ${money(tax)}`,total===null?"":`${t("إجمالي التنفيذ","One-time total")}: ${money(total)}`].filter(Boolean).join("\n");
 return <main dir={en?"ltr":"rtl"} style={{minHeight:"100vh",background:"#f8f7f3",color:"#203958",padding:"28px 16px",fontFamily:"inherit"}}>
  <div style={{maxWidth:1040,margin:"auto"}}>
   <nav style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:22}}><Link href={en?"/en#packages":"/ar#packages"}>{t("← العودة للباقات","← Back to packages")}</Link><Link href={en?`/ar/packages/${params.packageId}/pricing`:`/en/packages/${params.packageId}/pricing`}>{en?"العربية":"English"}</Link></nav>
   <h1 style={{fontSize:"clamp(26px,4vw,40px)",marginBottom:6}}>{t("تخصيص الباقة وحساب التكلفة","Customize your package and calculate cost")}</h1>
   <p>{t("اختر الإضافات والكميات، وشاهد تفصيل الأسعار مباشرة.","Select add-ons and quantities to see an instant itemized estimate.")}</p>
   {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
   {!catalog&&!error&&<p>{t("جارٍ تحميل الأسعار...","Loading prices...")}</p>}
   {catalog&&!pkg&&<p role="alert">{t("هذه الباقة غير متاحة حاليًا.","This package is not currently available.")}</p>}
   {pkg&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:20,alignItems:"start",marginTop:24}}>
    <section style={{background:"white",padding:22,borderRadius:18,border:"1px solid #dbe4ee"}}>
     <h2>{pkg.name}</h2><p>{pkg.description}</p><strong>{pkg.is_custom_quote?t("السعر بعد مراجعة المتطلبات","Price on request"):money(base)}</strong>
     {!!pkg.features?.length&&<ul style={{paddingInlineStart:22}}>{pkg.features.map((feature,i)=><li key={i}>{feature}</li>)}</ul>}
     <h2 style={{marginTop:24}}>{t("الإضافات والتخصيص","Add-ons and customization")}</h2>
     {!options.length&&<p>{t("لا توجد إضافات مسجلة لهذه الباقة.","No add-ons configured for this package.")}</p>}
     {options.map(o=>{const checked=o.is_required||selected.includes(o.id);const perPage=o.pricing_type==="per_page";return <div key={o.id} style={{padding:"15px 0",borderBottom:"1px solid #e4e9ef"}}>
      <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:o.is_required?"default":"pointer"}}>
       <input type="checkbox" checked={checked} disabled={o.is_required} onChange={()=>toggle(o.id)} style={{width:20,height:20,marginTop:3}}/>
       <span style={{flex:1}}><strong>{o.name}</strong>{o.is_required&&<small> ({t("إلزامية","required")})</small>}<small style={{display:"block",marginTop:4,color:"#64748b"}}>{o.description}</small><b style={{display:"block",marginTop:5}}>{money(Number(o.price))} {o.pricing_type==="monthly"?t("/ شهر","/ month"):o.pricing_type==="yearly"?t("/ سنة","/ year"):perPage?t("/ وحدة","/ unit"):""}</b></span>
      </label>
      {checked&&perPage&&<label style={{display:"flex",gap:10,alignItems:"center",marginTop:10}}>{t("الكمية","Quantity")}<input type="number" min={1} max={50} value={quantities[o.id]??1} onChange={e=>setQuantities(q=>({...q,[o.id]:Math.max(1,Math.min(50,Number(e.target.value)||1))}))} style={{width:80,padding:7,border:"1px solid #ccd5e1",borderRadius:8}}/></label>}
     </div>})}
    </section>
    <aside style={{background:"#edf3fa",padding:22,borderRadius:18,border:"1px solid #cfdeee",position:"sticky",top:12}}>
     <h2>{t("الفاتورة التقديرية المباشرة","Live itemized estimate")}</h2>
     <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:12}}><span>{pkg.name}</span><b>{pkg.is_custom_quote?t("حسب الطلب","Custom quote"):money(base)}</b></div>
     {lines.map(l=><div key={l.id} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"9px 0",borderTop:"1px solid #d5e0eb"}}><span>{l.name}{l.quantity>1?` × ${l.quantity}`:""}</span><b>{money(l.amount)}</b></div>)}
     <hr style={{border:0,borderTop:"1px solid #bdccda",margin:"18px 0"}}/>
     <p>{t("تنفيذ لمرة واحدة","One-time charges")}: <strong>{money(oneTime)}</strong></p>
     <p>{t("اشتراكات شهرية","Monthly recurring")}: <strong>{money(monthly)}</strong></p>
     <p>{t("اشتراكات سنوية","Yearly recurring")}: <strong>{money(yearly)}</strong></p>
     <p>{t("ضريبة التنفيذ","One-time VAT")}: <strong>{tax===null?t("تحدد لاحقًا","To be confirmed"):money(tax)}</strong></p>
     <h3>{t("إجمالي التنفيذ شامل الضريبة","One-time total incl. VAT")}: {total===null?t("بانتظار تحديد الضريبة","Pending tax rate"):money(total)}</h3>
     <small style={{display:"block",marginBottom:18}}>{t("الاشتراكات المتكررة منفصلة عن إجمالي التنفيذ. التقدير غير ملزم حتى تأكيد الطلب من الخادم.","Recurring charges are separate. This estimate is not a binding server-confirmed order.")}</small>
     {pkg.is_custom_quote&&<p>{t("الباقة تتطلب عرض سعر مخصصًا.","This package requires a custom quote.")}</p>}
     <button type="button" disabled={invalid} onClick={async()=>{try{await navigator.clipboard.writeText(summary);setCopied(true)}catch{setCopied(false)}}} style={{padding:"12px 18px",background:"#203958",color:"white",border:0,borderRadius:10,width:"100%",cursor:"pointer"}}>{copied?t("تم نسخ التفاصيل","Copied"):t("نسخ تفاصيل الفاتورة","Copy itemized estimate")}</button>
    </aside>
   </div>}
  </div>
 </main>;
}
