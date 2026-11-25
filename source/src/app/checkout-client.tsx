"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";

type QuoteLine={label:string;quantity:number;unitPricePiasters:number;period?:string};
type Checkout={
 quote:{id:number;revision:number;status:string;items:QuoteLine[];total_piasters:number;currency:string;valid_until:string|null;accepted_at:string|null};
 contract:{id:number;status:string;body_snapshot:string;signer_name:string|null;signed_at:string|null;template_category:string|null;template_revision:number|null;pdf_sha256?:string;pdf_filename?:string}|null;
 invoices:Array<{id:number;amount_piasters:number;verified_paid_piasters:number;status:string;due_at:string|null}>;
 changeRequests:Array<{id:number;details:string;status:string;created_at:string;resolution_note?:string|null}>;
 project:{id:string;status:string;template_id:string|null;draft_id:string}|null;
 payment:{gatewayConnected:boolean;canPayOnline:boolean;note:string};
};
const money=(piasters:number,currency="EGP")=>`${(Number(piasters)/100).toLocaleString("ar-EG",{minimumFractionDigits:2,maximumFractionDigits:2})} ${currency==="EGP"?"جنيه":currency}`;
const stageLabel:Record<string,string>={draft:"مسودة",issued:"في انتظار موافقتك",accepted:"موافق عليه",superseded:"نسخة قديمة",expired:"منتهي",unpaid:"بانتظار الدفع",part_paid:"مدفوع جزئيًا",paid:"تم الدفع بعد التحقق",void:"ملغي",signed:"موافقة مسجلة"};
export default function CustomerCheckout({locale="ar"}:{locale?:"ar"|"en"}){const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;const status=(v:string)=>en?({draft:"Draft",issued:"Awaiting approval",accepted:"Approved",superseded:"Superseded",expired:"Expired",unpaid:"Unpaid",part_paid:"Partially paid",paid:"Paid and verified",void:"Cancelled",signed:"Signed"} as Record<string,string>)[v]||v:stageLabel[v]||v;
 const {id}=useParams<{id:string}>();
 const [data,setData]=useState<Checkout|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [name,setName]=useState(""),[consent,setConsent]=useState(false),[changes,setChanges]=useState(""),[showChanges,setShowChanges]=useState(false);
 const refresh=async()=>{
  const response=await fetch(`/api/customer/commercial/quotes/${encodeURIComponent(id)}/checkout`,{credentials:"include",cache:"no-store"});
  if(response.status===401)throw Error("يجب تسجيل الدخول لعرض المستندات الخاصة بمشروعك.");
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||"عرض السعر غير متاح لهذا الحساب");
  setData(result);
 };
 useEffect(()=>{let active=true;void fetch(`/api/customer/commercial/quotes/${encodeURIComponent(id)}/checkout`,{credentials:"include",cache:"no-store"})
  .then(async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(r.status===401?"يجب تسجيل الدخول أولًا":body.error||"لا يمكن فتح هذا العرض لحسابك");return body})
  .then(body=>{if(active)setData(body)}).catch(err=>{if(active)setError(err instanceof Error?err.message:"تعذر تحميل العرض")}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[id]);
 const action=async(endpoint:string,body:unknown)=>{
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch(`/api/customer/commercial/quotes/${encodeURIComponent(id)}/${endpoint}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"تعذر تسجيل القرار، راجع المستند مرة أخرى");
   await refresh();
   if(endpoint==="accept")setSuccess("سُجل اعتماد العرض وإقرارك بالعقد، وأُعدّت الفاتورة دون تحصيل أي مبلغ. المرحلة التالية ربط بوابة الدفع.");
   else{setSuccess("وصل طلب التعديل إلى فريق ATSH AI، ولن يمكنك اعتماد هذه النسخة حتى تتم معالجة الملاحظة.");setShowChanges(false);setChanges("")}
  }catch(err){setError(err instanceof Error?err.message:"تعذر الاتصال بالخدمة") }finally{setBusy(false)}
 };
 const [financial,setFinancial]=useState<{methods:Array<{method:string;instructions:string}>;invoices:Array<{id:number;milestone:string;release_for_payment:boolean}>;canPay:boolean}|null>(null);
 const [balance,setBalance]=useState<{paidPiasters:number;remainingPiasters:number;creditPiasters:number;refundedPiasters:number}|null>(null);
 const [revisions,setRevisions]=useState<Array<{id:number;status:string;reason:string;proposed_total_piasters:number;contract_sha256:string}>>([]);
 const [revisionConsent,setRevisionConsent]=useState<Record<number,boolean>>({});
 const [financeError,setFinanceError]=useState("");
 useEffect(()=>{let active=true;const prefix=`/api/customer/commercial/quotes/${encodeURIComponent(id)}`;
  const get=async(path:string)=>{const r=await fetch(prefix+path,{credentials:"include",cache:"no-store"});if(!r.ok)throw Error("تعذر تحميل بيانات الدفع");return r.json();};
  void Promise.all([get("/payment-options"),get("/balance"),get("/revisions")]).then(([p,b,v])=>{if(active){setFinancial(p);setBalance(b);setRevisions(v.revisions||[]);setFinanceError("");}}).catch(e=>{if(active){setFinancial(null);setBalance(null);setRevisions([]);setFinanceError(String(e));}});
  return()=>{active=false};
 },[id,data]);
 async function decideRevision(revisionId:number,sha:string,decision:"accept"|"reject"){
  setBusy(true);setError("");try{const r=await fetch(`/api/customer/commercial/revisions/${revisionId}/decision`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,contractSha256:sha,consent:decision==="accept"&&revisionConsent[revisionId]===true})});const b=await r.json();if(!r.ok)throw Error(b.error||"تعذر حفظ القرار");await refresh();setSuccess("تم تسجيل قرارك");}catch(e){setError(String(e));}finally{setBusy(false);}
 }
 const pending=Boolean(data?.changeRequests.some(x=>x.status==="pending"));
 const canAccept=data?.quote.status==="issued"&&data.contract?.status==="issued"&&!pending&&(!data.quote.valid_until||new Date(data.quote.valid_until).getTime()>Date.now());
 if(loading)return <main lang={locale} dir={en?"ltr":"rtl"} style={{padding:30}}>{t("جارٍ تحميل عرض السعر الآمن…","Loading your secure quote…")}</main>;
 if(!data)return <main lang={locale} dir={en?"ltr":"rtl"} style={{maxWidth:800,margin:"auto",padding:26}}><h1>{t("مراجعة عرض السعر","Review your quotation")}</h1><p role="alert">{error}</p><Link href={`${base}/account/login`}>{t("تسجيل الدخول","Sign in")}</Link> · <Link href={`${base}/account/dashboard`}>{t("حسابي","My account")}</Link></main>;
 const quote=data.quote,contract=data.contract;
 return <main lang={locale} dir={en?"ltr":"rtl"} style={{maxWidth:920,margin:"0 auto",padding:"clamp(12px,4vw,25px)",minHeight:"100vh",background:"#f7f8fa",color:"#203958"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:15}}>
    <Link href={`${base}/account/dashboard`} style={{fontWeight:700,color:"#203958"}}>{t("← العودة إلى حساب العميل","← Back to my account")}</Link><Link href={`${base}/catalog`} style={{color:"#203958"}}>{t("الكتالوجات التفاعلية","Interactive catalog")}</Link>
  </header>
  <section style={{borderRadius:17,background:"linear-gradient(115deg,#203958,#315c88)",padding:"23px 20px",color:"white"}}>
   <small>{t("رحلة العميل · مراجعة المستندات المالية","Customer journey · Financial document review")}</small><h1 style={{margin:"7px 0"}}>عرض السعر رقم #{quote.id}</h1><p style={{margin:"5px 0"}}>الإصدار {quote.revision} · الحالة: {status(quote.status)}</p>
   <p style={{fontSize:13,opacity:.9}}>الصلاحية: {quote.valid_until?new Date(quote.valid_until).toLocaleDateString(en?"en-EG":"ar-EG"):"وفق شروط العرض"}</p>
  </section>
  <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"14px 0",fontSize:12}}>
   {["مراجعة نطاق العمل","اعتماد العرض والعقد","الفاتورة والدفع","التنفيذ والتسليم"].map((x,i)=><span key={x} style={{padding:"10px 12px",border:"1px solid #d6e1ed",borderRadius:12,background:i===0?"#e2f0e9":"white"}}>{i+1}. {x}</span>)}
  </div>
  <section style={{background:"white",padding:"clamp(14px,3vw,23px)",border:"1px solid #dce5ed",borderRadius:16,marginBottom:14}}>
   <h2 style={{marginTop:0,fontSize:22}}>{t("تفاصيل الخدمات والإضافات","Services and add-ons")}</h2>
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:340}}>
    <thead><tr><th style={{textAlign:"right",padding:11,borderBottom:"1px solid #d8e2eb"}}>{t("البيان","Description")}</th><th style={{padding:11,borderBottom:"1px solid #d8e2eb"}}>{t("الكمية","Quantity")}</th><th style={{padding:11,borderBottom:"1px solid #d8e2eb"}}>{t("الإجمالي","Total")}</th></tr></thead>
    <tbody>{(quote.items||[]).map((row,index)=><tr key={index}><td style={{padding:"12px 9px",borderBottom:"1px solid #edf1f5"}}>{row.label} {row.period&&<small style={{color:"#64748b"}}>({row.period==="monthly"?"شهري":row.period==="yearly"?"سنوي":"مرة واحدة"})</small>}</td><td style={{textAlign:"center"}}>{row.quantity}</td><td style={{textAlign:"center",whiteSpace:"nowrap"}}>{money(row.unitPricePiasters*row.quantity,quote.currency)}</td></tr>)}</tbody>
   </table></div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:"#f1f5fa",borderRadius:12,padding:15,marginTop:12}}><strong>{t("الإجمالي المعتمد قبل الدفع","Approved amount before payment")}</strong><strong style={{fontSize:22}}>{money(quote.total_piasters,quote.currency)}</strong></div>
   {data.project?.draft_id&&<Link href={`${base}/account/project-preview/${encodeURIComponent(data.project.draft_id)}`} style={{display:"inline-block",marginTop:14,color:"#174e83",fontWeight:700}}>{t("مشاهدة نسخة مشروعي ومواصفاته ←","Review my project specifications →")}</Link>}
  </section>
  <section style={{background:"white",padding:"clamp(14px,3vw,23px)",border:"1px solid #dce5ed",borderRadius:16,marginBottom:14}}>
   <h2 style={{marginTop:0,fontSize:22}}>{t("العقد وشروط الخدمة والتسليم","Contract, service and delivery terms")}</h2>
   {contract?<><p>رقم العقد: #{contract.id} — {status(contract.status)} — إصدار القالب {contract.template_revision||"—"}</p>
    {contract.pdf_sha256?<a href={`/api/customer/commercial/contracts/${contract.id}/pdf`} target="_blank" rel="noopener noreferrer">{t("تحميل العقد PDF","Download PDF contract")}</a>:<details open={quote.status==="issued"||undefined} style={{border:"1px solid #dbe4ee",borderRadius:12,padding:13,background:"#fbfcfe"}}><summary style={{cursor:"pointer",fontWeight:700}}>{t("اقرأ النص الكامل للعقد","Read the full contract")}</summary><div style={{whiteSpace:"pre-wrap",lineHeight:2,marginTop:14,overflowWrap:"anywhere"}}>{contract.body_snapshot}</div></details>}
    <p style={{fontSize:12,color:"#6b768a",lineHeight:1.7}}>{t("سيُسجل إقرارك إلكترونيًا مع نسخة المستند وبصمتها ووقت الموافقة. هذا لا يُعد توقيعًا إلكترونيًا مؤهلًا من مزود معتمد؛ يلزم تقييم المتطلبات القانونية قبل الاعتماد النهائي.","Your acceptance will be recorded with a copy and timestamp. This is not a qualified electronic signature; relevant legal requirements must be evaluated before final approval.")}</p>
   </>:<p>{t("لم تصدر الإدارة عقدًا صالحًا لهذا العرض بعد. لا يمكن تسجيل الموافقة قبل إصداره.","A valid contract has not yet been issued for this quote. Approval is unavailable until one is issued.")}</p>}
   {quote.status==="issued"&&<div style={{background:"#f5f8fc",borderRadius:12,padding:14,marginTop:14}}>
    {pending?<p role="status">{t("لديك طلب تعديل مفتوح؛ يجب مراجعته من الإدارة قبل قبول العرض.","You have an open revision request that must be reviewed before approval.")}</p>:<p>{t("إذا كانت المواصفات والرسوم وشروط الملكية مناسبة، يمكنك تسجيل موافقتك على إصدار العرض والعقد الحاليين.","If the scope, fees and ownership terms meet your expectations, you can approve the current quote and contract versions.")}</p>}
    <label style={{display:"grid",gap:6,marginBottom:12}}>{t("الاسم الكامل لصاحب الإقرار","Full name of person accepting")}<input value={name} onChange={e=>setName(e.target.value)} maxLength={160} placeholder="اسمك الثلاثي" style={{padding:12,border:"1px solid #cedbeb",borderRadius:9,fontSize:16}}/></label>
    <label style={{display:"flex",gap:9,alignItems:"flex-start",lineHeight:1.8}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> قرأت عرض السعر والعقد بإصداريهما الحاليين وأوافق صراحةً على تسجيل إقراري الإلكتروني.</label>
    <button type="button" disabled={!canAccept||busy||!consent||name.trim().length<3} onClick={()=>void action("accept",{contractId:contract?.id,quoteRevision:quote.revision,signerName:name.trim(),consent:true,contractSha256:contract?.pdf_sha256})} style={{marginTop:13,border:0,borderRadius:10,padding:"12px 19px",background:"#203958",color:"white",fontWeight:800,cursor:"pointer"}}>{busy?"جارٍ التحقق…":"اعتماد العرض وإقرار العقد ←"}</button>
    <button type="button" disabled={busy} onClick={()=>setShowChanges(v=>!v)} style={{marginInlineStart:9,border:"1px solid #cad7e4",padding:"12px 15px",borderRadius:10,background:"white"}}>{t("طلب تعديل على العرض","Request quote revisions")}</button>
    {showChanges&&<div style={{marginTop:12}}><label style={{display:"grid",gap:8}}>{t("ما البنود التي تريد تعديلها؟","Which items would you like to revise?")}<textarea rows={3} minLength={10} maxLength={2000} value={changes} onChange={e=>setChanges(e.target.value)} placeholder="حدد البنود أو الاختيارات المطلوبة بالتفصيل…" style={{padding:12,border:"1px solid #cdd8e4",borderRadius:9}}/></label><button type="button" disabled={busy||pending||changes.trim().length<10} onClick={()=>void action("request-changes",{details:changes.trim()})}>إرسال طلب التعديل للإدارة</button></div>}
   </div>}
   {(data.changeRequests||[]).length>0&&<details style={{marginTop:12}}><summary>سجل طلبات التعديل ({data.changeRequests.length})</summary>{data.changeRequests.map(change=><div key={change.id} style={{padding:10,borderBottom:"1px solid #e2e8f0"}}><strong>{change.status==="pending"?"بانتظار المراجعة":"تمت المراجعة"}</strong><p>{change.details}</p>{change.resolution_note&&<small>رد الإدارة: {change.resolution_note}</small>}</div>)}</details>}
  </section>
  <section style={{background:"white",padding:"clamp(14px,3vw,23px)",border:"1px solid #dce5ed",borderRadius:16,marginBottom:14}}>
   <h2 style={{marginTop:0,fontSize:22}}>{t("الفاتورة وحالة الدفع","Invoice and payment status")}</h2>
   {!data.invoices.length?<p>{t("تُجهز الفاتورة بعد اعتماد العقد، أو وفق جدول دفعات تُصدره الإدارة. لن يُخصم أي مبلغ الآن.","An invoice is prepared after contract approval or according to an agreed payment schedule. No payment is collected now.")}</p>:data.invoices.map(invoice=><article key={invoice.id} style={{border:"1px solid #dce5ec",borderRadius:12,padding:13,marginBottom:9}}>
     <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}><strong>فاتورة #{invoice.id}</strong><span>{status(invoice.status)}</span></div>
     <p>المستحق: {money(invoice.amount_piasters,quote.currency)} · المدفوع المؤكد: {money(invoice.verified_paid_piasters,quote.currency)}</p>
     <p style={{marginBottom:0}}>الرصيد: {money(invoice.amount_piasters-invoice.verified_paid_piasters,quote.currency)} {invoice.due_at?`· الاستحقاق ${new Date(invoice.due_at).toLocaleDateString("ar-EG")}`:"· تاريخ الاستحقاق يُحدد بالعقد"}</p>
    </article>)}
   {financeError&&<p role="alert">{financeError}</p>}
   {balance&&<div style={{padding:12,background:"#f1f5fa",borderRadius:10}}><p>{t("صافي المدفوع","Net paid")}: {money(balance.paidPiasters)}</p><p>{t("المتبقي","Outstanding")}: {money(balance.remainingPiasters)}</p><p>{t("رصيد للعميل","Customer credit")}: {money(balance.creditPiasters)}</p><p>{t("المسترد","Refunded")}: {money(balance.refundedPiasters)}</p></div>}
   {financial?.canPay&&<section><h3>{t("طرق السداد المتاحة","Available payment methods")}</h3>{financial.methods.map(m=><details key={m.method}><summary>{({cash:"نقدي",bank_transfer:"تحويل بنكي",instapay:"InstaPay",wallet_direct:"محفظة إلكترونية"} as Record<string,string>)[m.method]||m.method}</summary><p style={{whiteSpace:"pre-wrap"}}>{m.instructions}</p><small>{t("يؤكد السداد فريق الإدارة بعد الاستلام","Staff confirm payment after receipt")}</small></details>)}</section>}
   {revisions.length>0&&<section><h3>{t("تعديلات الفاتورة","Invoice revisions")}</h3>{revisions.map(v=><article key={v.id} style={{border:"1px solid #dce5ec",padding:12,borderRadius:10,marginBottom:8}}><p>{v.reason} — {money(v.proposed_total_piasters)} — {status(v.status)}</p><a href={`/api/customer/commercial/revisions/${v.id}/pdf`}>{t("تحميل ملحق العقد","Download amendment")}</a>{v.status==="issued"&&<div><label><input type="checkbox" checked={!!revisionConsent[v.id]} onChange={e=>setRevisionConsent(old=>({...old,[v.id]:e.target.checked}))}/>{t("قرأت الملحق وأوافق عليه","I have read and accept the amendment")}</label><button disabled={busy||!revisionConsent[v.id]} onClick={()=>void decideRevision(v.id,v.contract_sha256,"accept")}>{t("اعتماد","Accept")}</button><button disabled={busy} onClick={()=>void decideRevision(v.id,v.contract_sha256,"reject")}>{t("رفض","Reject")}</button></div>}</article>)}</section>}
   {!data.payment.canPayOnline&&<div role="status" style={{padding:14,borderRadius:12,background:"#fff5db",color:"#755114",lineHeight:1.9}}>⏳ الدفع الإلكتروني غير مفعل حاليًا. يمكنك اتباع طرق السداد اليدوية المتاحة أعلاه بعد اعتماد العقد.</div>}
   <Link href={`${base}/account/dashboard`} style={{display:"inline-block",marginTop:14,color:"#203958",fontWeight:700}}>{t("متابعة التنفيذ والتسليم في حسابي ←","Track project delivery in my account →")}</Link>
  </section>
  {success&&<p role="status" style={{padding:14,background:"#e6f7ed",color:"#186139",borderRadius:11}}>{success}</p>}
  {error&&<p role="alert" style={{padding:14,background:"#fff0ef",color:"#9f2525",borderRadius:11}}>{error}</p>}
 </main>;
}
