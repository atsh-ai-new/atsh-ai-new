"use client";
import { useEffect, useState, type FormEvent } from "react";
import { sectorTemplates, type SectorTemplate } from "@/lib/sector-catalog";

type CatalogItem = SectorTemplate & {published:boolean; archived:boolean; sortOrder:number; imageUrl:string; previewUrl:string; basePrice:number|null; addons:string[]};
const seed = (): CatalogItem[] => sectorTemplates.map((s,i)=>({...s,published:true,archived:false,sortOrder:i*10,imageUrl:"",previewUrl:"",basePrice:null,addons:[]}));
const empty = (): CatalogItem => ({slug:"",name:"",category:"",icon:"📁",description:"",features:[],modules:["لوحة القيادة"],sampleStats:[],sampleRows:[],note:"معاينة تجريبية",published:false,archived:false,sortOrder:100,imageUrl:"",previewUrl:"",basePrice:null,addons:[]});
const normalize = (v: unknown): CatalogItem[] => Array.isArray(v) ? v.filter(x=>x && typeof x==="object" && typeof x.slug==="string" && typeof x.name==="string").map(x=>({...empty(),...x,features:Array.isArray(x.features)?x.features:[],modules:Array.isArray(x.modules)?x.modules:[],sampleStats:Array.isArray(x.sampleStats)?x.sampleStats:[],sampleRows:Array.isArray(x.sampleRows)?x.sampleRows:[],addons:Array.isArray(x.addons)?x.addons:[]})) : seed();
export default function CatalogManager() {
  const [items,setItems]=useState<CatalogItem[]>([]);
  const [draft,setDraft]=useState<CatalogItem>(empty());
  const [originalSlug,setOriginalSlug]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [ready,setReady]=useState(false);
  const [version,setVersion]=useState(0);
  const [pageWasPublished,setPageWasPublished]=useState(true);

  useEffect(()=>{
    let active=true;
    fetch("/api/admin/pages",{credentials:"include",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("تعذر قراءة الكتالوج. تحقق من تسجيل الدخول وصلاحياتك.");return r.json();}).then(data=>{
      if(!active)return;
      const catalog=(data.pages??[]).find((p:{slug:string;locale:string})=>p.slug==="catalog" && p.locale==="ar");
      const raw=catalog?.content?.items;
      setItems(normalize(raw));
      setPageWasPublished(catalog?.is_published!==false);
      setReady(true);
      if(!catalog)setNotice("لا توجد صفحة كتالوج محفوظة بعد. احفظ لنشر النسخة الأولية.");
    }).catch(e=>active&&setError(e instanceof Error?e.message:"تعذر تحميل الكتالوج."));
    return()=>{active=false;};
  },[version]);

  const saveAll=async(next:CatalogItem[],message:string)=>{
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/admin/pages/catalog",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({locale:"ar",isPublished:pageWasPublished,content:{title:"معرض الأنظمة",items:next}})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.message||data.error||"تعذر الحفظ");
      setItems(next);setNotice(message);setVersion(v=>v+1);
    }catch(e){setError(e instanceof Error?e.message:"فشل الحفظ");}
    finally{setBusy(false);}
  };
  const saveItem=async(e:FormEvent)=>{
    e.preventDefault();
    const slug=draft.slug.trim().toLowerCase();
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){setError("الرابط يجب أن يكون بحروف إنجليزية وأرقام وشرطات فقط.");return;}
    if(slug!==originalSlug && items.some(x=>x.slug===slug)){setError("الرابط مستخدم بالفعل.");return;}
    const updated={...draft,slug,name:draft.name.trim(),description:draft.description.trim()};
    if(!updated.name){setError("اسم الكتالوج مطلوب.");return;}
    const next=originalSlug?items.map(x=>x.slug===originalSlug?updated:x):[...items,updated];
    await saveAll(next,"تم حفظ الكتالوج وتحديث حالته.");
    setDraft(empty());setOriginalSlug("");
  };
  const edit=(item:CatalogItem)=>{setDraft({...item});setOriginalSlug(item.slug);setError("");setNotice("");};
  const update=(key:keyof CatalogItem,value:unknown)=>setDraft(d=>({...d,[key]:value}));
  const toggle=async(item:CatalogItem,patch:Partial<CatalogItem>)=>saveAll(items.map(x=>x.slug===item.slug?{...x,...patch}:x),"تم تحديث حالة الكتالوج.");
  const archive=async(item:CatalogItem)=>{
    if(!window.confirm("سيُخفى الكتالوج من المعرض دون حذف بياناته. متابعة؟"))return;
    await toggle(item,{archived:true,published:false});
  };
  const field=(label:string,value:string,onChange:(value:string)=>void,area=false)=> <label className="admin-field">{label}{area?<textarea value={value} onChange={e=>onChange(e.target.value)} rows={3}/>:<input value={value} onChange={e=>onChange(e.target.value)} maxLength={2000}/>}</label>;

  return <div className="cms-workspace">
    <section className="admin-content-card"><div className="admin-content-title"><div><h2>إدارة كتالوجات ومعاينات القطاعات</h2><p>إضافة وتعديل وإخفاء وأرشفة الكتالوجات. تُحفظ التغييرات على خادم المنصة عبر صلاحيات الإدارة، وليس داخل المتصفح.</p></div></div>
      {notice&&<p role="status" className="success-message">{notice}</p>}{error&&<p role="alert" className="error-message">{error}</p>}
      {!ready?<p>جارٍ تحميل الكتالوجات…</p>:<>
        <div className="admin-actions"><button type="button" className="button button-outline" onClick={()=>{setOriginalSlug("");setDraft(empty());}}>+ كتالوج جديد</button><a className="inline-add" href="/catalog" target="_blank" rel="noreferrer">عرض المعرض ↗</a></div>
        <div className="admin-team-list">{items.map(item=><article className="admin-team-row" key={item.slug} style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <strong>{item.icon} {item.name}</strong><span>{item.category}</span><span>{item.archived?"مؤرشف":item.published?"منشور":"مسودة"}</span>
          <button type="button" className="inline-add" disabled={busy} onClick={()=>edit(item)}>تعديل</button>
          <button type="button" className="inline-add" disabled={busy||item.archived} onClick={()=>void toggle(item,{published:!item.published})}>{item.published?"إخفاء":"نشر"}</button>
          {item.archived?<button type="button" className="inline-add" disabled={busy} onClick={()=>void toggle(item,{archived:false})}>استعادة</button>:<button type="button" className="inline-add" disabled={busy} onClick={()=>void archive(item)}>أرشفة</button>}
        </article>)}</div>
      </>}
    </section>
    {ready&&<section className="admin-content-card"><h2>{originalSlug?"تعديل الكتالوج":"إضافة كتالوج"}</h2>
      <form onSubmit={e=>void saveItem(e)} className="admin-form-grid">
        {field("الاسم",draft.name,v=>update("name",v))}
        <label className="admin-field">الرابط (Slug)<input required disabled={Boolean(originalSlug)} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e=>update("slug",e.target.value.toLowerCase())}/></label>
        {field("القطاع",draft.category,v=>update("category",v))}
        {field("الأيقونة",draft.icon,v=>update("icon",v))}
        {field("الوصف",draft.description,v=>update("description",v),true)}
        {field("المزايا — كل ميزة بسطر",draft.features.join("\n"),v=>update("features",v.split("\n").map(x=>x.trim()).filter(Boolean)),true)}
        {field("أقسام المعاينة — كل قسم بسطر",draft.modules.join("\n"),v=>update("modules",v.split("\n").map(x=>x.trim()).filter(Boolean)),true)}
        {field("رابط الصورة HTTPS أو ملف مرفوع",draft.imageUrl,v=>update("imageUrl",v))}
        {field("رابط معاينة خارجية HTTPS (اختياري)",draft.previewUrl,v=>update("previewUrl",v))}
        <label className="admin-field">سعر أساسي استرشادي (جنيه) — السعر النهائي من محرك التسعير<input type="number" min="0" step="0.01" value={draft.basePrice??""} onChange={e=>update("basePrice",e.target.value===""?null:Number(e.target.value))}/></label>
        <label className="admin-field">ترتيب الظهور<input type="number" value={draft.sortOrder} onChange={e=>update("sortOrder",Number(e.target.value))}/></label>
        <label className="check-row"><input type="checkbox" checked={draft.published} onChange={e=>update("published",e.target.checked)}/> منشور في المعرض</label>
        <div className="admin-actions"><button type="submit" className="button" disabled={busy}>{busy?"جارٍ الحفظ…":"حفظ الكتالوج"}</button></div>
      </form>
      <p className="field-hint">لا يتم حذف الكتالوج نهائيًا حتى لا تتأثر روابط العملاء وطلباتهم السابقة. الصور والمقاطع ترتبط بعناوين وسائط معتمدة؛ رفع الملفات المباشر سيُضاف لاحقًا.</p>
    </section>}
  </div>;
}
