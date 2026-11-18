"use client";
import {useEffect,useState,type FormEvent} from "react";
type FAQ={question:string;answer:string};
type Knowledge={overview:string;policies:string;faq:FAQ[]};
const initial:Knowledge={overview:"ATSH AI تقدم تصميم وتطوير المواقع والتطبيقات والأنظمة حسب المواصفات، مع خيارات دومين واستضافة وهوية بصرية ومحتوى ومساعد ذكي.",
policies:"كل عرض يتم تسعيره حسب الباقات والإضافات المنشورة، ثم يُراجع قبل إبرام التعاقد. توافر الدومين والسعر النهائي لا يُضمنان إلا بعد التحقق والشراء. الاشتراك يختلف عن شراء كود المشروع، وتحدد الحقوق وشروط الدعم في العقد.",faq:[]};
export default function AssistantKnowledge(){
 const [value,setValue]=useState<Knowledge>(initial);
 const [published,setPublished]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  fetch("/api/admin/pages",{credentials:"include",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Unauthorized");return r.json();})
   .then(result=>{if(!active)return;const page=(result.pages??[]).find((p:{slug:string;locale:string})=>p.slug==="assistant-knowledge"&&p.locale==="ar");
    if(page){setValue({overview:typeof page.content?.overview==="string"?page.content.overview:"",policies:typeof page.content?.policies==="string"?page.content.policies:"",faq:Array.isArray(page.content?.faq)?page.content.faq:[]});setPublished(Boolean(page.is_published));}
   }).catch(()=>{if(active)setError("تعذر تحميل معرفة المساعد. تحقق من صلاحياتك واتصال قاعدة البيانات.");}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false};
 },[]);
 const save=async(event:FormEvent)=>{
  event.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/admin/pages/assistant-knowledge",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({locale:"ar",content:{title:"معرفة مساعد ATSH AI",...value},isPublished:published})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data?.message||data?.error||"Save failed");
   setNotice(published?"حُفظت معرفة المساعد ونُشرت. ستستخدمها المحادثات الجديدة.":"حُفظت المعرفة كمسودة غير منشورة.");
  }catch(e){setError(e instanceof Error?e.message:"تعذر الحفظ");}
  finally{setBusy(false);}
 };
 if(loading)return <section className="admin-content-card">جارٍ تحميل قاعدة معرفة المساعد…</section>;
 return <section className="admin-content-card">
  <div className="admin-content-title"><div><h2>تعريف GPT بالشركة وخدماتها</h2>
  <p>ما تكتبه هنا يُضاف كمعلومات عامة مع الباقات والأسعار والكتالوجات المنشورة. لا تكتب مفاتيح API أو بيانات عملاء أو أسعار غير معتمدة.</p></div></div>
  {error&&<p className="error-message" role="alert">{error}</p>}{notice&&<p className="success-message" role="status">{notice}</p>}
  <form onSubmit={e=>void save(e)} className="admin-form-grid">
   <label className="admin-field">نبذة الشركة والخدمات<textarea value={value.overview} maxLength={3500} rows={6} onChange={e=>setValue(x=>({...x,overview:e.target.value}))}/></label>
   <label className="admin-field">قواعد الخدمة العامة والدفع والملكية والدعم<textarea value={value.policies} maxLength={3500} rows={7} onChange={e=>setValue(x=>({...x,policies:e.target.value}))}/></label>
   <div style={{gridColumn:"1 / -1"}}><h3>أسئلة شائعة يجيب عنها المساعد</h3>
    {value.faq.map((item,index)=><div key={index} style={{display:"grid",gap:8,background:"#f5f8fb",padding:12,borderRadius:12,marginBottom:10}}>
      <label className="admin-field">السؤال<input value={item.question} maxLength={250} onChange={e=>setValue(x=>({...x,faq:x.faq.map((entry,i)=>i===index?{...entry,question:e.target.value}:entry)}))}/></label>
      <label className="admin-field">الإجابة المعتمدة<textarea rows={3} value={item.answer} maxLength={900} onChange={e=>setValue(x=>({...x,faq:x.faq.map((entry,i)=>i===index?{...entry,answer:e.target.value}:entry)}))}/></label>
      <button type="button" className="inline-add" onClick={()=>setValue(x=>({...x,faq:x.faq.filter((_,i)=>i!==index)}))}>حذف السؤال</button>
    </div>)}
    <button type="button" disabled={value.faq.length>=40} className="button button-outline" onClick={()=>setValue(x=>({...x,faq:[...x.faq,{question:"",answer:""}]}))}>+ سؤال وإجابة</button>
   </div>
   <label className="check-row"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> نشر قاعدة المعرفة للمساعد</label>
   <div className="admin-actions"><button className="button" disabled={busy}>{busy?"جارٍ الحفظ…":"حفظ قاعدة معرفة GPT"}</button></div>
  </form>
 </section>;
}
