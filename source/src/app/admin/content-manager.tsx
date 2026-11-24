"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { siteCopyDefaults } from "@/lib/site-copy";
import { siteCopyEn } from "@/lib/site-copy-en";
import { createPagePreviewUrl } from "@/lib/page-preview";

type PageRecord = { slug: string; locale: string; content: Record<string, unknown>; is_published: boolean; updated_at?: string };
type CMSCard = { id: string; title: string; description: string; imageUrl: string; href: string; linkLabel: string; icon?: string };
type CMSSection = { id: string; eyebrow: string; title: string; body: string; titleFontSize?: number; bodyFontSize?: number; layout: "text" | "cards"; backgroundColor: string; textColor: string; columns: number; align: "right" | "center"; isVisible: boolean; cards: CMSCard[] };
type Project = { id: string; title: string; client: string; category: string; description: string; imageUrl: string; projectUrl: string; isPublished: boolean; sortOrder: number };

const defaultBenefits = [1, 2, 3, 4].map((n) => ({ id: `benefit-${n}`, title: siteCopyDefaults[`benefit${n}Title`], description: siteCopyDefaults[`benefit${n}Description`], imageUrl: "", href: "", linkLabel: "", icon: String(n).padStart(2, "0") }));
const defaultSteps = [1, 2, 3].map((n) => ({ id: `step-${n}`, title: siteCopyDefaults[`step${n}Title`], description: siteCopyDefaults[`step${n}Description`], imageUrl: "", href: "", linkLabel: "", icon: String(n).padStart(2, "0") }));
const defaultFaq = [1, 2, 3, 4, 5].map((n) => ({ id: `faq-${n}`, title: siteCopyDefaults[`faq${n}Question`], description: siteCopyDefaults[`faq${n}Answer`], imageUrl: "", href: "", linkLabel: "" }));
const defaultHeroTrust = [1,2,3].map((n) => ({ id: `hero-trust-${n}`, title: siteCopyDefaults[`heroTrust${n}`], description: "", imageUrl: "", href: "", linkLabel: "" }));
const newId = () => globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const normalizeCard = (value: unknown, index: number): CMSCard => {
  const item = asRecord(value);
  return { id: asString(item.id, `card-${index + 1}`), title: asString(item.title), description: asString(item.description), imageUrl: asString(item.imageUrl), href: asString(item.href), linkLabel: asString(item.linkLabel), icon: asString(item.icon) };
};
const normalizeProject = (value: unknown, index: number): Project => {
  const item = asRecord(value);
  return { id: asString(item.id, `work-${index + 1}`), title: asString(item.title), client: asString(item.client), category: asString(item.category), description: asString(item.description), imageUrl: asString(item.imageUrl), projectUrl: asString(item.projectUrl), isPublished: item.isPublished !== false, sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index * 10 };
};

async function adminApi(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/${path}`, { ...init, credentials: "include", cache: "no-store", headers: { ...(init?.body && !(init.body instanceof Blob) ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "تعذر تنفيذ العملية.");
  return data as Record<string, any>;
}

export default function ContentManager({ initialSlug = "home", onSaved }: { initialSlug?: string; onSaved?: () => Promise<unknown> | void }) {
  const [featuredOptions,setFeaturedOptions]=useState<Array<{slug:string;name:string}>>([]);
  useEffect(()=>{void fetch("/api/site-content/catalog?locale=ar",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{const items=data?.page?.content?.items;if(Array.isArray(items))setFeaturedOptions(items.filter(x=>x&&typeof x.slug==="string"&&typeof x.name==="string"&&x.published!==false&&!x.archived));}).catch(()=>{});},[]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [activeSlug, setActiveSlug] = useState("home");
  const [activeLocale,setActiveLocale]=useState<"ar"|"en">("ar");
  const [draft, setDraft] = useState<PageRecord | null>(null);
  const [arabicHomeReference, setArabicHomeReference] = useState<Record<string, unknown> | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [workspaceTab,setWorkspaceTab]=useState<"edit"|"preview">("edit");
  const [previewUrl,setPreviewUrl]=useState("");
  const [previewDevice,setPreviewDevice]=useState<"desktop"|"mobile">("desktop");
  const [showCreatePage,setShowCreatePage]=useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [projectDraft, setProjectDraft] = useState<Project>({ id: "", title: "", client: "", category: "", description: "", imageUrl: "", projectUrl: "", isPublished: false, sortOrder: 0 });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async (preferredSlug = activeSlug,preferredLocale:"ar"|"en"=activeLocale) => {
    const result = await adminApi("pages");
    const nextPages = (result.pages ?? []) as PageRecord[];
    const savedDrafts = (result.drafts ?? []) as Array<{slug:string;locale:string;content:Record<string,unknown>}>;
    setPages(nextPages);
    setArabicHomeReference(nextPages.find(item=>item.slug==="home"&&item.locale==="ar")?.content ?? null);
    const selected=nextPages.find(item=>item.slug===preferredSlug&&item.locale===preferredLocale);
    if(selected){const privateDraft=savedDrafts.find(item=>item.slug===selected.slug&&item.locale===selected.locale);setActiveSlug(selected.slug);setDraft(privateDraft?{...selected,content:privateDraft.content}:selected);}
    else {const privateDraft=savedDrafts.find(item=>item.slug===preferredSlug&&item.locale===preferredLocale);setActiveSlug(preferredSlug);setDraft({slug:preferredSlug,locale:preferredLocale,content:privateDraft?.content??(preferredSlug==="home"?(preferredLocale==="en"?{...siteCopyEn}:{...siteCopyDefaults}):{title:"",description:"",sections:[]}),is_published:false});}
  };

  useEffect(() => { setActiveSlug(initialSlug); load(initialSlug).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر تحميل الصفحات.")); }, [initialSlug]);

  const selectedLabel = useMemo(() => activeSlug === "home" ? "الرئيسية" : activeSlug === "works" ? "سجل الأعمال" : `/${activeSlug}`, [activeSlug]);
  const updateContent = (key: string, value: unknown) => setDraft((current) => current ? { ...current, content: { ...current.content, [key]: value } } : current);
  const updateSection = (id: string, patch: Partial<CMSSection>) => {
    const sections = Array.isArray(draft?.content.sections) ? draft.content.sections.map((item) => asRecord(item) as unknown as CMSSection) : [];
    updateContent("sections", sections.map((section) => section.id === id ? { ...section, ...patch } : section));
  };
  const uploadImage = async (event: ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await adminApi("media", { method: "POST", body: file, headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) } });
      onUploaded(result.media.url as string);
      setNotice("تم رفع الصورة وحفظها على خادم المنصة.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر رفع الصورة."); }
    finally { setBusy(false); event.target.value = ""; }
  };

  const previewPage = () => { if(!draft)return;setPreviewUrl(createPagePreviewUrl({slug:draft.slug,locale:draft.locale==="en"?"en":"ar",content:draft.content}));setWorkspaceTab("preview"); };
  const savePage = async (publish=false) => {
    if (!draft)return;
    setBusy(true);setError("");setNotice("");
    try {
      if(publish){
        await adminApi(`pages/${draft.slug}`,{method:"PATCH",body:JSON.stringify({locale:draft.locale||"ar",content:draft.content,isPublished:true})});
        // Re-read the persisted page instead of assuming the write reached the intended locale.
        const verified = await adminApi("pages");
        const published = (verified.pages ?? [] as PageRecord[]).find((item:PageRecord)=>item.slug===draft.slug&&item.locale===(draft.locale||"ar")) as PageRecord|undefined;
        if(!published?.is_published||JSON.stringify(published.content)!==JSON.stringify(draft.content)){
          throw new Error("تم إرسال التعديل، لكن بيانات الصفحة المحفوظة لا تطابق التعديل. تحقق من قاعدة البيانات قبل إعادة النشر.");
        }
        setDraft(current=>current?{...current,is_published:true}:current);
        setNotice("تم حفظ الصفحة والتحقق من محتواها المنشور في قاعدة البيانات.");
      }else{
        await adminApi(`page-drafts/${draft.slug}`,{method:"PUT",body:JSON.stringify({locale:draft.locale||"ar",content:draft.content})});
        setNotice("تم حفظ المسودة فقط، دون تغيير الصفحة المنشورة.");
      }
      await onSaved?.();
    }catch(reason){setError(reason instanceof Error?reason.message:"تعذر حفظ الصفحة.");}
    finally{setBusy(false);}
  };
  const createPage = async (event: FormEvent) => {
    event.preventDefault();
    const slug = newSlug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || ["admin", "api", "works", "home"].includes(slug)) { setError("استخدم رابطًا إنجليزيًا بسيطًا مثل about أو our-services؛ /works محفوظ لسجل الأعمال."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const content = { title: newTitle.trim(), description: "", sections: [] };
      await adminApi(`pages/${slug}`, { method: "PATCH", body: JSON.stringify({ locale: activeLocale, content, isPublished: false }) });
      setNewTitle(""); setNewSlug(""); await load(slug,activeLocale); setNotice("تم إنشاء الصفحة كمسودة. أضف أقسامها ثم فعّل النشر.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إنشاء الصفحة."); }
    finally { setBusy(false); }
  };

  const addSection = () => {
    if (!draft) return;
    const sections = Array.isArray(draft.content.sections) ? draft.content.sections.map((item) => asRecord(item) as unknown as CMSSection) : [];
    updateContent("sections", [...sections, { id: newId(), eyebrow: "", title: "قسم جديد", body: "", layout: "text", backgroundColor: "#ffffff", textColor: "#26313f", columns: 3, align: "right", isVisible: true, cards: [] } satisfies CMSSection]);
  };
  const moveSection = (id: string, direction: -1 | 1) => {
    const sections = Array.isArray(draft?.content.sections) ? draft.content.sections.map((item) => asRecord(item) as unknown as CMSSection) : [];
    const index = sections.findIndex((item) => item.id === id), target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    updateContent("sections", sections);
  };
  const addBlockCard = (section: CMSSection) => updateSection(section.id, { cards: [...(section.cards ?? []), { id: newId(), title: "بطاقة جديدة", description: "", imageUrl: "", href: "", linkLabel: "" }] });
  const updateBlockCard = (section: CMSSection, id: string, patch: Partial<CMSCard>) => updateSection(section.id, { cards: (section.cards ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) });

  const updateProject = (id: string, patch: Partial<Project>) => {
    const projects = (Array.isArray(draft?.content.projects) ? draft.content.projects : []).map(normalizeProject);
    updateContent("projects", projects.map((item) => item.id === id ? { ...item, ...patch } : item));
  };
  const addProject = (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !projectDraft.title.trim()) return;
    const projects = (Array.isArray(draft.content.projects) ? draft.content.projects : []).map(normalizeProject);
    updateContent("projects", [...projects, { ...projectDraft, id: newId(), sortOrder: projects.length * 10 }]);
    setProjectDraft({ id: "", title: "", client: "", category: "", description: "", imageUrl: "", projectUrl: "", isPublished: false, sortOrder: 0 });
    setNotice("أضيف العمل إلى مسودة الصفحة. احفظ الصفحة لتثبيته.");
  };
  const removeProject = (id: string) => updateContent("projects", (Array.isArray(draft?.content.projects) ? draft.content.projects : []).map(normalizeProject).filter((item) => item.id !== id));

  const homeCollection=(key:string,fallback:CMSCard[]):CMSCard[]=>Array.isArray(draft?.content[key])?(draft?.content[key] as unknown[]).map(normalizeCard):activeLocale==="en"?fallback.map(item=>{const match=/^(benefit|step|faq|hero-trust|trust)-(\d+)$/.exec(item.id||"");if(!match)return item;const kind=match[1],num=match[2];const titleKey=kind==="faq"?"faq"+num+"Question":kind==="hero-trust"?"heroTrust"+num:kind==="trust"?"trust"+num:kind+num+"Title";const descriptionKey=kind==="faq"?"faq"+num+"Answer":kind+num+"Description";return {...item,title:siteCopyEn[titleKey]||item.title,description:siteCopyEn[descriptionKey]||item.description};}):fallback;
  // The published Arabic page is the source of truth for which English card editors remain relevant.
  const visibleHomeCollection = (key:string,fallback:CMSCard[]):CMSCard[] => {
    const items=homeCollection(key,fallback);
    const reference=arabicHomeReference?.[key];
    if(activeLocale!=="en" || !Array.isArray(reference))return items;
    const visibleIds=new Set(reference.filter((item):item is CMSCard=>!!item && typeof item==="object" && typeof item.id==="string" && !!item.title?.trim()).map(item=>item.id));
    return items.filter(item=>!item.id || visibleIds.has(item.id));
  };
  const updateHomeCollection = (key: string, values: CMSCard[]) => updateContent(key, values);

  if (!draft) return <section className="admin-content-card"><p>جارٍ تحميل الصفحات…</p>{error && <p className="error-message">{error}</p>}</section>;
  const sections = Array.isArray(draft.content.sections) ? draft.content.sections.map((item) => asRecord(item) as unknown as CMSSection) : [];
  const quarterSections: CMSSection[] = sections.slice(0,4);
  const projects = (Array.isArray(draft.content.projects) ? draft.content.projects : []).map(normalizeProject);

  return <div className="cms-workspace">
    {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
    <section className="admin-content-card">
      <div className="admin-content-title"><div><h2>صفحات المنصة</h2><p>الصفحة المحددة الآن: {selectedLabel}. كل تعديل يحفظ على قاعدة البيانات مع سجل تدقيق.</p></div></div>
      <div className="admin-actions"><button type="button" className="button button-small" onClick={()=>setShowCreatePage(true)}>إنشاء صفحة</button><button type="button" className="button button-outline button-small" onClick={()=>setShowCreatePage(false)}>صفحات المنصة</button></div>
      <div className="cms-toolbar">
        <label className="admin-field">لغة المحتوى<select value={activeLocale} onChange={event=>{const next=event.target.value==="en"?"en":"ar";setActiveLocale(next);setWorkspaceTab("edit");setPreviewUrl("");void load(activeSlug,next);setError("");setNotice("");}}><option value="ar">العربية · RTL</option><option value="en">English · LTR</option></select></label>
        <label className="admin-field">اختر الصفحة<select value={activeSlug} onChange={(event) => { const slug = event.target.value; setActiveSlug(slug); setWorkspaceTab("edit"); setPreviewUrl(""); void load(slug,activeLocale); setError(""); setNotice(""); }}>
          {Array.from(new Set([...pages.map(item=>item.slug),"home"])).map(slug=>({slug,is_published:pages.some(item=>item.slug===slug&&item.locale===activeLocale&&item.is_published)})).map((item) => <option key={item.slug} value={item.slug}>{item.slug === "home" ? "الرئيسية" : item.slug === "works" ? "سجل الأعمال" : `/${item.slug}`}{item.is_published ? " · منشورة" : " · مسودة"}</option>)}
        </select></label>
        <label className="check-row"><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} /> الصفحة منشورة للزوار</label>
        <button className="button button-small" disabled={busy} onClick={() => void savePage(false)}>حفظ المسودة</button>
        <button type="button" className="inline-add" onClick={previewPage}>معاينة الصفحة ↗</button>
      </div>
    </section>

    <nav role="tablist" aria-label="تعديل ومعاينة الصفحة" className="admin-actions"><button type="button" role="tab" aria-selected={workspaceTab==="edit"} className={workspaceTab==="edit"?"button":"button button-outline"} onClick={()=>setWorkspaceTab("edit")}>تعديل</button><button type="button" role="tab" aria-selected={workspaceTab==="preview"} className={workspaceTab==="preview"?"button":"button button-outline"} onClick={previewPage}>معاينة</button></nav>
    {workspaceTab==="preview" ? <section className="admin-content-card" aria-label="المعاينة الحية للصفحة"><div className="admin-content-title"><div><h2>المعاينة الحية — {selectedLabel}</h2><p>مسودة خاصة داخل لوحة الإدارة، لا تُنشر للزوار.</p></div><div className="admin-actions"><button type="button" className="button button-outline button-small" onClick={()=>setWorkspaceTab("edit")}>رجوع للتعديل</button><button type="button" className="button button-outline button-small" aria-pressed={previewDevice==="desktop"} onClick={()=>setPreviewDevice("desktop")}>كمبيوتر</button><button type="button" className="button button-outline button-small" aria-pressed={previewDevice==="mobile"} onClick={()=>setPreviewDevice("mobile")}>موبايل</button><button type="button" className="button button-small" onClick={previewPage}>تحديث المعاينة</button><button type="button" className="button button-outline button-small" disabled={busy} onClick={()=>void savePage(false)}>حفظ فقط</button><button type="button" className="button button-small" disabled={busy} onClick={()=>void savePage(true)}>حفظ ونشر</button></div></div>{previewUrl ? <div style={{display:"flex",justifyContent:"center",width:"100%",overflowX:"auto",background:"#e8edf2",padding:"12px 0"}}><iframe key={previewUrl} title={`معاينة ${selectedLabel}`} src={previewUrl} sandbox="allow-scripts allow-same-origin" style={{display:"block",width:previewDevice==="mobile"?390:"100%",maxWidth:"100%",height:"min(78vh,900px)",minHeight:480,flexShrink:0,border:"1px solid #d8dde5",borderRadius:12,background:"#fff"}} /></div> : <p>اضغط معاينة لعرض الصفحة.</p>}</section> : <>
    {activeSlug === "home" ? <>
      {(()=>{const defaults={enabled:false,text:"",url:"",speed:25,background:"#203958",color:"#ffffff"};const ticker={...defaults,...(draft.content.newsTicker&&typeof draft.content.newsTicker==="object"?draft.content.newsTicker:{})} as typeof defaults;const patch=(p:Partial<typeof defaults>)=>updateContent("newsTicker",{...ticker,...p});return <section className="admin-content-card"><h2>شريط الأخبار والإعلانات المتحرك</h2><p>إعدادات مستقلة لكل لغة. احفظ وانشر الصفحة لتفعيل التغييرات.</p><label className="admin-field"><span>إظهار الشريط</span><input type="checkbox" checked={ticker.enabled} onChange={e=>patch({enabled:e.target.checked})}/></label><label className="admin-field">النص الإعلاني<textarea rows={3} value={ticker.text} onChange={e=>patch({text:e.target.value})}/></label><label className="admin-field">رابط الإعلان (اختياري)<input value={ticker.url} placeholder="/catalog" onChange={e=>patch({url:e.target.value})}/></label><label className="admin-field">مدة الحركة بالثواني (الأقل أسرع)<input type="number" min={8} max={90} value={ticker.speed} onChange={e=>patch({speed:Number(e.target.value)})}/></label><label className="admin-field">لون الخلفية<input type="color" value={ticker.background} onChange={e=>patch({background:e.target.value})}/></label><label className="admin-field">لون النص<input type="color" value={ticker.color} onChange={e=>patch({color:e.target.value})}/></label><div style={{background:ticker.background,color:ticker.color,padding:8,textAlign:"center",overflowWrap:"anywhere"}}>{ticker.text||"معاينة شريط الأخبار"}</div></section>;})()}

      {activeLocale==="ar"&&<section className="admin-content-card"><h2>الأنظمة المميزة في الرئيسية</h2><p>اختر حتى أربعة أنظمة منشورة من المعرض، بالترتيب. الاختيارات مشتركة بين اللغتين. احفظ وانشر الصفحة لتفعيلها.</p>{Array.from({length:4},(_,i)=>{const ids=Array.isArray(draft.content.featuredSystemSlugs)?draft.content.featuredSystemSlugs as string[]:featuredOptions.slice(0,4).map(x=>x.slug);return <label key={i} className="admin-field">البطاقة {i+1}<select value={ids[i]||""} onChange={e=>{const next=Array.from({length:4},(_,j)=>ids[j]||"");next[i]=e.target.value;updateContent("featuredSystemSlugs",next);}}><option value="">إخفاء البطاقة</option>{featuredOptions.map(x=><option key={x.slug} value={x.slug} disabled={ids.some((id,j)=>j!==i&&id===x.slug)}>{x.name}</option>)}</select></label>;})}</section>}

      <section className="admin-content-card">
        <div className="admin-content-title"><div><h2>بطاقات الصفحة الرئيسية</h2><p>عدّل وأضف واحذف مزايا الصفحة ومراحل العمل والأسئلة الشائعة. القيم الأصلية المعروضة هي الحالية.</p></div></div>
        <HomeCardCollection title="بطاقات المزايا" value={visibleHomeCollection("benefitCards", defaultBenefits)} onChange={(value) => updateHomeCollection("benefitCards", value)} />
        <HomeCardCollection title="بطاقات مراحل العمل" value={visibleHomeCollection("processCards", defaultSteps)} onChange={(value) => updateHomeCollection("processCards", value)} />
        <HomeCardCollection title="الأسئلة الشائعة" value={visibleHomeCollection("faqEntries", defaultFaq)} onChange={(value) => updateHomeCollection("faqEntries", value)} secondLabel="الإجابة" />
        <HomeCardCollection title="رسائل الثقة أعلى الواجهة" value={visibleHomeCollection("heroTrustItems", defaultHeroTrust)} onChange={(value) => updateHomeCollection("heroTrustItems", value)} />
        <div className="cms-list-editor"><h3>شريط المزايا السريع</h3>{visibleHomeCollection("trustItems", [1,2,3,4].map((n) => ({ id: `trust-${n}`, title: siteCopyDefaults[`trust${n}`], description: "", imageUrl: "", href: "", linkLabel: "" }))).map((item, index, list) => <div className="cms-inline-card" key={item.id}><input aria-label="نص الميزة" value={item.title} onChange={(event) => updateHomeCollection("trustItems", list.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row))} /><button type="button" className="inline-add" onClick={() => updateHomeCollection("trustItems", list.filter((_, rowIndex) => rowIndex !== index))}>حذف</button></div>)}<button type="button" className="inline-add" onClick={() => updateHomeCollection("trustItems", [...visibleHomeCollection("trustItems", [1,2,3,4].map((n) => ({ id: `trust-${n}`, title: siteCopyDefaults[`trust${n}`], description: "", imageUrl: "", href: "", linkLabel: "" }))), { id: newId(), title: "ميزة جديدة", description: "", imageUrl: "", href: "", linkLabel: "" }])}>+ إضافة ميزة</button></div>
      </section>
      <section className="admin-content-card"><div className="admin-content-title"><div><h2>أقسام إضافية للرئيسية</h2><p>أضف أقسام نصية أو شبكات بطاقات قابلة للتنسيق، ورتبها أو أخفها دون حذف بياناتها.</p></div><button type="button" className="inline-add" onClick={addSection}>+ قسم جديد</button></div>{sections.length ? sections.map((section, index) => <SectionEditor key={section.id} section={section} index={index} count={sections.length} onChange={(patch) => updateSection(section.id, patch)} onMove={(direction) => moveSection(section.id, direction)} onDelete={() => updateContent("sections", sections.filter((item) => item.id !== section.id))} onAddCard={() => addBlockCard(section)} onCardChange={(id, patch) => updateBlockCard(section, id, patch)} onCardDelete={(id) => updateSection(section.id, { cards: section.cards.filter((card) => card.id !== id) })} onUpload={(event, callback) => void uploadImage(event, callback)} busy={busy} />) : <p className="field-hint">لم تتم إضافة أقسام إضافية بعد. الأقسام الحالية تظل كما هي.</p>}</section>
    </> : activeSlug === "works" ? <>
      <section className="admin-content-card">
        <div className="admin-content-title"><div><h2>سجل الأعمال السابقة</h2><p>أضف الأعمال عندما تكون جاهزًا. العمل غير منشور افتراضيًا حتى تختار نشره.</p></div><span className="status-chip">{projects.length} عمل</span></div>
        <label className="admin-field">عنوان الصفحة<input value={asString(draft.content.title, "سجل الأعمال")} onChange={(event) => updateContent("title", event.target.value)} /></label>
        <label className="admin-field">وصف الصفحة<textarea rows={2} value={asString(draft.content.description)} onChange={(event) => updateContent("description", event.target.value)} /></label>
        <form className="cms-project-form" onSubmit={addProject}>
          <h3>إضافة عمل</h3>
          <label className="admin-field">اسم العمل<input required value={projectDraft.title} onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })} /></label>
          <label className="admin-field">العميل أو الجهة<input value={projectDraft.client} onChange={(event) => setProjectDraft({ ...projectDraft, client: event.target.value })} /></label>
          <label className="admin-field">التصنيف<input placeholder="موقع، متجر، تطبيق…" value={projectDraft.category} onChange={(event) => setProjectDraft({ ...projectDraft, category: event.target.value })} /></label>
          <label className="admin-field">رابط صورة الغلاف<input type="url" value={projectDraft.imageUrl} onChange={(event) => setProjectDraft({ ...projectDraft, imageUrl: event.target.value })} /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadImage(event, (url) => setProjectDraft((current) => ({ ...current, imageUrl: url })))} /></label>
          <label className="admin-field">رابط المشروع<input type="url" value={projectDraft.projectUrl} onChange={(event) => setProjectDraft({ ...projectDraft, projectUrl: event.target.value })} /></label>
          <label className="admin-field cms-full">وصف العمل<textarea rows={3} value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} /></label>
          <button className="button" disabled={busy}>إضافة إلى السجل</button>
        </form>
        {projects.map((project) => <article className="cms-project-row" key={project.id}>
          <div className="cms-project-cover">{project.imageUrl ? <img src={project.imageUrl} alt="" /> : <span>معاينة الصورة</span>}</div>
          <div className="cms-project-fields">
            <label className="admin-field">اسم العمل<input value={project.title} onChange={(event) => updateProject(project.id, { title: event.target.value })} /></label>
            <label className="admin-field">العميل<input value={project.client} onChange={(event) => updateProject(project.id, { client: event.target.value })} /></label>
            <label className="admin-field">التصنيف<input value={project.category} onChange={(event) => updateProject(project.id, { category: event.target.value })} /></label>
            <label className="admin-field">رابط الصورة<input value={project.imageUrl} onChange={(event) => updateProject(project.id, { imageUrl: event.target.value })} /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadImage(event, (url) => updateProject(project.id, { imageUrl: url }))} /></label>
            <label className="admin-field">رابط المشروع<input value={project.projectUrl} onChange={(event) => updateProject(project.id, { projectUrl: event.target.value })} /></label>
            <label className="admin-field">الوصف<textarea rows={2} value={project.description} onChange={(event) => updateProject(project.id, { description: event.target.value })} /></label>
            <label className="admin-field">الترتيب<input type="number" value={project.sortOrder} onChange={(event) => updateProject(project.id, { sortOrder: Number(event.target.value) })} /></label>
            <label className="check-row"><input type="checkbox" checked={project.isPublished} onChange={(event) => updateProject(project.id, { isPublished: event.target.checked })} /> منشور للزوار</label>
            <button type="button" className="inline-add" onClick={() => removeProject(project.id)}>حذف من المسودة</button>
          </div>
        </article>)}
        {!projects.length && <div className="cms-empty">الصفحة جاهزة. أضف أول عمل من النموذج أعلاه عندما ترغب في عرضه.</div>}
      </section>
    </> : <>
      <section className="admin-content-card">
        <div className="admin-content-title"><div><h2>بيانات الصفحة</h2><p>عدّل العنوان والوصف، ثم أضف الأقسام والبطاقات ورتبها حسب رغبتك.</p></div></div>
        <label className="admin-field">عنوان الصفحة<input value={asString(draft.content.title)} onChange={(event) => updateContent("title", event.target.value)} /></label>
        <label className="admin-field">وصف الصفحة<textarea rows={3} value={asString(draft.content.description)} onChange={(event) => updateContent("description", event.target.value)} /></label>
      </section>
      <section className="admin-content-card"><div className="admin-content-title"><div><h2>أقسام الصفحة</h2><p>يمكن لكل قسم أن يكون نصًا أو شبكة بطاقات مع صور وألوان مستقلة.</p></div><button type="button" className="inline-add" onClick={addSection}>+ إضافة قسم</button></div>{sections.map((section, index) => <SectionEditor key={section.id} section={section} index={index} count={sections.length} onChange={(patch) => updateSection(section.id, patch)} onMove={(direction) => moveSection(section.id, direction)} onDelete={() => updateContent("sections", sections.filter((item) => item.id !== section.id))} onAddCard={() => addBlockCard(section)} onCardChange={(id, patch) => updateBlockCard(section, id, patch)} onCardDelete={(id) => updateSection(section.id, { cards: section.cards.filter((card) => card.id !== id) })} onUpload={(event, callback) => void uploadImage(event, callback)} busy={busy} />)}{!sections.length && <p className="cms-empty">أضف القسم الأول، وستظهر معاينته للزوار بعد النشر.</p>}</section>
    </>}

    </>}
    {showCreatePage && <section className="admin-content-card"><div className="admin-content-title"><div><h2>إنشاء صفحة جديدة</h2><p>تبقى الصفحة مسودة حتى تفعّل نشرها. رابط الصفحة يكون مثل atsh-ai.com/about.</p></div></div><form className="cms-create-form" onSubmit={createPage}><label className="admin-field">اسم الصفحة<input required maxLength={120} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></label><label className="admin-field">جزء الرابط بالإنجليزية<input required maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="about-us" value={newSlug} onChange={(event) => setNewSlug(event.target.value.toLowerCase())} /></label><button className="button" disabled={busy}>إنشاء الصفحة</button></form></section>}
    <div className="admin-actions cms-bottom-actions"><button type="button" className="button button-outline" onClick={previewPage}>معاينة</button><button type="button" className="button button-outline" disabled={busy} onClick={() => void savePage(false)}>حفظ فقط</button><button type="button" className="button" disabled={busy} onClick={() => void savePage(true)}>{busy ? "جارٍ الحفظ…" : "حفظ ونشر"}</button><span className="field-hint">تأكد من حالة النشر أعلى المحرر قبل اعتماد الصفحة.</span></div>
  </div>;
}

function HomeCardCollection({ title, value, onChange, secondLabel = "الوصف" }: { title: string; value: CMSCard[]; onChange: (next: CMSCard[]) => void; secondLabel?: string }) {
  return <div className="cms-list-editor"><div className="cms-section-heading"><h3>{title}</h3><button type="button" className="inline-add" onClick={() => onChange([...value, { id: newId(), title: "بطاقة جديدة", description: "", imageUrl: "", href: "", linkLabel: "" }])}>+ إضافة</button></div>
    {value.map((card, index) => <article className="cms-home-card" key={card.id}><strong>{String(index + 1).padStart(2, "0")}</strong><label className="admin-field">العنوان<input value={card.title} onChange={(event) => onChange(value.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} /></label><label className="admin-field">{secondLabel}<textarea rows={2} value={card.description} onChange={(event) => onChange(value.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} /></label><button type="button" className="inline-add" onClick={() => onChange(value.filter((_, i) => i !== index))}>حذف</button></article>)}
  </div>;
}

function SectionEditor({ section, index, count, onChange, onMove, onDelete, onAddCard, onCardChange, onCardDelete, onUpload, busy }: { section: CMSSection; index: number; count: number; onChange: (patch: Partial<CMSSection>) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void; onAddCard: () => void; onCardChange: (id: string, patch: Partial<CMSCard>) => void; onCardDelete: (id: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => void; busy: boolean }) {
  return <article className="cms-section-editor">
    <header><strong>القسم {index + 1}</strong><div><button type="button" className="inline-add" disabled={index === 0} onClick={() => onMove(-1)}>↑ للأعلى</button><button type="button" className="inline-add" disabled={index === count - 1} onClick={() => onMove(1)}>↓ للأسفل</button><button type="button" className="inline-add cms-delete" onClick={()=>onChange({isVisible:false,title:"",body:"",cards:[]})}>مسح محتوى القسم وإخفاؤه</button><button type="button" className="inline-add cms-delete" onClick={onDelete}>حذف القسم</button></div></header>
    <div className="cms-fields-grid"><label className="admin-field">عنوان قصير<input value={section.eyebrow ?? ""} onChange={(event) => onChange({ eyebrow: event.target.value })} /></label><label className="admin-field">عنوان القسم<input value={section.title ?? ""} onChange={(event) => onChange({ title: event.target.value })} /></label><label className="admin-field cms-full">النص<textarea rows={3} value={section.body ?? ""} onChange={(event) => onChange({ body: event.target.value })} /></label><label className="admin-field">حجم خط العنوان (px)<input type="number" min="12" max="80" value={section.titleFontSize||24} onChange={(event)=>onChange({titleFontSize:Number(event.target.value)})} /></label><label className="admin-field">حجم خط الشرح (px)<input type="number" min="10" max="40" value={section.bodyFontSize||16} onChange={(event)=>onChange({bodyFontSize:Number(event.target.value)})} /></label><label className="admin-field">نوع القسم<select value={section.layout ?? "text"} onChange={(event) => onChange({ layout: event.target.value as CMSSection["layout"] })}><option value="text">نص</option><option value="cards">بطاقات</option></select></label><label className="admin-field">عدد أعمدة البطاقات<select value={section.columns ?? 3} onChange={(event) => onChange({ columns: Number(event.target.value) })}><option value={2}>عمودان</option><option value={3}>3 أعمدة</option><option value={4}>4 أعمدة</option></select></label><label className="theme-swatch">لون الخلفية<input type="color" value={section.backgroundColor || "#ffffff"} onChange={(event) => onChange({ backgroundColor: event.target.value })} /></label><label className="theme-swatch">لون النص<input type="color" value={section.textColor || "#26313f"} onChange={(event) => onChange({ textColor: event.target.value })} /></label><label className="check-row"><input type="checkbox" checked={section.isVisible !== false} onChange={(event) => onChange({ isVisible: event.target.checked })} /> ظاهر للزوار</label><label className="admin-field">محاذاة المحتوى<select value={section.align ?? "right"} onChange={(event) => onChange({ align: event.target.value as CMSSection["align"] })}><option value="right">يمين</option><option value="center">وسط</option></select></label></div>
    {section.layout === "cards" && <div className="cms-block-cards"><div className="cms-section-heading"><h4>بطاقات القسم</h4><button type="button" className="inline-add" onClick={onAddCard}>+ بطاقة</button></div>{(section.cards ?? []).map((card) => <article className="cms-block-card" key={card.id}><label className="admin-field">عنوان البطاقة<input value={card.title} onChange={(event) => onCardChange(card.id, { title: event.target.value })} /></label><label className="admin-field cms-full">وصف البطاقة<textarea rows={2} value={card.description} onChange={(event) => onCardChange(card.id, { description: event.target.value })} /></label><label className="admin-field">رابط الصورة<input value={card.imageUrl} onChange={(event) => onCardChange(card.id, { imageUrl: event.target.value })} /><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => onUpload(event, (url) => onCardChange(card.id, { imageUrl: url }))} /></label><label className="admin-field">رابط زر البطاقة<input value={card.href} onChange={(event) => onCardChange(card.id, { href: event.target.value })} /></label><label className="admin-field">نص الزر<input value={card.linkLabel} onChange={(event) => onCardChange(card.id, { linkLabel: event.target.value })} /></label><button type="button" className="inline-add cms-delete" onClick={() => onCardDelete(card.id)}>حذف البطاقة</button></article>)}</div>}
  </article>;
}
