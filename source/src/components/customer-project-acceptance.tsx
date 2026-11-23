"use client";
import {useEffect,useState} from "react";
type State={customer_approved_at:string|null;admin_approved_at:string|null;status:string};
export default function CustomerProjectAcceptance({projectId,locale="ar"}:{projectId:string;locale?:"ar"|"en"}){
 const en=locale==="en";const t=(ar:string,english:string)=>en?english:ar;
 const [state,setState]=useState<State|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[confirmed,setConfirmed]=useState(false);
 useEffect(()=>{let live=true;setLoading(true);setState(null);setConfirmed(false);setError("");fetch(`/api/customer/commercial/projects/${encodeURIComponent(projectId)}/acceptance`,{credentials:"include",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error(t("تعذر تحميل الموافقات","Unable to load approvals"));return r.json();}).then(d=>{if(live)setState(d.project);}).catch(e=>{if(live)setError(String(e.message||e));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false};},[projectId]);
 async function submit(decision:"approve"|"withdraw"){
  if(busy||(decision==="approve"&&!confirmed))return;setBusy(true);setError("");
  try{const r=await fetch(`/api/customer/commercial/projects/${encodeURIComponent(projectId)}/acceptance`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision})});const d=await r.json();if(!r.ok)throw Error(t("تعذر حفظ قرارك","Unable to save your decision"));setState(d.project);setConfirmed(false);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 return <section className="customer-acceptance-card" aria-label={t("اعتماد طلب المشروع","Project request approval")}><div className="customer-acceptance-title"><strong>{t("اعتماد طلب المشروع","Project request approval")}</strong><span>{state?.customer_approved_at&&state?.admin_approved_at?t("معتمد","Approved"):t("بانتظار الاعتماد","Pending approval")}</span></div>
 {loading?<p>{t("جارٍ التحميل...","Loading...")}</p>:state?<><div className="customer-acceptance-status"><span>{state.customer_approved_at?t("✓ موافقتك مسجلة","✓ Your approval recorded"):t("موافقتك مطلوبة","Your approval needed")}</span><span>{state.admin_approved_at?t("✓ اعتماد الإدارة","✓ Admin approved"):t("بانتظار الإدارة","Awaiting admin")}</span></div>
 {!state.customer_approved_at&&<label className="customer-acceptance-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>{t("راجعت تفاصيل الطلب والعرض المتاح وأوافق على اعتماده. هذه الموافقة لا تُعد سدادًا أو توقيعًا للعقد.","I reviewed the available request and offer details and approve the request. This does not constitute payment or contract signature.")}</span></label>}
 <div className="customer-acceptance-buttons">{state.customer_approved_at?<button type="button" disabled={busy} onClick={()=>void submit("withdraw")}>{t("سحب الموافقة","Withdraw approval")}</button>:<button type="button" disabled={busy||!confirmed} onClick={()=>void submit("approve")}>{busy?t("جارٍ الحفظ...","Saving..."):t("تأكيد موافقتي","Confirm approval")}</button>}</div></>:null}
 {error&&<p role="alert" className="customer-acceptance-error">{error}</p>}</section>;
}
