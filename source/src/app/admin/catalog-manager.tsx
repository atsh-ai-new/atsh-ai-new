"use client";
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { sectorTemplates, interactiveDemoPaths, type SectorTemplate } from "@/lib/sector-catalog";
import { normalizeCatalogSectors, defaultCatalogPlacements, resolvePlacement, validCatalogId, canRemoveSector, canRemoveSubcategory, type CatalogSector } from "@/lib/catalog-sectors";

type PricedAddon={code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"};
type CatalogItem = SectorTemplate & {published:boolean; archived:boolean; sortOrder:number; imageUrl:string; previewUrl:string; demoSlug?:string; basePrice:number|null; addons:string[];pricedAddons:PricedAddon[];sectorId?:string;subcategoryId?:string};
const defaultPricedAddons=():PricedAddon[]=>[
 {code:"extra_page",name:"صفحة إضافية (لكل صفحة)",price:1000,pricingType:"fixed"},
 {code:"logo_design",name:"تصميم شعار",price:1000,pricingType:"fixed"},
 {code:"visual_identity",name:"هوية بصرية كاملة",price:1000,pricingType:"fixed"},
 {code:"domain",name:"دومين (سنة)",price:1000,pricingType:"yearly"},
 {code:"hosting",name:"استضافة (سنة)",price:1000,pricingType:"yearly"},
 {code:"extra_feature",name:"ميزة إضافية",price:1000,pricingType:"fixed"}
];
const seed = (): CatalogItem[] => sectorTemplates.map((s,i)=>({...s,published:true,archived:false,sortOrder:i*10,imageUrl:"",previewUrl:"",demoSlug:s.slug,basePrice:5000,addons:[],pricedAddons:defaultPricedAddons()}));
const empty = (): CatalogItem => ({slug:"",name:"",category:"",icon:"📁",description:"",features:[],modules:["لوحة القيادة"],sampleStats:[],sampleRows:[],note:"معاينة تجريبية",published:false,archived:false,sortOrder:100,imageUrl:"",previewUrl:"",demoSlug:"",basePrice:5000,addons:[],pricedAddons:defaultPricedAddons()});
const normalize = (v: unknown): CatalogItem[] => Array.isArray(v) ? v.filter(x=>x && typeof x==="object" && typeof x.slug==="string" && typeof x.name==="string").map(x=>({...empty(),...x,features:Array.isArray(x.features)?x.features:[],modules:Array.isArray(x.modules)?x.modules:[],sampleStats:Array.isArray(x.sampleStats)?x.sampleStats:[],sampleRows:Array.isArray(x.sampleRows)?x.sampleRows:[],addons:Array.isArray(x.addons)?x.addons:[],pricedAddons:Array.isArray(x.pricedAddons)?x.pricedAddons:defaultPricedAddons()})) : seed();
export default function CatalogManager() {
  const [items,setItems]=useState<CatalogItem[]>([]);
  const [sectors,setSectors]=useState<CatalogSector[]>(normalizeCatalogSectors(undefined));
  const [sectorDraft,setSectorDraft]=useState({id:"",name:"",icon:"📁",description:""});
  const [subDraft,setSubDraft]=useState({sectorId:"",id:"",name:""});
  const [draft,setDraft]=useState<CatalogItem>(empty());
  const [originalSlug,setOriginalSlug]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [ready,setReady]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [addonText,setAddonText]=useState(defaultPricedAddons().map(x=>[x.code,x.name,x.price,x.pricingType].join(" | ")).join("\n"));
  const [version,setVersion]=useState(0);
  const [updatedAt,setUpdatedAt]=useState<string|null>(null);
  const [pageWasPublished,setPageWasPublished]=useState(true);

  useEffect(()=>{
    let active=true;
    fetch("/api/admin/pages",{credentials:"include",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("تعذر قراءة الكتالوج. تحقق من تسجيل الدخول وصلاحياتك.");return r.json();}).then(data=>{
      if(!active)return;
      const catalog=(data.pages??[]).find((p:{slug:string;locale:string})=>p.slug==="catalog" && p.locale==="ar");
      const raw=catalog?.content?.items;
      setItems(normalize(raw));
      setSectors(normalizeCatalogSectors(catalog?.content?.sectors));
      setPageWasPublished(catalog?.is_published!==false);
      setUpdatedAt(catalog?.updated_at?new Date(catalog.updated_at).toISOString():null);
      setReady(true);
      if(!catalog)setNotice("لا توجد صفحة كتالوج محفوظة بعد. احفظ لنشر النسخة الأولية.");
    }).catch(e=>active&&setError(e instanceof Error?e.message:"تعذر تحميل الكتالوج."));
    return()=>{active=false;};
  },[version]);

  const uploadImage=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)){setError("اختر صورة PNG أو JPEG أو WebP.");event.target.value="";return;}
    if(file.size>5*1024*1024){setError("حجم الصورة لا يجب أن يزيد عن 5 ميجابايت.");event.target.value="";return;}
    setUploading(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/admin/media",{method:"POST",credentials:"include",headers:{"Content-Type":file.type,"X-File-Name":encodeURIComponent(file.name)},body:file});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||typeof payload?.media?.url!=="string")throw Error(payload?.message||"تعذر رفع الصورة.");
      update("imageUrl",payload.media.url);
      setNotice("تم رفع الصورة. اضغط حفظ الكتالوج لتثبيت استخدامها.");
    }catch(e){setError(e instanceof Error?e.message:"فشل رفع الصورة.");}
    finally{setUploading(false);event.target.value="";}
  };
  const saveAll=async(next:CatalogItem[],message:string,nextSectors:CatalogSector[]=sectors)=>{
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/admin/pages/catalog",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({locale:"ar",isPublished:pageWasPublished,expectedUpdatedAt:updatedAt,content:{title:"معرض الأنظمة",items:next,sectors:nextSectors}})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.message||data.error||"تعذر الحفظ");
      setItems(next);setSectors(nextSectors);setNotice(message);setUpdatedAt(data?.page?.updated_at?new Date(data.page.updated_at).toISOString():updatedAt);setVersion(v=>v+1);
      return true;
    }catch(e){setError(e instanceof Error?e.message:"فشل الحفظ");return false;}
    finally{setBusy(false);}
  };
  const saveItem=async(e:FormEvent)=>{
    e.preventDefault();
    const slug=draft.slug.trim().toLowerCase();
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){setError("الرابط يجب أن يكون بحروف إنجليزية وأرقام وشرطات فقط.");return;}
    if(slug!==originalSlug && items.some(x=>x.slug===slug)){setError("الرابط مستخدم بالفعل.");return;}
    const pricedAddons:PricedAddon[]=[];
    const codes=new Set<string>();
    for(const raw of addonText.split("\n").map(x=>x.trim()).filter(Boolean)){
      const [code,name,priceText,type]=raw.split("|").map(x=>x.trim());
      const amount=Number(priceText);
      if(!/^[a-z0-9_-]{1,80}$/.test(code)||!name||codes.has(code)||!Number.isFinite(amount)||amount<0||Math.round(amount*100)!==Math.round(amount*10000)/100||!["fixed","monthly","yearly"].includes(type)){
        setError("صيغة الإضافة: code | اسم الإضافة | السعر | fixed أو monthly أو yearly. يجب عدم تكرار الرمز.");return;
      }
      codes.add(code);pricedAddons.push({code,name,price:amount,pricingType:type as PricedAddon["pricingType"]});
    }
    if(draft.previewUrl.trim()){try{const url=new URL(draft.previewUrl.trim());if(url.protocol!=="https:")throw Error();}catch{setError("رابط المعاينة يجب أن يكون رابط HTTPS صالحًا للنظام المنشور.");return;}}
    if(draft.basePrice!==null&&(!Number.isFinite(draft.basePrice)||draft.basePrice<0)){setError("أدخل سعر بيع صحيحًا للكتالوج، أو اتركه فارغًا حتى تحديد السعر.");return;}
    const updated={...draft,previewUrl:draft.previewUrl.trim(),pricedAddons,slug,name:draft.name.trim(),description:draft.description.trim()};
    if(!updated.name){setError("اسم الكتالوج مطلوب.");return;}
    const placement=resolvePlacement(updated,sectors);
    if(!placement.sector||!updated.sectorId){setError("اختر قطاعًا رئيسيًا صالحًا.");return;}
    if(updated.subcategoryId&&!placement.subcategory){setError("اختر تصنيفًا فرعيًا تابعًا لهذا القطاع.");return;}
    updated.category=placement.subcategory?.name||placement.sector.name;
    const next=originalSlug?items.map(x=>x.slug===originalSlug?updated:x):[...items,updated];
    if(await saveAll(next,"تم حفظ الكتالوج وتحديث حالته.")){
      setDraft(empty());setAddonText(defaultPricedAddons().map(x=>[x.code,x.name,x.price,x.pricingType].join(" | ")).join("\n"));setOriginalSlug("");
    }
  };
  const applyDemoPrices=async()=>{
    if(!window.confirm("تطبيق أسعار تجريبية: ٥٠٠٠ ج.م لكل كتالوج بلا سعر، و١٠٠٠ ج.م لكل إضافة جديدة. لن تُستبدل الأسعار التي حددتها سابقًا. متابعة؟"))return;
    const next=items.map(item=>({...item,basePrice:item.basePrice===null?5000:item.basePrice,pricedAddons:[...item.pricedAddons,...defaultPricedAddons().filter(addon=>!item.pricedAddons.some(existing=>existing.code===addon.code))]}));
    await saveAll(next,"تم حفظ الأسعار التجريبية للكتالوجات والإضافات دون تغيير الأسعار الموجودة.");
  };
  const importStarter=async()=>{
    const used=new Set(items.map(item=>item.slug));
    const starter=seed().filter(item=>!used.has(item.slug)).map(item=>({...item,...(defaultCatalogPlacements[item.slug]??{})}));
    if(!starter.length){setNotice("النماذج المبدئية موجودة بالفعل. راجع نشر وإخفاء كل نموذج.");return;}
    if(!window.confirm("استيراد نماذج توضيحية ناقصة بدون استبدال بياناتك أو أسعارك؟"))return;
    await saveAll([...items,...starter],"تم استيراد نماذج توضيحية مبدئية. لا تمثل أنظمة تجارية جاهزة.");
  };
  const edit=(item:CatalogItem)=>{const place=resolvePlacement(item,sectors);setDraft({...item,sectorId:place.sector?.id,subcategoryId:place.subcategory?.id});setAddonText(item.pricedAddons.map(x=>[x.code,x.name,x.price,x.pricingType].join(" | ")).join("\n"));setOriginalSlug(item.slug);setError("");setNotice("");};
  const update=(key:keyof CatalogItem,value:unknown)=>setDraft(d=>({...d,[key]:value}));
  const toggle=async(item:CatalogItem,patch:Partial<CatalogItem>)=>saveAll(items.map(x=>x.slug===item.slug?{...x,...patch}:x),"تم تحديث حالة الكتالوج.");
  const archive=async(item:CatalogItem)=>{
    if(!window.confirm("سيُخفى الكتالوج من المعرض دون حذف بياناته. متابعة؟"))return;
    await toggle(item,{archived:true,published:false});
  };
  const saveSector=async(e:FormEvent)=>{
    e.preventDefault();
    const id=sectorDraft.id.trim().toLowerCase(),name=sectorDraft.name.trim();
    if(!validCatalogId(id)||!name){setError("حدد رمز قطاع إنجليزيًا واسمًا صحيحًا.");return;}
    if(sectors.some(x=>x.id===id)){setError("رمز القطاع موجود بالفعل، استخدم تعديل القطاع الموجود.");return;}
    if(await saveAll(items,"تم إضافة القطاع الرئيسي.",[...sectors,{...sectorDraft,id,name,sortOrder:sectors.length*10,isPublished:true,subcategories:[]}])){
      setSectorDraft({id:"",name:"",icon:"📁",description:""});
    }
  };
  const saveSubcategory=async(e:FormEvent)=>{
    e.preventDefault();
    const id=subDraft.id.trim().toLowerCase(),name=subDraft.name.trim();
    if(!validCatalogId(id)||!name||!sectors.some(s=>s.id===subDraft.sectorId)){setError("حدد قطاعًا ورمز تصنيف صحيحين.");return;}
    if(sectors.find(s=>s.id===subDraft.sectorId)?.subcategories.some(c=>c.id===id)){setError("رمز التصنيف مستخدم داخل القطاع.");return;}
    if(await saveAll(items,"تم إضافة التصنيف الفرعي.",sectors.map(s=>s.id===subDraft.sectorId?{...s,subcategories:[...s.subcategories,{id,name,sortOrder:s.subcategories.length*10,isPublished:true}]}:s))){
      setSubDraft({sectorId:"",id:"",name:""});
    }
  };
  const renameSector=async(sector:CatalogSector)=>{
    const value=window.prompt("اسم القطاع الجديد",sector.name)?.trim();
    if(!value||value===sector.name)return;
    const next=sectors.map(s=>s.id===sector.id?{...s,name:value}:s);
    await saveAll(items,"تم تعديل اسم القطاع.",next);
  };
  const editSectorDetails=async(sector:CatalogSector)=>{
    const icon=window.prompt("أيقونة القطاع",sector.icon);
    if(icon===null)return;
    const description=window.prompt("وصف القطاع",sector.description);
    if(description===null)return;
    const next=sectors.map(row=>row.id===sector.id?{...row,icon:icon.slice(0,12),description:description.slice(0,500)}:row);
    await saveAll(items,"تم تحديث تفاصيل القطاع.",next);
  };
  const moveSector=async(id:string,direction:-1|1)=>{
    const sorted=[...sectors].sort((a,b)=>a.sortOrder-b.sortOrder);
    const index=sorted.findIndex(x=>x.id===id),other=index+direction;
    if(index<0||other<0||other>=sorted.length)return;
    [sorted[index],sorted[other]]=[sorted[other],sorted[index]];
    await saveAll(items,"تم تعديل ترتيب القطاعات.",sorted.map((x,i)=>({...x,sortOrder:i*10})));
  };
  const moveSubcategory=async(sector:CatalogSector,id:string,direction:-1|1)=>{
    const sorted=[...sector.subcategories].sort((a,b)=>a.sortOrder-b.sortOrder);
    const index=sorted.findIndex(x=>x.id===id),other=index+direction;
    if(index<0||other<0||other>=sorted.length)return;
    [sorted[index],sorted[other]]=[sorted[other],sorted[index]];
    const next=sectors.map(x=>x.id===sector.id?{...x,subcategories:sorted.map((c,i)=>({...c,sortOrder:i*10}))}:x);
    await saveAll(items,"تم تعديل ترتيب التصنيفات.",next);
  };
  const renameSubcategory=async(sector:CatalogSector,subId:string)=>{
    const old=sector.subcategories.find(x=>x.id===subId);
    if(!old)return;
    const value=window.prompt("اسم التصنيف الفرعي الجديد",old.name)?.trim();
    if(!value||value===old.name)return;
    const next=sectors.map(s=>s.id===sector.id?{...s,subcategories:s.subcategories.map(c=>c.id===subId?{...c,name:value}:c)}:s);
    await saveAll(items,"تم تعديل اسم التصنيف.",next);
  };
  const toggleSector=async(sector:CatalogSector)=>saveAll(items,"تم تحديث حالة القطاع.",sectors.map(s=>s.id===sector.id?{...s,isPublished:!s.isPublished}:s));
  const toggleSubcategory=async(sector:CatalogSector,subId:string)=>saveAll(items,"تم تحديث حالة التصنيف.",sectors.map(s=>s.id===sector.id?{...s,subcategories:s.subcategories.map(c=>c.id===subId?{...c,isPublished:!c.isPublished}:c)}:s));
  const deleteSector=async(sector:CatalogSector)=>{
    if(!canRemoveSector(sector.id,items,sectors)){setError("القطاع مرتبط بكتالوجات. انقلها أولًا قبل الحذف.");return;}
    if(!window.confirm("حذف هذا القطاع وتصنيفاته غير المستخدمة؟"))return;
    await saveAll(items,"تم حذف القطاع غير المستخدم.",sectors.filter(s=>s.id!==sector.id));
  };
  const deleteSubcategory=async(sector:CatalogSector,subId:string)=>{
    if(!canRemoveSubcategory(sector.id,subId,items,sectors)){setError("التصنيف مرتبط بكتالوجات. انقلها أولًا قبل الحذف.");return;}
    if(!window.confirm("حذف التصنيف الفرعي غير المستخدم؟"))return;
    await saveAll(items,"تم حذف التصنيف غير المستخدم.",sectors.map(s=>s.id===sector.id?{...s,subcategories:s.subcategories.filter(c=>c.id!==subId)}:s));
  };
  const field=(label:string,value:string,onChange:(value:string)=>void,area=false)=> <label className="admin-field">{label}{area?<textarea value={value} onChange={e=>onChange(e.target.value)} rows={3}/>:<input value={value} onChange={e=>onChange(e.target.value)} maxLength={2000}/>}</label>;

  return <div className="cms-workspace">
    <section className="admin-content-card"><div className="admin-content-title"><div><h2>إدارة كتالوجات ومعاينات القطاعات</h2><p>إضافة وتعديل وإخفاء وأرشفة الكتالوجات. تُحفظ التغييرات على خادم المنصة عبر صلاحيات الإدارة، وليس داخل المتصفح.</p></div></div>
      {notice&&<p role="status" className="success-message">{notice}</p>}{error&&<p role="alert" className="error-message">{error}</p>}
      {!ready?<p>جارٍ تحميل الكتالوجات…</p>:<>
        <div className="admin-actions">
          <button type="button" className="button button-outline" onClick={()=>{setOriginalSlug("");setDraft(empty());setAddonText(defaultPricedAddons().map(x=>[x.code,x.name,x.price,x.pricingType].join(" | ")).join("\n"));}}>+ كتالوج جديد</button>
          <button type="button" className="button button-outline" disabled={busy} onClick={()=>void importStarter()}>استيراد النماذج الأربعة المبدئية دون تكرار</button>
          <button type="button" className="button button-outline" disabled={busy} onClick={()=>void applyDemoPrices()}>تطبيق الأسعار التجريبية على الكتالوجات الحالية (٥٠٠٠ + إضافات ١٠٠٠)</button>
          <a className="inline-add" href="/catalog" target="_blank" rel="noreferrer">عرض المعرض ↗</a>
        </div>
        <label className="check-row"><input type="checkbox" checked={pageWasPublished} onChange={e=>setPageWasPublished(e.target.checked)}/> نشر صفحة المعرض بالكامل</label>
        <button type="button" className="inline-add" disabled={busy} onClick={()=>void saveAll(items,pageWasPublished?"تم نشر المعرض":"تم حفظ المعرض كمسودة")}>حفظ حالة نشر المعرض</button>
        {!pageWasPublished&&<p className="api-notice">المعرض مخفي من الواجهة العامة حتى تنشر الصفحة بالكامل، حتى لو كانت بطاقات النماذج منشورة.</p>}
        <div className="admin-team-list">{items.map(item=><article className="admin-team-row" key={item.slug} style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <strong>{item.icon} {item.name}</strong><span>{item.category}</span><span>{item.archived?"مؤرشف":item.published?"منشور":"مسودة"}</span>
          <button type="button" className="inline-add" disabled={busy} onClick={()=>edit(item)}>تعديل</button>
          {item.published&&!item.archived&&<a className="inline-add" href={`/catalog/${encodeURIComponent(item.slug)}`} target="_blank" rel="noopener noreferrer">معاينة العميل ↗</a>}
          <button type="button" className="inline-add" disabled={busy||item.archived} onClick={()=>void toggle(item,{published:!item.published})}>{item.published?"إخفاء":"نشر"}</button>
          {item.archived?<button type="button" className="inline-add" disabled={busy} onClick={()=>void toggle(item,{archived:false})}>استعادة</button>:<button type="button" className="inline-add" disabled={busy} onClick={()=>void archive(item)}>أرشفة</button>}
        </article>)}</div>
      </>}
    </section>
    {ready&&<section className="admin-content-card">
      <h2>إدارة القطاعات الرئيسية والتصنيفات الفرعية</h2>
      <p>الترتيب: قطاع رئيسي ← تصنيف فرعي ← كتالوج تفاعلي. أسماء الأقسام قابلة للتعديل من هنا دون تعديل الكود، والحذف لا يمس أي كتالوج مرتبط.</p>
      <div className="admin-team-list">
        {[...sectors].sort((a,b)=>a.sortOrder-b.sortOrder).map(sector=><article key={sector.id} style={{padding:14,marginBottom:12,border:"1px solid #d9e2ec",borderRadius:12}}>
          <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
            <strong>{sector.icon} {sector.name}</strong><small>{sector.isPublished?"منشور":"مخفي"} · {sector.id}</small>
            <button disabled={busy} type="button" className="inline-add" onClick={()=>void renameSector(sector)}>تسمية</button>
            <button disabled={busy} type="button" className="inline-add" onClick={()=>void editSectorDetails(sector)}>الأيقونة والوصف</button>
            <button disabled={busy} type="button" className="inline-add" aria-label={`رفع ترتيب ${sector.name}`} onClick={()=>void moveSector(sector.id,-1)}>↑</button>
            <button disabled={busy} type="button" className="inline-add" aria-label={`خفض ترتيب ${sector.name}`} onClick={()=>void moveSector(sector.id,1)}>↓</button>
            <button disabled={busy} type="button" className="inline-add" onClick={()=>void toggleSector(sector)}>{sector.isPublished?"إخفاء":"نشر"}</button>
            <button disabled={busy} type="button" className="inline-add" onClick={()=>void deleteSector(sector)}>حذف آمن</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
            {[...sector.subcategories].sort((a,b)=>a.sortOrder-b.sortOrder).map(sub=><div key={sub.id} style={{padding:10,borderRadius:10,background:"#f3f6fa",display:"flex",flexWrap:"wrap",alignItems:"center",gap:7}}>
              <span>{sub.name} {sub.isPublished?"":"(مخفي)"}</span>
              <button disabled={busy} type="button" className="inline-add" onClick={()=>void renameSubcategory(sector,sub.id)}>تعديل</button>
              <button disabled={busy} type="button" className="inline-add" aria-label={`رفع ترتيب ${sub.name}`} onClick={()=>void moveSubcategory(sector,sub.id,-1)}>↑</button>
              <button disabled={busy} type="button" className="inline-add" aria-label={`خفض ترتيب ${sub.name}`} onClick={()=>void moveSubcategory(sector,sub.id,1)}>↓</button>
              <button disabled={busy} type="button" className="inline-add" onClick={()=>void toggleSubcategory(sector,sub.id)}>{sub.isPublished?"إخفاء":"نشر"}</button>
              <button disabled={busy} type="button" className="inline-add" onClick={()=>void deleteSubcategory(sector,sub.id)}>حذف</button>
            </div>)}
          </div>
        </article>)}
      </div>
      <form onSubmit={e=>void saveSector(e)} className="admin-form-grid" style={{marginBottom:20}}>
        <h3 style={{gridColumn:"1/-1"}}>إضافة قطاع رئيسي</h3>
        <label className="admin-field">الرمز الإنجليزي<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={sectorDraft.id} onChange={e=>setSectorDraft(x=>({...x,id:e.target.value.toLowerCase()}))}/></label>
        <label className="admin-field">اسم القطاع<input required value={sectorDraft.name} onChange={e=>setSectorDraft(x=>({...x,name:e.target.value}))}/></label>
        <label className="admin-field">أيقونة<input value={sectorDraft.icon} onChange={e=>setSectorDraft(x=>({...x,icon:e.target.value}))}/></label>
        <label className="admin-field">الشرح<input value={sectorDraft.description} onChange={e=>setSectorDraft(x=>({...x,description:e.target.value}))}/></label>
        <button className="button" disabled={busy}>إضافة القطاع</button>
      </form>
      <form onSubmit={e=>void saveSubcategory(e)} className="admin-form-grid">
        <h3 style={{gridColumn:"1/-1"}}>إضافة تصنيف فرعي</h3>
        <label className="admin-field">القطاع الرئيسي<select required value={subDraft.sectorId} onChange={e=>setSubDraft(x=>({...x,sectorId:e.target.value}))}><option value="">اختر القطاع</option>{sectors.map(sector=><option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></label>
        <label className="admin-field">رمز التصنيف<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={subDraft.id} onChange={e=>setSubDraft(x=>({...x,id:e.target.value.toLowerCase()}))}/></label>
        <label className="admin-field">اسم التصنيف<input required value={subDraft.name} onChange={e=>setSubDraft(x=>({...x,name:e.target.value}))}/></label>
        <button className="button" disabled={busy}>إضافة التصنيف</button>
      </form>
    </section>}
    {ready&&<section className="admin-content-card"><h2>{originalSlug?"تعديل الكتالوج":"إضافة كتالوج"}</h2>
      <form onSubmit={e=>void saveItem(e)} className="admin-form-grid">
        {field("الاسم",draft.name,v=>update("name",v))}
        <label className="admin-field">الرابط (Slug)<input required disabled={Boolean(originalSlug)} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e=>update("slug",e.target.value.toLowerCase())}/></label>
        <label className="admin-field">القطاع الرئيسي<select required value={draft.sectorId||""} onChange={e=>setDraft(d=>({...d,sectorId:e.target.value,subcategoryId:""}))}>
          <option value="">اختر القطاع</option>{sectors.map(sector=><option key={sector.id} value={sector.id}>{sector.name}</option>)}
        </select></label>
        <label className="admin-field">التصنيف الفرعي<select value={draft.subcategoryId||""} onChange={e=>update("subcategoryId",e.target.value||undefined)}>
          <option value="">بدون تصنيف فرعي</option>{sectors.find(sector=>sector.id===draft.sectorId)?.subcategories.map(sub=><option key={sub.id} value={sub.id}>{sub.name}</option>)}
        </select></label>
        {field("الأيقونة",draft.icon,v=>update("icon",v))}
        {field("الوصف",draft.description,v=>update("description",v),true)}
        {field("المزايا — كل ميزة بسطر",draft.features.join("\n"),v=>update("features",v.split("\n").map(x=>x.trim()).filter(Boolean)),true)}
        {field("أقسام المعاينة — كل قسم بسطر",draft.modules.join("\n"),v=>update("modules",v.split("\n").map(x=>x.trim()).filter(Boolean)),true)}
        <label className="admin-field">محرك المعاينة التفاعلية الكاملة
          <select value={draft.demoSlug??""} onChange={e=>update("demoSlug",e.target.value)}>
            <option value="">معاينة عامة دون نظام قطاع جاهز</option>
            {Object.keys(interactiveDemoPaths).map(slug=><option key={slug} value={slug}>{sectorTemplates.find(template=>template.slug===slug)?.name??slug}</option>)}
          </select>
          <small>يمكن استخدام المحرك نفسه لأكثر من كتالوج بهوية ومزايا وسعر مختلف. محرك المعاينة يعرض بيانات تجريبية منفصلة عن قاعدة بيانات العملاء.</small>
        </label>
        {field("رابط الصورة HTTPS أو ملف مرفوع",draft.imageUrl,v=>update("imageUrl",v))}
        <label className="admin-field">رفع صورة البطاقة مباشرة (PNG أو JPG أو WebP، 5 ميجابايت)
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||uploading} onChange={e=>void uploadImage(e)} />
          {uploading&&<small>جارٍ رفع الصورة…</small>}
          {draft.imageUrl&&<img src={draft.imageUrl} alt="معاينة صورة الكتالوج" style={{maxWidth:230,maxHeight:155,objectFit:"contain",borderRadius:12}} />}
        </label>
        {field("رابط النظام التفاعلي المنشور HTTPS — الصق رابط المعاينة هنا",draft.previewUrl,v=>update("previewUrl",v))}
        <label className="admin-field">سعر بيع الكتالوج الأساسي (جنيه) — قبل إضافات محرك التسعير<input type="number" min="0" step="0.01" value={draft.basePrice??""} onChange={e=>update("basePrice",e.target.value===""?null:Number(e.target.value))}/></label>
        {field("إضافات القطاع المسعّرة — سطر لكل إضافة: code | اسم | سعر | fixed/monthly/yearly",addonText,setAddonText,true)}
        <label className="admin-field">ترتيب الظهور<input type="number" value={draft.sortOrder} onChange={e=>update("sortOrder",Number(e.target.value))}/></label>
        <label className="check-row"><input type="checkbox" checked={draft.published} onChange={e=>update("published",e.target.checked)}/> منشور في المعرض</label>
        <div className="admin-actions"><button type="submit" className="button" disabled={busy||uploading}>{busy?"جارٍ الحفظ…":"حفظ الكتالوج"}</button></div>
      </form>
      <p className="field-hint">لا يتم حذف الكتالوج نهائيًا حتى لا تتأثر روابط العملاء وطلباتهم السابقة. الصور تُرفع عبر خدمة الوسائط المحمية في الخادم. الفيديوهات تُدرج كرابط بعد التحقق من صلاحياتها.</p>
    </section>}
  </div>;
}
