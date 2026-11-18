"use client";
import { useEffect, useState } from "react";
import { loadGuestWorkspace, loadAccountWorkspace, saveGuestWorkspace } from "@/lib/customer-workspace";
type PreviewAddon={code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"};
import Link from "next/link";
import { interactiveDemoPaths, type SectorTemplate } from "@/lib/sector-catalog";
import SectorInteractiveDemo,{isInteractiveSector} from "@/components/sector-interactive-demo";

export default function SectorPreview({template,demoSlug,pricedAddons=[],basePrice=null}: {template: SectorTemplate;demoSlug?:string;pricedAddons?:PreviewAddon[];basePrice?:number|null}) {
  const [active,setActive]=useState(template.modules[0]);
  const [previewMode,setPreviewMode]=useState<"full"|"simple">(demoSlug?"full":"simple");
  const [rows,setRows]=useState(template.sampleRows);
  const [selectedAddons,setSelectedAddons]=useState<string[]>([]);
  const [name,setName]=useState("");
  const [brand,setBrand]=useState("#203958");
  const [customTitle,setCustomTitle]=useState("");
  const [showForm,setShowForm]=useState(false);
  useEffect(()=>{
    const guest=loadGuestWorkspace();
    if(guest.sectorSlug===template.slug){
      setSelectedAddons(Array.isArray(guest.sectorAddonCodes)?guest.sectorAddonCodes.filter(code=>pricedAddons.some(item=>item.code===code)):[]);
      if(guest.businessName)setCustomTitle(guest.businessName);
      if(guest.businessDescription)setCustomDescription(guest.businessDescription);
      if(guest.brandColor)setBrand(guest.brandColor);
    }
    saveGuestWorkspace({sectorSlug:template.slug,sectorName:template.name,source:"preview"});
  },[template.slug,template.name]);

  const [logoData,setLogoData]=useState("");
  const [customDescription,setCustomDescription]=useState("");
  const [logoError,setLogoError]=useState("");
  const [logoNotice,setLogoNotice]=useState("");
  const uploadLogo=async(file?:File)=>{
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>2*1024*1024){setLogoError("الشعار يجب أن يكون PNG أو JPG أو WebP وأقل من 2 ميجابايت.");return;}
    setLogoError("");
    const reader=new FileReader();
    reader.onload=()=>{if(typeof reader.result==="string")setLogoData(reader.result);};
    reader.readAsDataURL(file);
    try{
      const response=await fetch("/api/customer/auth/workspace/logo",{method:"POST",credentials:"include",headers:{"Content-Type":file.type},body:file});
      if(response.ok)setLogoNotice("الشعار محفوظ بشكل خاص داخل حسابك.");
      else if(response.status===401)setLogoNotice("الشعار ظاهر في هذه المعاينة فقط. سجّل الدخول لحفظه في حسابك.");
      else throw Error("Unable to upload logo");
    }catch{setLogoError("تعذر حفظ الشعار في الحساب. المعاينة المحلية ما زالت تعمل.");}
  };
  useEffect(()=>{
    let active=true;
    let url:string|null=null;
    void loadAccountWorkspace().then(account=>{
      if(!active||!account)return;
      const guest=loadGuestWorkspace();
      if(account.sectorSlug===template.slug){
        if(account.businessName&&!guest.businessName)setCustomTitle(account.businessName);
        if(account.brandColor&&!guest.brandColor)setBrand(account.brandColor);
        if(account.businessDescription&&!guest.businessDescription)setCustomDescription(account.businessDescription);
      }
      return fetch("/api/customer/auth/workspace/logo",{credentials:"include",cache:"no-store"});
    }).then(async response=>{
      if(!active||!response?.ok)return;
      const blob=await response.blob();
      if(!active)return;
      url=URL.createObjectURL(blob);
      setLogoData(url);
    }).catch(()=>undefined);
    return()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[template.slug]);
  return <main dir="rtl" style={{maxWidth:1280,margin:"0 auto",padding:"20px",minHeight:"100vh"}}>
    <header style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:20}}>
      <Link href="/catalog" style={{color:"#4c78ae"}}>← العودة للمعرض</Link>
      <span style={{background:"#fff2d2",color:"#815800",borderRadius:12,padding:"8px 12px",fontSize:12}}>معاينة تجريبية — بلا خادم أو دفع حقيقي</span>
      <Link href={`/?sector=${encodeURIComponent(template.slug)}#configurator` } style={{background:brand,color:"white",padding:"10px 16px",borderRadius:10}}>تخصيص الباقة والسعر</Link>
    </header>
    <style>{`@media(max-width:700px){.sector-preview-grid{grid-template-columns:1fr!important}.sector-preview-nav{display:flex;overflow-x:auto;gap:5px}.sector-preview-nav button{min-width:max-content}}`}</style>
    <section style={{background:"white",borderRadius:18,border:"1px solid #e2e8f0",padding:20,marginBottom:18}}>
      <h1 style={{margin:"0 0 8px",color:brand,display:"flex",alignItems:"center",gap:10}}>{logoData?<img src={logoData} alt="شعار النشاط التجريبي" style={{width:48,height:48,objectFit:"contain"}}/>:template.icon} {customTitle || template.name}</h1>
      <p style={{color:"#64748b",lineHeight:1.8}}>{customDescription||template.description}</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
        <label style={{display:"grid",gap:5}}>اسم النشاط التجريبي<input value={customTitle} onChange={e=>{setCustomTitle(e.target.value);saveGuestWorkspace({businessName:e.target.value,sectorSlug:template.slug,sectorName:template.name,source:"preview"});}} placeholder={template.name} maxLength={50} style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8}}/></label>
        <label style={{display:"grid",gap:5}}>لون الهوية<input aria-label="لون الهوية" type="color" value={brand} onChange={e=>{setBrand(e.target.value);saveGuestWorkspace({brandColor:e.target.value,sectorSlug:template.slug,sectorName:template.name,source:"preview"});}} style={{height:43,width:74,border:0}}/></label>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",marginTop:14}}>
        <label style={{display:"grid",gap:5,flex:"1 1 260px"}}>وصف النشاط التجريبي<input value={customDescription} onChange={e=>{setCustomDescription(e.target.value);saveGuestWorkspace({businessDescription:e.target.value,sectorSlug:template.slug,sectorName:template.name,source:"preview"});}} maxLength={200} placeholder="اكتب النص الذي تريده في نموذجك" style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8}}/></label>
        <label style={{display:"grid",gap:5,flex:"1 1 200px"}}>ارفع شعارك (للمعاينة فقط)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadLogo(e.target.files?.[0])} /></label>
      </div>
      {logoError&&<p role="alert" style={{color:"#b91c1c"}}>{logoError}</p>}
      {logoNotice&&<p role="status" style={{color:"#166534"}}>{logoNotice}</p>}
    </section>
    <section aria-label="الخصائص والإضافات القابلة للتخصيص" style={{background:"#fff",border:"1px solid #dce5f0",borderRadius:14,padding:16,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:9}}><div><h2 style={{fontSize:20,margin:"0 0 6px",color:brand}}>المزايا والإضافات الخاصة بالنظام</h2><p style={{margin:0,color:"#60728a",fontSize:13}}>اختر ما تحتاجه؛ البنود المدفوعة تُراجع داخل التسعير الرسمي، ولا تُنشئ فاتورة أو طلب شراء من هنا.</p></div><strong>{basePrice===null?"سعر النظام حسب العرض المعتمد":`سعر الأساس: ${basePrice.toLocaleString("ar-EG")} ج.م`}</strong></div>
      {(template.features||[]).length>0&&<p style={{lineHeight:1.9,fontSize:14}}>يشمل النموذج: {template.features.join(" · ")}</p>}
      {pricedAddons.length>0?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:10,margin:"12px 0"}}>
       {pricedAddons.map(addon=><label key={addon.code} style={{display:"flex",gap:10,border:"1px solid #dce5ee",borderRadius:9,padding:12,alignItems:"center",flexWrap:"wrap"}}>
         <input type="checkbox" checked={selectedAddons.includes(addon.code)} onChange={event=>setSelectedAddons(previous=>{const next=event.target.checked?[...new Set([...previous,addon.code])]:previous.filter(code=>code!==addon.code);saveGuestWorkspace({sectorSlug:template.slug,sectorName:template.name,sectorAddonCodes:next,source:"preview"});return next})}/>
         <span style={{flex:"1 1 120px"}}>{addon.name}</span><strong style={{fontSize:13}}>{addon.price.toLocaleString("ar-EG")} ج.م{addon.pricingType==="monthly"?"/ شهر":addon.pricingType==="yearly"?"/ سنة":""}</strong>
       </label>)}
      </div>:<p style={{fontSize:13,color:"#60728a"}}>لا توجد إضافات قطاعية محددة الأسعار لهذا النموذج حاليًا.</p>}
      <Link href={`/?sector=${encodeURIComponent(template.slug)}#configurator`} style={{display:"inline-block",background:brand,color:"white",borderRadius:10,padding:"11px 15px",textDecoration:"none",fontWeight:700}}>متابعة الطلب والتسعير مع الإضافات المحددة ←</Link>
    </section>
    {demoSlug && interactiveDemoPaths[demoSlug] && <section aria-label="نوع المعاينة" style={{background:"#fff",border:"1px solid #dce5f0",borderRadius:14,padding:12,marginBottom:16,display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
      <strong style={{marginInlineEnd:8}}>اختر طريقة تجربة النظام:</strong>
      <button type="button" onClick={()=>setPreviewMode("full")} aria-pressed={previewMode==="full"} style={{background:previewMode==="full"?brand:"#edf3f8",color:previewMode==="full"?"white":"#203958",border:0,borderRadius:9,padding:"10px 13px",cursor:"pointer"}}>المعاينة التفاعلية الكاملة</button>
      <button type="button" onClick={()=>setPreviewMode("simple")} aria-pressed={previewMode==="simple"} style={{background:previewMode==="simple"?brand:"#edf3f8",color:previewMode==="simple"?"white":"#203958",border:0,borderRadius:9,padding:"10px 13px",cursor:"pointer"}}>المعاينة المبسطة</button>
      <a href={interactiveDemoPaths[demoSlug]} target="_blank" rel="noopener noreferrer" style={{marginInlineStart:"auto",color:"#174e83",textDecoration:"underline"}}>فتح النظام في نافذة كاملة ↗</a>
    </section>}
    {demoSlug && interactiveDemoPaths[demoSlug] && previewMode==="full" ? <section aria-label="المعاينة التفاعلية الكاملة" style={{background:"white",border:"1px solid #e2e8f0",borderRadius:16,overflow:"hidden"}}>
      <iframe title={`معاينة ${template.name} التفاعلية الكاملة`} src={interactiveDemoPaths[demoSlug]} loading="eager" referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-modals" style={{width:"100%",minHeight:680,border:0,display:"block"}} />
      <p style={{fontSize:12,padding:"8px 14px",color:"#64748b"}}>المعاينة تفاعلية وبياناتها تجريبية داخل المتصفح؛ ليست متصلة ببيانات العملاء أو بالفوترة الحقيقية.</p>
    </section> : <div className="sector-preview-grid" style={{display:"grid",gridTemplateColumns:"minmax(0,230px) minmax(0,1fr)",gap:16}}> 
      <nav className="sector-preview-nav" aria-label="أقسام النموذج" style={{background:brand,color:"white",borderRadius:16,padding:14,alignSelf:"start"}}>
        {template.modules.map(module=><button key={module} onClick={()=>setActive(module)} aria-current={active===module?"page":undefined} style={{display:"block",width:"100%",textAlign:"right",marginBottom:5,padding:12,borderRadius:9,border:0,cursor:"pointer",background:active===module?"#ffffff30":"transparent",color:"white",fontWeight:active===module?700:400}}>{module}</button>)}
      </nav>
      <section style={{minWidth:0}}>
        {isInteractiveSector(template.slug)?<SectorInteractiveDemo slug={template.slug} active={active} brand={brand} onNavigate={setActive}/>:<>
        <h2 style={{color:brand,marginTop:4}}>{active}</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:20}}>
          {template.sampleStats.map(stat=><div key={stat.label} style={{background:"white",border:"1px solid #e2e8f0",borderRadius:14,padding:18}}><small style={{color:"#64748b"}}>{stat.label}</small><strong style={{display:"block",fontSize:23,color:brand,marginTop:10}}>{stat.value}</strong></div>)}
        </div>
        <section style={{background:"white",padding:20,border:"1px solid #e2e8f0",borderRadius:16}}>
          <div style={{display:"flex",gap:12,justifyContent:"space-between",flexWrap:"wrap",alignItems:"center"}}>
            <h3>سجلات تجريبية — {active}</h3>
            <button onClick={()=>setShowForm(x=>!x)} style={{background:brand,color:"white",border:0,borderRadius:8,padding:"10px 15px",cursor:"pointer"}}>+ إضافة سجل تجريبي</button>
          </div>
          {showForm && <form onSubmit={e=>{e.preventDefault();if(!name.trim())return;setRows(r=>[{name:name.trim(),detail:"أضيف في المعاينة فقط",status:"جديد"},...r]);setName("");setShowForm(false);}} style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:18}}>
            <input aria-label="اسم السجل" required maxLength={80} placeholder="اسم السجل" value={name} onChange={e=>setName(e.target.value)} style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8,flex:1}}/>
            <button type="submit" style={{background:brand,color:"white",padding:"10px 15px",border:0,borderRadius:8}}>حفظ تجريبي</button>
          </form>}
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"right"}}><thead><tr>{["الاسم","التفاصيل","الحالة","إجراء"].map(h=><th key={h} style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{h}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}><td style={{padding:12}}>{row.name}</td><td style={{padding:12}}>{row.detail}</td><td style={{padding:12}}>{row.status}</td><td><button onClick={()=>setRows(r=>r.filter((_,i)=>i!==index))} style={{padding:8,border:0,color:"#b91c1c",background:"transparent",cursor:"pointer"}}>حذف تجريبي</button></td></tr>)}</tbody></table></div>
          <p style={{fontSize:12,color:"#64748b",lineHeight:1.9}}>{template.note} التغييرات مؤقتة داخل المتصفح الحالي ولا تمثل مواصفات النظام النهائي.</p>
        </section>
        </>}
      </section>
    </div>}
  </main>;
}
