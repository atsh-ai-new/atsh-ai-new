"use client";
import {useEffect,useState} from "react";
type Review={quote:{id:number;status:string;items:{label:string;quantity:number;unitPricePiasters:number}[];totalPiasters:number;currency:string;validUntil:string|null};contract:{id:number;body:string;status:string;signedAt:string|null}};
export default function CommercialReview(){
 const [token,setToken]=useState("");const [review,setReview]=useState<Review|null>(null);const [name,setName]=useState("");const [consent,setConsent]=useState(false);const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [signed,setSigned]=useState(false);
 async function load(value=token){setBusy(true);setError("");try{const r=await fetch(`/api/commercial/review/${encodeURIComponent(value.trim())}`,{cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"تعذر فتح المستند");setReview(j)}catch(e){setError(e instanceof Error?e.message:"خطأ")}finally{setBusy(false)}}
 useEffect(()=>{
  const query=new URLSearchParams(window.location.search);
  const fromLink=query.get("token")||"";
  if(!/^[A-Za-z0-9_-]{43}$/.test(fromLink))return;
  setToken(fromLink);
  // Remove a one-time bearer URL secret from the visible address/history
  // before users share a screenshot or navigate away.
  window.history.replaceState(window.history.state,"",window.location.pathname);
  void load(fromLink);
  // Review is intentionally fetched once for the explicit link, not per keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function sign(){if(!review||!consent||name.trim().length<3)return;setBusy(true);setError("");try{const r=await fetch(`/api/commercial/review/${encodeURIComponent(token.trim())}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({signerName:name.trim(),consent:true})});const j=await r.json();if(!r.ok)throw Error(j.error||"تعذر التوقيع");setSigned(true)}catch(e){setError(e instanceof Error?e.message:"خطأ")}finally{setBusy(false)}}
 return <main dir="rtl" style={{maxWidth:800,margin:"2rem auto",padding:24,fontFamily:"Arial,sans-serif",color:"#203958"}}><h1>عرض السعر والعقد — ATSH AI</h1><p>راجع جميع البنود قبل الموافقة. التوقيع بالاسم وإقرار الموافقة؛ لا يعني دفع أي مبلغ.</p>
 {!review&&!signed&&<section className="no-print"><label>رمز المراجعة الخاص بك<input value={token} onChange={e=>setToken(e.target.value)} type="password" autoComplete="off" style={{display:"block",width:"100%",padding:12}}/></label><button disabled={busy||!token} onClick={load}>فتح العرض والعقد</button></section>}
 {review&&<article><h2>عرض السعر رقم {review.quote.id}</h2><p>الحالة: {review.quote.status} | الصلاحية: {review.quote.validUntil?new Date(review.quote.validUntil).toLocaleDateString("ar-EG"):"غير محددة"}</p><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>البند</th><th>الكمية</th><th>السعر بالجنيه</th></tr></thead><tbody>{review.quote.items.map((x,i)=><tr key={i}><td>{x.label}</td><td>{x.quantity}</td><td>{(x.unitPricePiasters/100).toFixed(2)}</td></tr>)}</tbody></table><p><strong>الإجمالي: {(review.quote.totalPiasters/100).toFixed(2)} {review.quote.currency}</strong></p><h2>العقد ونطاق العمل</h2><div style={{whiteSpace:"pre-wrap",padding:16,border:"1px solid #ccd5df"}}>{review.contract.body}</div><button className="no-print" onClick={()=>window.print()}>طباعة العرض والعقد</button>
 {!signed&&<section className="no-print" style={{marginTop:24}}><label>الاسم الكامل للتوقيع<input value={name} onChange={e=>setName(e.target.value)} maxLength={160} style={{display:"block",width:"100%",padding:12}}/></label><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> قرأت العرض والعقد وأوافق صراحةً على جميع البنود والتوقيع إلكترونيًا</label><br/><button disabled={busy||!consent||name.trim().length<3||review.quote.status!=="issued"} onClick={sign}>اعتماد العرض والتوقيع</button></section>}</article>}
 {signed&&<p role="status">تم تسجيل موافقتك وتوقيعك. الدفع لم يبدأ بعد. احتفظ بنسخة مطبوعة من العقد.</p>}{error&&<p role="alert" style={{color:"#a02020"}}>{error}</p>}
 <style>{`@media print {.no-print,button,input{display:none!important} body{background:white!important} main{margin:0!important}} table td,table th{border:1px solid #ccd5df;padding:8px;text-align:right}`}</style></main>
}
