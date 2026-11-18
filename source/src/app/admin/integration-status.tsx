"use client";
import {useCallback,useEffect,useState} from "react";

type Status={
 api:boolean;database:boolean;
 catalog:{exists:boolean;published:boolean;total:number;visible:number};
 pricing:{publishedPackages:number};
 gpt:{configured:boolean};
 domains:{configured:boolean;mode:string};
 registration:{ready:boolean;emailDelivery:boolean};
 requiredSettings:{gpt:string[];domains:string[];registration:string[]};
};
export default function IntegrationStatus(){
 const [status,setStatus]=useState<Status|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/admin/integrations/status",{credentials:"include",cache:"no-store"});
   if(!response.ok)throw Error("لم نتمكن من فحص خدمات الموقع. تحقق من اتصال الـBackend وصلاحية المدير.");
   setStatus(await response.json());
  }catch(err){setError(err instanceof Error?err.message:"تعذر التحقق من الخدمات");setStatus(null);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load()},[load]);
 const label=(yes:boolean)=>yes?"جاهز من حيث الإعدادات":"غير مفعّل";
 const row=(name:string,ok:boolean,detail:string,setting?:string[])=><article key={name} style={{border:"1px solid #dce5f0",borderRadius:12,padding:16,marginBottom:12,background:"#fff"}}>
  <div style={{display:"flex",gap:12,justifyContent:"space-between",flexWrap:"wrap"}}>
   <strong>{name}</strong><span style={{fontWeight:700,color:ok?"#167345":"#9a5a12"}}>{label(ok)}</span>
  </div>
  <p style={{lineHeight:1.8}}>{detail}</p>
  {setting&&!ok&&<small dir="ltr" style={{display:"block",textAlign:"left",wordBreak:"break-word"}}>Coolify → Backend Environment: {setting.join(" · ")}</small>}
 </article>;
 return <section className="admin-content-card">
  <div className="admin-content-title"><div><h2>حالة الربط والتشغيل</h2><p>فحص إعدادات الخدمات مباشرة من الـBackend وقاعدة البيانات؛ لا تظهر مفاتيح أو كلمات مرور هنا. الإعداد الجاهز لا يثبت نجاح الاتصال بمزود خارجي قبل اختبار فعلي.</p></div>
   <button className="inline-add" type="button" onClick={()=>void load()} disabled={loading}>إعادة الفحص</button>
  </div>
  {loading&&<p role="status">جارٍ فحص الاتصال…</p>}
  {error&&<p role="alert" className="error-message">{error}</p>}
  {status&&<>
   {row("قاعدة البيانات والـBackend",status.api&&status.database,"استجاب الخادم واستطاع قراءة الكتالوج والباقات من PostgreSQL.")}
   {row("معرض الكتالوجات",status.catalog.exists&&status.catalog.published&&status.catalog.visible>0,
    `المحفوظ: ${status.catalog.total} · بطاقات منشورة: ${status.catalog.visible} · صفحة المعرض: ${status.catalog.published?"منشورة":"مخفية"}.`)}
   {row("باقات التسعير",status.pricing.publishedPackages>0,`الباقات المنشورة: ${status.pricing.publishedPackages}.`)}
   {row("المساعد GPT",status.gpt.configured,"يحتاج مفتاح OpenAI واسم النموذج في إعدادات الـBackend؛ لا يكفي وجود واجهة الدردشة.",status.requiredSettings.gpt)}
   {row("بحث الدومين من Namecheap",status.domains.configured&&status.domains.mode==="production",
    status.domains.configured?`وضع المزود: ${status.domains.mode==="sandbox"?"تجريبي (ليس توافرًا حقيقيًا)":"إنتاجي"}. يلزم اختبار طلب حقيقي.`:"لم تُضبط بيانات Namecheap المعتمدة على الخادم.",status.requiredSettings.domains)}
   {row("تسجيل العملاء وتأكيد البريد",status.registration.ready,
    "الاشتراك بالبريد يتطلب عنوان الموقع العام وبريد إرسال موثقًا في Brevo، ثم اختبار وصول رسالة التأكيد.",status.requiredSettings.registration)}
   <p style={{lineHeight:1.9}}>اختبر بعد النشر: <a href="/catalog" target="_blank" rel="noreferrer">الكتالوجات</a> · <a href="/account/register" target="_blank" rel="noreferrer">تسجيل عميل</a> · <a href="/account/login" target="_blank" rel="noreferrer">دخول العميل</a>. لا تختبر كلمات المرور أو المفاتيح عبر المحادثات.</p>
  </>}
 </section>;
}
