"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {interactiveDemoPaths,interactiveDemoSlug,type SectorTemplate} from "@/lib/sector-catalog";

type Preferences={sectorSlug?:string;sectorName?:string;businessName?:string;businessDescription?:string;brandColor?:string;domainName?:string;packageId?:string;sectorAddonCodes?:string[]};
type Draft={id:string;title:string;draft:Preferences;revision:number|string;linked_journey_id?:string|null};
type Preview={id:string;revision:string|number;approval_status:string;snapshot:Preferences;created_at:string;customer_comment?:string};
const box={background:"#fff",border:"1px solid #dae3ee",padding:18,borderRadius:15};
export default function CustomerProjectPreview({locale="ar"}:{locale?:"ar"|"en"}){const en=locale==="en";const base=en?"/en":"";const t=(ar:string,english:string)=>en?english:ar;
 const params=useParams<{id:string}>(),id=params.id;
 const [entry,setEntry]=useState<Draft|null>(null);
 const [template,setTemplate]=useState<(SectorTemplate&{demoSlug?:string})|null>(null);
 const [versions,setVersions]=useState<Preview[]>([]);
 const [active,setActive]=useState("لوحة القيادة");
 const [notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [form,setForm]=useState<Preferences>({});
 const [previewVersion,setPreviewVersion]=useState("");
 const [localRows,setLocalRows]=useState<{name:string;detail:string;status:string}[]>([]);
 const [newRow,setNewRow]=useState("");
 const [logoNonce,setLogoNonce]=useState(0);
 const [logoReady,setLogoReady]=useState(false);
 const load=async()=>{
  setLoading(true);
  try{
   const [draftResponse,catalogResponse,versionsResponse]=await Promise.all([
    fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}`,{credentials:"include",cache:"no-store"}),
    fetch("/api/site-content/catalog",{cache:"no-store"}),
    fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/previews`,{credentials:"include",cache:"no-store"})
   ]);
   if(!draftResponse.ok)throw Error("المشروع غير متاح لحسابك. سجّل الدخول ثم افتحه من لوحة حسابك.");
   const data=await draftResponse.json(),draft=data.projectDraft as Draft;
   setEntry(draft);setForm(draft.draft||{});
   let picked:(SectorTemplate&{demoSlug?:string})|undefined;
   if(catalogResponse.ok){
    const catalog=await catalogResponse.json();
    const items=catalog?.page?.content?.items;
    if(Array.isArray(items))picked=items.find((item:SectorTemplate&{published?:boolean;archived?:boolean})=>item?.slug===draft.draft?.sectorSlug&&item.published!==false&&!item.archived);
   }
   // An unpublished/archived catalog must not reappear via a static fallback.
   setTemplate(picked||null);
   setLocalRows(picked?.sampleRows||[]);
   setActive(picked?.modules?.[0]||"لوحة القيادة");
   if(versionsResponse.ok){const versions=await versionsResponse.json();setVersions(versions.previews||[]);}
   const logo=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/logo`,{credentials:"include",cache:"no-store"});
   setLogoReady(logo.ok);
   setNotice("");
  }catch(e){setNotice(e instanceof Error?e.message:"تعذر تحميل المشروع");}
  finally{setLoading(false);}
 };
 useEffect(()=>{if(id)void load();},[id]);
 const patch=(key:keyof Preferences,value:string)=>setForm(prev=>({...prev,[key]:value}));
 const save=async(event:FormEvent)=>{
  event.preventDefault();if(!entry)return;
  setSaving(true);setNotice("");
  try{
   const result=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}`,{method:"PATCH",credentials:"include",headers:{"content-type":"application/json"},
    body:JSON.stringify({expectedRevision:Number(entry.revision),title:entry.title,patch:{
      businessName:form.businessName||"",businessDescription:form.businessDescription||"",brandColor:form.brandColor||"#203958",domainName:form.domainName||"",sectorAddonCodes:Array.isArray(form.sectorAddonCodes)?form.sectorAddonCodes:[]
    }})});
   const payload=await result.json();
   if(!result.ok)throw Error(payload.error||"تعذر الحفظ");
   setEntry(payload.projectDraft);setForm(payload.projectDraft.draft);
   setNotice("تم حفظ تخصيص المشروع في حسابك. لإنشاء نسخة قابلة للاعتماد اضغط «حفظ إصدار المعاينة».");
  }catch(e){setNotice(e instanceof Error?e.message:"تعذر الحفظ؛ راجع نسخة المشروع");}
  finally{setSaving(false);}
 };
 const uploadLogo=async(file?:File)=>{
  if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2*1024*1024){setNotice("الشعار يجب أن يكون PNG أو JPEG أو WebP وأقل من 2 ميجابايت");return;}
  try{
   const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/logo`,{method:"POST",credentials:"include",headers:{"content-type":file.type},body:file});
   if(!response.ok)throw Error("فشل حفظ الشعار في هذا المشروع");
   setLogoNonce(x=>x+1);setLogoReady(true);setNotice("تم حفظ الشعار لهذا المشروع وحده.");
  }catch(e){setNotice(e instanceof Error?e.message:"تعذر حفظ الشعار");}
 };
 const saveVersion=async()=>{
  if(!entry)return;
  const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/previews`,{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:"{}"});
  if(!response.ok){setNotice("تعذر حفظ إصدار المعاينة");return;}
  await load();setNotice("تم إنشاء إصدار جديد من البيانات المحفوظة للمعاينة.");
 };
 const decision=async(item:Preview,status:"approved"|"changes_requested")=>{
  const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/previews/${encodeURIComponent(item.id)}/decision`,{
   method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({decision:status,comment:previewVersion})
  });
  if(!response.ok){setNotice("تعذر اعتماد المعاينة أو أن إصدارًا أحدث قد حل محلها");return;}
  await load();setNotice(status==="approved"?"تم اعتماد إصدار المعاينة. لا يعني ذلك اكتمال المشروع أو دفعه.":"تم تسجيل طلب التعديل.");
 };
 if(loading)return <main lang={locale} dir={en?"ltr":"rtl"} style={{padding:25}}>{t("جارٍ تحميل معاينة المشروع…","Loading your project preview…")}</main>;
 if(!entry)return <main lang={locale} dir={en?"ltr":"rtl"} style={{padding:25}}><p role="alert">{notice}</p><Link href={`${base}/account/dashboard`}>{t("العودة إلى حسابي","Back to my account")}</Link></main>;
 const brand=/^#[a-f0-9]{6}$/i.test(form.brandColor||"")?form.brandColor!:"#203958";
 const modules=template?.modules?.length?template.modules:["لوحة القيادة"];
 const fullDemo=template?interactiveDemoSlug(template.slug,template.demoSlug):undefined;
 return <main lang={locale} dir={en?"ltr":"rtl"} style={{maxWidth:1150,margin:"auto",padding:"20px",minHeight:"100vh",background:"#f6f8fb"}}>
  <header style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:15}}>
   <Link href={`${base}/account/dashboard`}>{t("← مشروعاتي","← My projects")}</Link>
   <Link href={`${base}/?draftId=${encodeURIComponent(id)}#configurator`}>{t("تكوين الباقة لهذا المشروع","Configure this project")}</Link>
  </header>
  <p style={{padding:12,borderRadius:10,background:"#fff2d2",color:"#854d0e",lineHeight:1.8}}>معاينة تفاعلية تجريبية لمشروعك. بيانات المحاكاة لا تُنشئ سجلات إنتاجية، والإضافات المختارة تُحفظ مع مواصفات المشروع وعرض السعر، لكنها لا تغير سلوك البرنامج التجريبي تلقائيًا في هذه المرحلة.</p>
  <section style={{...box,marginBottom:18}}>
   <h1 style={{color:brand,display:"flex",alignItems:"center",gap:12}}>
    {logoReady&&<img src={`/api/customer/auth/project-drafts/${encodeURIComponent(id)}/logo?v=${logoNonce}`} alt="شعار النشاط" style={{width:54,height:54,objectFit:"contain"}}/>}
    {form.businessName||entry.title}
   </h1>
   <p>{form.businessDescription||template?.description||"معاينة نموذج المشروع الخاص بك."}</p>
   {notice&&<p role="status" style={{background:"#eef6ff",padding:12,borderRadius:10}}>{notice}</p>}
   <form onSubmit={e=>void save(e)} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:12}}>
    <label>{t("اسم النشاط","Business name")}<input maxLength={120} value={form.businessName||""} onChange={e=>patch("businessName",e.target.value)}/></label>
    <label>{t("النص التعريفي","Business description")}<input maxLength={500} value={form.businessDescription||""} onChange={e=>patch("businessDescription",e.target.value)}/></label>
    <label>{t("لون الهوية","Brand color")}<input type="color" value={brand} onChange={e=>patch("brandColor",e.target.value)}/></label>
    <label>{t("الدومين المطلوب (غير محجوز)","Preferred domain (not reserved)")}<input maxLength={253} value={form.domainName||""} onChange={e=>patch("domainName",e.target.value)}/></label>
    {template&&Array.isArray((template as SectorTemplate&{pricedAddons?:Array<{code:string;name:string;price:number;pricingType:string}>}).pricedAddons)&&<fieldset style={{gridColumn:"1/-1",border:"1px solid #dbe5ef",borderRadius:12,padding:15}}>
      <legend style={{fontWeight:700}}>{t("إضافات النموذج في مشروعك","Project add-ons")}</legend>
      <p style={{fontSize:14,fontWeight:600,color:"#64748b"}}>{t("حدد الإضافات ثم احفظ تخصيص المشروع. التغيير يحتاج إعادة تسعير واعتماد عرض جديد إذا غيّر التكلفة.","Select add-ons and save your project. Changes that affect pricing require a revised and approved quote.")}</p>
      {((template as SectorTemplate&{pricedAddons?:Array<{code:string;name:string;price:number;pricingType:string}>}).pricedAddons||[]).map(addon=><label key={addon.code} style={{display:"flex",gap:10,padding:"9px 0",flexWrap:"wrap",alignItems:"center"}}>
        <input type="checkbox" checked={(form.sectorAddonCodes||[]).includes(addon.code)} onChange={event=>setForm(current=>({...current,sectorAddonCodes:event.target.checked?[...new Set([...(current.sectorAddonCodes||[]),addon.code])]: (current.sectorAddonCodes||[]).filter(code=>code!==addon.code)}))}/>
        <span>{addon.name}</span><span style={{marginInlineStart:"auto",fontWeight:600}}>{Number(addon.price).toLocaleString("ar-EG")} ج.م {addon.pricingType==="monthly"?"/ شهري":addon.pricingType==="yearly"?"/ سنوي":""}</span>
      </label>)}
      <Link href={`/?draftId=${encodeURIComponent(id)}#configurator`} style={{fontWeight:700,color:"#1b648f"}}>{t("انتقل للتسعير والتحقق من السعر النهائي ↗","Review final quote and pricing ↗")}</Link>
    </fieldset>}
    <div style={{gridColumn:"1/-1",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <button type="submit" disabled={saving} style={{background:brand,color:"#fff",border:0,padding:"12px 18px",borderRadius:9}}>{saving?"جارٍ الحفظ…":"حفظ تخصيص المشروع"}</button>
      <label>{t("رفع شعار لهذا المشروع","Upload project logo")}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadLogo(e.target.files?.[0])}/></label>
    </div>
   </form>
  </section>
  {fullDemo&&interactiveDemoPaths[fullDemo]&&<section aria-label="النموذج الكامل للمشروع" style={{...box,marginBottom:18}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:"0 0 4px"}}>{t("المعاينة التفاعلية الكاملة للنظام","Full interactive system demo")}</h2><p style={{fontSize:14,fontWeight:600,color:"#64748b"}}>جرّب جميع أقسام النظام. البيانات داخله تجريبية ولا تمثل ملفات مشروعك المحفوظة، ولا تنشئ فواتير حقيقية.</p></div><a href={interactiveDemoPaths[fullDemo]} target="_blank" rel="noopener noreferrer">فتح في نافذة مستقلة ↗</a></div>
   <iframe title={`معاينة ${template?.name} داخل مشروع العميل`} src={interactiveDemoPaths[fullDemo]} sandbox="allow-scripts allow-forms allow-modals" loading="lazy" referrerPolicy="no-referrer" style={{display:"block",width:"100%",minHeight:620,border:"1px solid #e2e8f0",borderRadius:12}} />
  </section>}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,200px),1fr))",gap:14}}> 
   <nav aria-label="أقسام المعاينة" style={{...box,alignSelf:"start",display:"flex",flexDirection:"column",gap:8}}>
    <strong>{t("القوائم","Menus")}</strong>{modules.map(name=><button type="button" aria-pressed={active===name} key={name} onClick={()=>setActive(name)} style={{textAlign:"right",border:0,borderRadius:8,background:active===name?brand:"#eef3fa",color:active===name?"#fff":"#203958",padding:12}}>{name}</button>)}
   </nav>
   <section style={{...box,gridColumn:"span 2"}}>
    <h2>{active}</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12}}>
     {(template?.sampleStats||[]).map(x=><div key={x.label} style={{padding:10,background:"#f2f6fa",borderRadius:10}}><small>{x.label}</small><h3 style={{color:brand}}>{x.value}</h3></div>)}
    </div>
    <h3>{t("سجلات تجريبية","Sample records")}</h3>
    <form onSubmit={e=>{e.preventDefault();if(!newRow.trim())return;setLocalRows(v=>[{name:newRow.trim(),detail:"أضيف في المتصفح فقط",status:"تجريبي"},...v]);setNewRow("");}} style={{display:"flex",gap:9,flexWrap:"wrap"}}>
     <input required maxLength={100} value={newRow} onChange={e=>setNewRow(e.target.value)} placeholder={t("إضافة سجل تجريبي","Add sample record")} aria-label="اسم السجل التجريبي"/>
     <button type="submit">{t("إضافة","Add")}</button>
    </form>
    <div style={{overflowX:"auto"}}><table style={{width:"100%",marginTop:12}}><tbody>{localRows.map((row,i)=><tr key={i}><td>{row.name}</td><td>{row.detail}</td><td>{row.status}</td><td><button type="button" onClick={()=>setLocalRows(items=>items.filter((_,index)=>index!==i))}>حذف تجريبي</button></td></tr>)}</tbody></table></div>
   </section>
  </div>
  <section style={{...box,marginTop:18}}>
   <h2>{t("إصدارات المعاينة والاعتماد","Preview versions & approval")}</h2>
   <p>{t("احفظ التخصيص أولًا، ثم أنشئ إصدار معاينة مستقلًا. تعتمد النسخة الأحدث فقط، مع الاحتفاظ بالإصدارات القديمة.","Save your changes and create a separate preview version. Only the latest version can be approved; previous versions remain available.")}</p>
   <button type="button" onClick={()=>void saveVersion()}>{t("حفظ إصدار المعاينة","Save preview version")}</button>
   <label style={{display:"block",marginTop:12}}>{t("ملاحظات الاعتماد أو طلب التعديل","Approval notes or revision request")}<input maxLength={2000} value={previewVersion} onChange={e=>setPreviewVersion(e.target.value)}/></label>
   <ul>{versions.map((v,i)=><li key={v.id} style={{padding:12,margin:"8px 0",border:"1px solid #e2e8f0",borderRadius:10}}>
     إصدار {v.revision} — {v.approval_status} — {new Date(v.created_at).toLocaleString("ar-EG")}
     {v.approval_status==="pending"&&i===0&&<div><button type="button" onClick={()=>void decision(v,"approved")}>{t("اعتماد","Approve")}</button><button type="button" onClick={()=>void decision(v,"changes_requested")}>{t("طلب تعديل","Request revision")}</button></div>}
     <details><summary>{t("بيانات الإصدار المحفوظ","Saved version details")}</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(v.snapshot,null,2)}</pre></details>
   </li>)}</ul>
  </section>
 </main>;
}
