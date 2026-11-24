"use client";

import { useEffect, useState, type ChangeEvent } from "react";

type Scene = {
  seconds: number;
  visual: string;
  characters: string;
  lighting: string;
  script: string;
  caption: string;
  motion: "zoom-in" | "zoom-out" | "static";
  camera: string;
  props: string;
  sound: string;
};

type ProductionPlan = {
  version: 1;
  approved: false;
  title: string;
  campaign: { objective: string; audience: string; keyMessage: string; tone: string; format: string; totalDurationSeconds: number };
  brand: { palette: string; logoPlacement: string; logoRules: string };
  concept: string;
  voiceover: string;
  musicAndSound: string;
  cta: string;
  scenes: Scene[];
  postProduction: string;
  openQuestions: string[];
  productionChecklist: string[];
};

type DraftSummary = { id: string; title: string; source_filename: string; status: string; updated_at: string; video_generated_at: string | null; has_video: boolean };
type Draft = DraftSummary & { brief_markdown: string; production_plan: ProductionPlan; video_size: number | null };
type ServiceStatus = { aiConfigured: boolean; aiModel: string | null; workflowConfigured: boolean };
type ApiResult = Record<string, any>;

const statusLabels: Record<string, string> = { draft: "مسودة", reviewed: "معتمدة للمراجعة", generating: "الفيديو قيد التجهيز", video_ready: "الفيديو جاهز للمعاينة" };
const accept = ".pdf,.doc,.docx,.rtf,.odt,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx";

async function requestJson<T = ApiResult>(path: string, init?: RequestInit): Promise<T> {
  const contentType = init?.method === "PATCH" ? "application/vnd.atsh-content-studio+json" : "application/json";
  const response = await fetch(`/api/admin/content-studio${path}`, { ...init, credentials: "include", cache: "no-store", headers: { ...(init?.body ? { "Content-Type": contentType } : {}), ...init?.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || result.message || "تعذر تنفيذ العملية.");
  return result as T;
}

function toBase64(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes);
  let binary = "";
  for (let offset = 0; offset < data.length; offset += 0x8000) binary += String.fromCharCode(...data.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

async function pngLogo(file: File) {
  if (file.type === "image/png" && file.size <= 512 * 1024) return toBase64(await file.arrayBuffer());
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source; await image.decode();
    for (const width of [512, 384, 256, 192]) {
      const ratio = Math.min(1, width / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext("2d"); if (!context) throw new Error("تعذر تجهيز الشعار.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
      if (base64.length <= 700_000) return base64;
    }
  } finally { URL.revokeObjectURL(source); }
  throw new Error("الشعار كبير؛ اختر صورة أصغر من 512 كيلوبايت.");
}

function safeFilename(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}._ -]+/gu, "-").replace(/\s+/g, "-").slice(0, 80) || "ATSH-AI-ad-brief";
}

export default function ContentStudio() {
  const [service, setService] = useState<ServiceStatus>({ aiConfigured: false, aiModel: null, workflowConfigured: false });
  const [items, setItems] = useState<DraftSummary[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [idea,setIdea]=useState("");
  const [audience,setAudience]=useState("");
  const [duration,setDuration]=useState("15");
  const [platform,setPlatform]=useState("Facebook / Instagram Reels");
  const [analysisConsent, setAnalysisConsent] = useState(false);
  const [productionConsent, setProductionConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([requestJson<ServiceStatus>("/status"), requestJson<{ drafts: DraftSummary[] }>("")]).then(async ([status, list]) => {
      if (!active) return;
      setService(status);
      const nextItems = list.drafts ?? [];
      setItems(nextItems);
      if (nextItems[0]) await loadDraft(nextItems[0].id, () => active);
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "تعذر تحميل منشئ المحتوى."); });
    return () => { active = false; };
    // Initial load only; selection is handled by explicit actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  async function refreshList() {
    const [status, result] = await Promise.all([requestJson<ServiceStatus>("/status"), requestJson<{ drafts: DraftSummary[] }>("")]);
    setService(status); setItems(result.drafts ?? []);
  }

  async function loadDraft(id: string, active?: () => boolean) {
    const result = await requestJson<{ draft: Draft }>(`/${id}`);
    if (active && !active()) return;
    setDraft(result.draft); setError(""); setNotice(""); setVideoUrl(""); setProductionConsent(false);
    if (result.draft.has_video) await loadVideo(id, active);
  }

  async function loadVideo(id: string, active?: () => boolean) {
    const response = await fetch(`/api/admin/content-studio/${id}/video`, { credentials: "include", cache: "no-store" });
    if (!response.ok) return;
    const blob = await response.blob();
    if (active && !active()) return;
    setVideoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => current ? { ...current, ...patch, status: "draft", has_video: false, video_generated_at: null, video_size: null } : current);
    setVideoUrl(""); setProductionConsent(false);
  }

  function updatePlan(patch: Partial<ProductionPlan>) {
    if (!draft) return;
    updateDraft({ production_plan: { ...draft.production_plan, ...patch, approved: false } });
  }

  function updateCampaign(key: keyof ProductionPlan["campaign"], value: string | number) {
    if (!draft) return;
    updatePlan({ campaign: { ...draft.production_plan.campaign, [key]: value } });
  }

  function updateBrand(key: keyof ProductionPlan["brand"], value: string) {
    if (!draft) return;
    updatePlan({ brand: { ...draft.production_plan.brand, [key]: value } });
  }

  function updateScene(index: number, key: keyof Scene, value: string | number) {
    if (!draft) return;
    updatePlan({ scenes: draft.production_plan.scenes.map((scene, sceneIndex) => sceneIndex === index ? { ...scene, [key]: value } : scene) });
  }

  async function analyze(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    const source = file || (idea.trim().length>=10 ? new File([`فكرة الإعلان: ${idea}\nالجمهور: ${audience}\nالمدة المطلوبة: ${duration} ثانية\nمنصة العرض: ${platform}`],"manual-brief.txt",{type:"text/plain"}) : null);
    if (!source) { setError("اكتب فكرة الإعلان أو اختر ملف التكليف."); return; }
    if (source.size > 8 * 1024 * 1024) { setError("الحد الأقصى للملف 8 ميجابايت."); return; }
    if (!analysisConsent) { setError("أكد موافقتك على إرسال الملف إلى OpenAI للتحليل."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const managerNotesBase64 = btoa(unescape(encodeURIComponent(managerNotes.trim())));
      const response = await fetch("/api/admin/content-studio/analyze", { method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": source.type || "application/octet-stream", "X-File-Name": encodeURIComponent(source.name), "X-Analysis-Consent": "openai", "X-Manager-Notes-Base64": managerNotesBase64 }, body: source });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "تعذر تحليل الملف.");
      const created = result.draft as Draft;
      setDraft(created); setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]); setFile(null); setIdea(""); setAnalysisConsent(false); setManagerNotes("");
      setNotice("جهزت المسودة. راجع النص والمشاهد وعدّلها قبل اعتمادها.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تحليل الملف."); }
    finally { setBusy(false); }
  }

  async function saveDraft(status = "draft") {
    if (!draft) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestJson<{ draft: Draft }>(`/${draft.id}`, { method: "PATCH", body: JSON.stringify({ title: draft.title, briefMarkdown: draft.brief_markdown, productionPlan: { ...draft.production_plan, approved: false }, status }) });
      setDraft(result.draft); await refreshList(); setNotice(status === "reviewed" ? "تم اعتماد الخطة للمراجعة والإنتاج." : "حُفظت التعديلات كمسودة.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ المسودة."); }
    finally { setBusy(false); }
  }

  async function produceVideo() {
    if (!draft) return;
    if (draft.status !== "reviewed") { setError("احفظ الخطة واعتمدها للمراجعة قبل طلب الفيديو."); return; }
    if (!productionConsent) { setError("أكد موافقتك على إرسال الخطة إلى ورَك فلو الإنتاج."); return; }
    setBusy(true); setError(""); setNotice(""); setVideoUrl("");
    try {
      const [logoBase64, audioBase64] = await Promise.all([
        logo ? pngLogo(logo) : Promise.resolve(undefined),
        audio ? audio.size <= 2 * 1024 * 1024 ? audio.arrayBuffer().then(toBase64) : Promise.reject(new Error("الحد الأقصى للصوت 2 ميجابايت.")) : Promise.resolve(undefined)
      ]);
      const response = await fetch(`/api/admin/content-studio/${draft.id}/produce`, { method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/vnd.atsh-ad-production+json" }, body: JSON.stringify({ logoBase64, audioBase64 }) });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || result.message || "تعذر إنتاج الفيديو عبر ورَك فلو.");
      }
      const blob = await response.blob();
      setVideoUrl(URL.createObjectURL(blob)); setDraft((current) => current ? { ...current, status: "video_ready", has_video: true, video_generated_at: new Date().toISOString(), video_size: blob.size } : current);
      await refreshList(); setNotice("الفيديو جاهز. راجعه من المشغل أو نزّله لعرضه على المدير.");
      setProductionConsent(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إنتاج الفيديو."); }
    finally { setBusy(false); }
  }

  function downloadText(filename: string, contents: string, type: string) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>, kind: "source" | "logo" | "audio") {
    const selected = event.target.files?.[0] ?? null;
    if (kind === "source") setFile(selected);
    if (kind === "logo") setLogo(selected);
    if (kind === "audio") setAudio(selected);
    event.target.value = "";
  }

  const sceneTotal = draft?.production_plan.scenes.reduce((sum, item) => sum + Number(item.seconds || 0), 0) ?? 0;

  return <div className="content-studio">
    <section className="admin-content-card">
      <div className="admin-content-title"><div><h2>منشئ المحتوى الإعلاني</h2><p>ارفع ملف التكليف، راجع الخطة والمشاهد، ثم أرسل الخطة المعتمدة إلى ورَك فلو إنتاج الفيديو.</p></div><span className="status-chip">{items.length} مشروع</span></div>
      <div className="studio-service-grid">
        <div className={service.aiConfigured ? "studio-connection is-ready" : "studio-connection is-pending"}><i /> الذكاء الاصطناعي: {service.aiConfigured ? `متصل${service.aiModel ? ` · ${service.aiModel}` : ""}` : "يحتاج إعداد مفتاح النموذج في Coolify"}</div>
        <div className={service.workflowConfigured ? "studio-connection is-ready" : "studio-connection is-pending"}><i /> ورَك فلو الفيديو: {service.workflowConfigured ? "إعداد الاتصال موجود" : "أضف رابط Webhook واعتمادها في Coolify"}</div>
      </div>
      <form className="studio-upload-form" onSubmit={(event) => void analyze(event)}>
        <label className="admin-field">فكرة الإعلان مباشرة<textarea rows={4} maxLength={6000} value={idea} onChange={e=>setIdea(e.target.value)} placeholder="اكتب المنتج أو الخدمة والرسالة المطلوبة" /></label><label className="admin-field">الجمهور المستهدف<input value={audience} onChange={e=>setAudience(e.target.value)} /></label><label className="admin-field">المدة المطلوبة<select value={duration} onChange={e=>setDuration(e.target.value)}>{[8,12,15,20,24,30].map(n=><option key={n} value={n}>{n} ثانية</option>)}</select></label><label className="admin-field">منصة العرض<select value={platform} onChange={e=>setPlatform(e.target.value)}>{["Facebook / Instagram Reels","TikTok","YouTube Shorts"].map(p=><option key={p}>{p}</option>)}</select></label><label className="admin-field">أو ملف التكليف<input type="file" accept={accept} disabled={busy || !service.aiConfigured} onChange={(event) => void handleFile(event, "source")} /><small>PDF، Word، PowerPoint، Excel أو نص · حتى 8 ميجابايت · {file?.name ?? "لم يُختر ملف"}</small></label>
        <label className="admin-field">ملاحظات المدير (اختياري)<textarea rows={2} maxLength={3000} value={managerNotes} onChange={(event) => setManagerNotes(event.target.value)} placeholder="المنصة، الجمهور، المدة أو أي توجيهات إضافية" /></label>
        <label className="check-row studio-consent"><input type="checkbox" checked={analysisConsent} onChange={(event) => setAnalysisConsent(event.target.checked)} /> أوافق على إرسال فكرة الإعلان أو الملف إلى OpenAI لتحويله إلى خطة إعلان. لن تُحفظ نسخة الملف في قاعدة بيانات المنصة.</label>
        <button className="button" disabled={busy || !service.aiConfigured || (!file && idea.trim().length<10)}>{busy ? "جارٍ تجهيز الخطة…" : "جهّز خطة الإعلان ✦"}</button>
      </form>
    </section>

    {items.length > 0 && <section className="admin-content-card studio-project-list"><div className="admin-content-title"><div><h2>ملفات العمل</h2><p>افتح مسودة سابقة لاستكمالها أو مراجعة الفيديو.</p></div></div><div className="studio-draft-grid">{items.map((item) => <button type="button" key={item.id} className={draft?.id === item.id ? "studio-draft-item active" : "studio-draft-item"} onClick={() => void loadDraft(item.id)}><strong>{item.title}</strong><span>{item.source_filename || "بدون ملف مصدر"}</span><small>{statusLabels[item.status] || item.status} · {new Date(item.updated_at).toLocaleDateString("ar-EG")}</small></button>)}</div></section>}

    {draft && <>
      <section className="admin-content-card">
        <div className="admin-content-title"><div><h2>مراجعة الخطة</h2><p>المسودة من الملف: {draft.source_filename || "نص يدوي"} · {sceneTotal} ثانية · {draft.production_plan.scenes.length} مشاهد</p></div><span className="status-chip">{statusLabels[draft.status] || draft.status}</span></div>
        <div className="studio-toolbar"><label className="admin-field studio-title-field">اسم الحملة<input maxLength={180} value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} /></label><div className="studio-download-actions"><button type="button" className="button button-outline" onClick={() => downloadText(`${safeFilename(draft.title)}.md`, draft.brief_markdown, "text/markdown;charset=utf-8")}>تنزيل ملف الخطة</button><button type="button" className="button button-outline" onClick={() => downloadText(`${safeFilename(draft.title)}-production.json`, JSON.stringify({ ...draft.production_plan, approved: false }, null, 2), "application/json;charset=utf-8")}>تنزيل JSON</button></div></div>
        <label className="admin-field studio-brief-field">المستند التفصيلي — قابل للتحرير<textarea rows={18} value={draft.brief_markdown} onChange={(event) => updateDraft({ brief_markdown: event.target.value })} /></label>
        <div className="studio-plan-grid">
          <label className="admin-field">هدف الإعلان<input value={draft.production_plan.campaign.objective} onChange={(event) => updateCampaign("objective", event.target.value)} /></label>
          <label className="admin-field">الجمهور المستهدف<input value={draft.production_plan.campaign.audience} onChange={(event) => updateCampaign("audience", event.target.value)} /></label>
          <label className="admin-field">الرسالة الرئيسية<input value={draft.production_plan.campaign.keyMessage} onChange={(event) => updateCampaign("keyMessage", event.target.value)} /></label>
          <label className="admin-field">أسلوب الإعلان<input value={draft.production_plan.campaign.tone} onChange={(event) => updateCampaign("tone", event.target.value)} /></label>
          <label className="admin-field studio-full">الفكرة الإبداعية<textarea rows={3} value={draft.production_plan.concept} onChange={(event) => updatePlan({ concept: event.target.value })} /></label>
          <label className="admin-field studio-full">التعليق الصوتي المقترح<textarea rows={3} value={draft.production_plan.voiceover} onChange={(event) => updatePlan({ voiceover: event.target.value })} /></label>
          <label className="admin-field">دعوة الإجراء<input maxLength={28} value={draft.production_plan.cta} onChange={(event) => updatePlan({ cta: event.target.value })} /></label>
          <label className="admin-field">ألوان الهوية<input value={draft.production_plan.brand.palette} onChange={(event) => updateBrand("palette", event.target.value)} /></label>
          <label className="admin-field">موضع الشعار<input value={draft.production_plan.brand.logoPlacement} onChange={(event) => updateBrand("logoPlacement", event.target.value)} /></label>
          <label className="admin-field">قواعد استخدام الشعار<input value={draft.production_plan.brand.logoRules} onChange={(event) => updateBrand("logoRules", event.target.value)} /></label>
          <label className="admin-field studio-full">الموسيقى والمؤثرات الصوتية<textarea rows={2} value={draft.production_plan.musicAndSound} onChange={(event) => updatePlan({ musicAndSound: event.target.value })} /></label>
        </div>
      </section>

      <section className="admin-content-card">
        <div className="admin-content-title"><div><h2>تفاصيل المشاهد</h2><p>الفيديو الحالي يدعم حتى 4 مشاهد؛ اكتب وصف الصورة بالإنجليزية ليكون أدق لمولّد الصور، وبقية التفاصيل بالعربية.</p></div><button type="button" className="inline-add" disabled={busy || draft.production_plan.scenes.length >= 4} onClick={() => updatePlan({ scenes: [...draft.production_plan.scenes, { seconds: 4, visual: "", characters: "", lighting: "", script: "", caption: "", motion: "zoom-in", camera: "", props: "", sound: "" }] })}>+ إضافة مشهد</button></div>
        <div className="studio-scenes">{draft.production_plan.scenes.map((scene, index) => <article className="studio-scene" key={index}><header><strong>المشهد {index + 1}</strong><label className="admin-field">المدة بالثواني<input type="number" min={3} max={8} value={scene.seconds} onChange={(event) => updateScene(index, "seconds", Number(event.target.value))} /></label><label className="admin-field">حركة الكاميرا<select value={scene.motion} onChange={(event) => updateScene(index, "motion", event.target.value)}><option value="zoom-in">تقريب</option><option value="zoom-out">ابتعاد</option><option value="static">ثابتة</option></select></label>{draft.production_plan.scenes.length > 1 && <button type="button" className="inline-add cms-delete" onClick={() => updatePlan({ scenes: draft.production_plan.scenes.filter((_, sceneIndex) => sceneIndex !== index) })}>حذف المشهد</button>}</header><div className="studio-plan-grid"><label className="admin-field studio-full">وصف الصورة / الكادر<input maxLength={600} value={scene.visual} onChange={(event) => updateScene(index, "visual", event.target.value)} /></label><label className="admin-field">الشخصيات<input maxLength={240} value={scene.characters} onChange={(event) => updateScene(index, "characters", event.target.value)} /></label><label className="admin-field">الإضاءة<input maxLength={120} value={scene.lighting} onChange={(event) => updateScene(index, "lighting", event.target.value)} /></label><label className="admin-field studio-full">الحدث والحوار / السيناريو<textarea rows={2} maxLength={400} value={scene.script} onChange={(event) => updateScene(index, "script", event.target.value)} /></label><label className="admin-field">النص الظاهر على الشاشة<input maxLength={42} value={scene.caption} onChange={(event) => updateScene(index, "caption", event.target.value)} /></label><label className="admin-field">حركة الكاميرا / زاويتها<input value={scene.camera} onChange={(event) => updateScene(index, "camera", event.target.value)} /></label><label className="admin-field">المستلزمات والديكور<input value={scene.props} onChange={(event) => updateScene(index, "props", event.target.value)} /></label><label className="admin-field">الصوت الخاص بالمشهد<input value={scene.sound} onChange={(event) => updateScene(index, "sound", event.target.value)} /></label></div></article>)}</div>
        <label className="admin-field studio-brief-field">تعليمات ما بعد الإنتاج<textarea rows={3} value={draft.production_plan.postProduction} onChange={(event) => updatePlan({ postProduction: event.target.value })} /></label>
        {draft.production_plan.openQuestions.length > 0 && <div className="studio-question-box"><strong>نقاط تحتاج تأكيدًا من المدير</strong><ul>{draft.production_plan.openQuestions.map((question, index) => <li key={index}>{question}</li>)}</ul></div>}
        <div className="admin-actions studio-review-actions"><button type="button" className="button button-outline" disabled={busy} onClick={() => void saveDraft("draft")}>حفظ كمسودة</button><button type="button" className="button" disabled={busy} onClick={() => void saveDraft("reviewed")}>{busy ? "جارٍ الحفظ…" : "اعتماد الخطة قبل الإنتاج ✓"}</button></div>
      </section>

      {draft.status === "reviewed" && <section className="admin-content-card studio-production-card"><div className="admin-content-title"><div><h2>إنتاج الفيديو من الورك فلو</h2><p>الورك فلو تستقبل الخطة المعتمدة وترجع فيديو MP4 إلى صفحة المدير. يمكنك إضافة شعار PNG/JPG أو ملف MP3 اختياري.</p></div></div><div className="studio-assets"><label className="admin-field">الشعار (PNG أو JPG، حتى 512 كيلوبايت)<input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={(event) => void handleFile(event, "logo")} /><small>{logo?.name ?? "اختياري؛ يحوّله المتصفح إلى PNG قبل الإرسال"}</small></label><label className="admin-field">موسيقى MP3 (حتى 2 ميجابايت)<input type="file" accept="audio/mpeg,.mp3" disabled={busy} onChange={(event) => void handleFile(event, "audio")} /><small>{audio?.name ?? "اختياري؛ بدونها سيكون الفيديو صامتًا"}</small></label></div><label className="check-row studio-consent"><input type="checkbox" checked={productionConsent} onChange={(event) => setProductionConsent(event.target.checked)} /> أوافق على إرسال الخطة والشعار أو الصوت المختار إلى ورَك فلو الإنتاج لتجهيز الفيديو.</label><div className="admin-actions"><button type="button" className="button" disabled={busy || !service.workflowConfigured || !productionConsent} onClick={() => void produceVideo()}>{busy ? "جارٍ إنتاج الفيديو…" : "أرسل الخطة وأنتج الفيديو ▶"}</button></div></section>}

      {(draft.status === "video_ready" || videoUrl) && <section className="admin-content-card studio-video-card"><div className="admin-content-title"><div><h2>الفيديو للمراجعة</h2><p>الفيديو محفوظ في قاعدة بيانات المنصة. راجعه ثم نزّله للمدير.</p></div>{draft.video_size && <span className="status-chip">{(draft.video_size / (1024 * 1024)).toFixed(1)} ميجابايت</span>}</div>{videoUrl ? <><video className="studio-video" controls playsInline src={videoUrl}>متصفحك لا يدعم عرض الفيديو.</video><div className="admin-actions"><a className="button" href={videoUrl} download={`${safeFilename(draft.title)}.mp4`}>تنزيل الفيديو MP4 ↓</a></div></> : <button type="button" className="button button-outline" onClick={() => void loadVideo(draft.id)}>إعادة تحميل الفيديو</button>}</section>}
    </>}

    {!draft && items.length === 0 && <section className="admin-content-card cms-empty">ستظهر هنا خطط الإعلانات التي تنشئها وتراجعها.</section>}
    {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
  </div>;
}
