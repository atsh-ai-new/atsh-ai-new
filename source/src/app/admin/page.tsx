"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { formatEgp } from "@/lib/catalog";
import { siteCopyDefaults, siteCopyFields } from "@/lib/site-copy";
import ContentManager from "./content-manager";
import { createPagePreviewUrl } from "@/lib/page-preview";
import CatalogManager from "./catalog-manager";
import AssistantKnowledge from "./assistant-knowledge";
import IntegrationStatus from "./integration-status";
import ContentStudio from "./content-studio";
import JourneyManager from "./journey-manager";
import CommercialManager from "./commercial-manager";

type Role = "owner" | "admin" | "editor" | "sales" | "viewer";
type View = "overview" | "integrations" | "assistant-knowledge" | "content" | "pages" | "works" | "content-studio" | "journey" | "commercial" | "options" | "theme" | "inbox" | "team" | "audit";
type Package = { id: string; name: string; tagline: string; description: string; price: number | string; currency: string; features: string[]; is_featured: boolean; is_custom_quote: boolean; is_published: boolean; sort_order: number; visibility: "both" | "packages" | "systems" };
type Option = { id: string; package_id: string; code: string; name: string; description: string; price: number | string; pricing_type: "fixed" | "monthly" | "yearly" | "per_page"; unit_label: string; is_required: boolean; is_active: boolean; sort_order: number; visibility: "both" | "packages" | "systems" };
type Order = { id: string; reference: string; customer_name: string; phone: string; email: string | null; status: string; currency: string; total: number | string; created_at: string; assigned_to: string | null; assigned_to_name: string | null; package_name: string | null; notes?: string; linked_project_id?: string | null; snapshot?: { package?: { name?: string }; options?: Array<{ name: string; quantity?: number; lineTotal?: number }> } };
type JourneyProject = { id:string; customer_name:string; customer_email:string|null; status:string; created_at:string };
type Member = { id: string; email: string; display_name: string; role: Exclude<Role, "owner">; is_active: boolean; permission_overrides?: Record<string, boolean> | null; created_at: string };
type Theme = { navy: string; blue: string; gold: string; page: string; logoUrl: string; heroImageUrl: string; backgroundImageUrl: string; fontFamily: "IBM Plex Sans Arabic" | "Cairo" | "Tajawal"; cardRadius: number };
type Audit = { id: number; actor: string; action: string; entity_type: string; created_at: string };
type AdminUser = { email: string; role: Role; permissions?: Record<string, boolean> };
type EmailStatus = { configured: boolean; from: string; replyTo: string };
type PageContent = Record<string, string>;
type ApiPayload = Record<string, any>;
type PackageDraft = { name: string; tagline: string; description: string; price: string; features: string; copyFromPackageId: string; isFeatured: boolean; isCustomQuote: boolean; isPublished: boolean };
type OptionDraft = { packageId: string; code: string; name: string; description: string; price: string; pricingType: Option["pricing_type"]; unitLabel: string; isRequired: boolean; isActive: boolean; visibility: "both" | "packages" | "systems" };

const nav: Array<{ id: View; label: string; icon: string }> = [
  { id: "overview", label: "نظرة عامة", icon: "◫" }, { id: "integrations", label: "حالة الربط", icon: "🔌" }, { id:"assistant-knowledge",label:"تعريفات GPT والردود",icon:"✦" }, { id: "content", label: "تعديل المحتوى", icon: "▤" },
  { id: "pages", label: "صفحات المنصة", icon: "▧" }, { id: "works", label: "سجل الأعمال السابقة", icon: "▣" },
  { id: "content-studio", label: "منشئ المحتوى", icon: "✦" },
  { id: "journey", label: "المشاريع", icon: "◎" },
  { id: "commercial", label: "العروض والعقود", icon: "▤" },
  { id: "options", label: "المنتجات", icon: "▦" },
  { id: "theme", label: "تصميم المنصة", icon: "◉" }, { id: "inbox", label: "طلبات العملاء", icon: "✉" },
  { id: "team", label: "إدارة الفريق", icon: "♙" }, { id: "audit", label: "سجل التغييرات", icon: "≡" }
];
const adminGroups: Array<{label:string;views:View[]}>= [
 {label:"نظرة عامة",views:["overview"]},
 {label:"المساعد الذكي",views:["assistant-knowledge"]},
 {label:"العملاء",views:["inbox","journey"]},
 {label:"الفريق",views:["team"]},
 {label:"محتوى المنصة",views:["pages","content-studio"]},
 {label:"المنتجات",views:["options"]}
];
const defaultTheme: Theme = { navy: "#203958", blue: "#4c78ae", gold: "#b59a6b", page: "#faf9f5", logoUrl: "/images/atsh-logo.jpg", heroImageUrl: "/images/atsh-hero.jpg", backgroundImageUrl: "", fontFamily: "IBM Plex Sans Arabic", cardRadius: 16 };
const statuses = ["new", "reviewing", "quoted", "approved", "in_progress", "completed", "cancelled"] as const;
const statusLabels: Record<string, string> = { new: "جديد", reviewing: "قيد المراجعة", quoted: "تم إرسال عرض", approved: "موافق عليه", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
const roleLabels: Record<Role, string> = { owner: "مالك المنصة", admin: "مدير", editor: "محرر محتوى", sales: "متابعة العملاء", viewer: "مشاهدة فقط" };
const roleCapabilities: Record<Role, string[]> = {
  owner: ["نظرة عامة","المساعد الذكي","العملاء","إدارة الفريق","منشئ المحتوى","المنتجات","إعدادات المنصة"],
  admin: ["نظرة عامة","المساعد الذكي","العملاء","منشئ المحتوى","المنتجات","إعدادات المنصة"],
  editor: ["نظرة عامة","المساعد الذكي","منشئ المحتوى","صفحات المنصة"],
  sales: ["نظرة عامة","طلبات العملاء","المشاريع"],
  viewer: ["نظرة عامة"]
};

async function api(path: string, init?: RequestInit): Promise<ApiPayload> {
  const response = await fetch(`/api/admin/${path}`, { ...init, credentials: "include", cache: "no-store", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${data.message || data.error || "تعذر تنفيذ العملية."} (HTTP ${response.status} · ${init?.method || "GET"} /api/admin/${path})`);
  return data;
}

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [offeringTab, setOfferingTab] = useState<"packages" | "systems" | "addons" | "preview">("packages");
  const [offerPreviewUrl,setOfferPreviewUrl]=useState("");
  const [orderPreviewUrl,setOrderPreviewUrl]=useState("");
  const [orderPreviewDevice,setOrderPreviewDevice]=useState<"desktop"|"mobile">("desktop");
  const previewCustomerOrder=()=>setOrderPreviewUrl(createPagePreviewUrl({slug:"home",locale:"ar",content:{previewOfferings:{packages:packages.map(p=>({...p,is_published:true})),options}}})+"#packages");
  const [offerPreviewDevice,setOfferPreviewDevice]=useState<"desktop"|"mobile">("desktop");
  const previewOfferings=()=>{setOfferPreviewUrl(createPagePreviewUrl({slug:"home",locale:"ar",content:{previewOfferings:{packages:packages.map(p=>({...p,is_published:true})),options}}})+"#packages");setOfferingTab("preview");};
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newOwnerPassword, setNewOwnerPassword] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [journeyProjects, setJourneyProjects] = useState<JourneyProject[]>([]);
  const [journeyError, setJourneyError] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({ configured: false, from: "info@atsh-ai.com", replyTo: "sales@atsh-ai.com" });
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [page, setPage] = useState<PageContent>(siteCopyDefaults);
  const [hiddenHomeFields, setHiddenHomeFields] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [vatRate, setVatRate] = useState(14);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState<Member["role"]>("sales");
  const [packageDraft, setPackageDraft] = useState<PackageDraft>({ name: "", tagline: "", description: "", price: "", features: "", copyFromPackageId: "", isFeatured: false, isCustomQuote: false, isPublished: false });
  const [optionDraft, setOptionDraft] = useState<OptionDraft>({ packageId: "", code: "", name: "", description: "", price: "", pricingType: "fixed", unitLabel: "", isRequired: false, isActive: true, visibility: "both" as const });

  const loadData = useCallback(async (role: Role = "viewer") => {
    // Keep independent admin sections usable when one backend endpoint fails.
    const endpoints = ["packages", "orders", "settings", "pages", "team", "audit", "email-status", "journey/projects"] as const;
    const results = await Promise.allSettled(endpoints.map((endpoint) => (endpoint === "audit" && role !== "owner" && role !== "admin") ? Promise.resolve({ logs: [] }) : (endpoint === "team" && role !== "owner" && role !== "admin") ? Promise.resolve({ members: [] }) : api(endpoint)));
    const failed: string[] = [];
    const getResult = (index: number): ApiPayload | null => {
      const result = results[index];
      if (result.status === "fulfilled") return result.value;
      failed.push(endpoints[index]);
      return null;
    };
    const catalog = getResult(0);
    const inbox = getResult(1);
    const settings = getResult(2);
    const pages = getResult(3);
    const team = getResult(4);
    const changes = getResult(5);
    const email = getResult(6);
    const journeys = getResult(7);

    if (catalog) {
      setPackages(catalog.packages ?? []);
      setOptions((catalog.options ?? []).filter((option: Option) => !["logo_design", "visual_identity"].includes(option.code)));
    }
    if (inbox) setOrders(inbox.orders ?? []);
    if (settings) {
      setVatRate(Number(settings.settings?.vat_rate ?? 14));
      setTheme({ ...defaultTheme, ...(settings.settings?.theme ?? {}) });
    }
    if (pages) {
      const publishedArabicHome = pages.pages?.find((item: { slug: string; locale: string }) => item.slug === "home" && item.locale === "ar")?.content ?? {};
      setPage({ ...siteCopyDefaults, ...publishedArabicHome });
      setHiddenHomeFields(new Set(Object.entries(publishedArabicHome).filter(([, value]) => typeof value === "string" && value.trim() === "").map(([key]) => key)));
    }
    if (team) setMembers(team.members ?? []);
    if (changes) setAudit(changes.logs ?? []);
    if (email) setEmailStatus({
      configured: Boolean(email.configured),
      from: typeof email.from === "string" ? email.from : "info@atsh-ai.com",
      replyTo: typeof email.replyTo === "string" ? email.replyTo : "sales@atsh-ai.com",
    });
    if (journeys) {
      setJourneyProjects(journeys.projects ?? []);
      setJourneyError("");
    } else {
      setJourneyError("تعذر تحميل مشروعات العملاء. حاول تحديث البيانات لاحقًا.");
    }
    if (failed.length) {
      setError(`تعذر تحديث بعض أقسام الإدارة: ${failed.join("، ")}. تم عرض البيانات المتاحة دون حذف البيانات المحفوظة.`);
    } else {
      setError("");
    }
  }, []);

  useEffect(() => {
    let active = true;
    api("me").then((data) => { if (!active) return; setUser({ email: data.email, role: data.role, permissions: data.permissions }); return loadData(data.role); })
      .catch((reason) => {
        if (!active) return;
        // An expired session is normal; server/rate-limit failures must not masquerade as logout.
        const message = reason instanceof Error ? reason.message : "تعذر التحقق من جلسة الإدارة.";
        if (!message.includes("HTTP 401") && !message.includes("HTTP 403")) {
          setError(`تعذر التحقق من جلسة الإدارة: ${message}`);
        }
      }).finally(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, [loadData]);

  const permitted = (key: string) => user?.role === "owner" || user?.permissions?.[key] === true;
  const canEditCatalog = permitted("products");
  const canEditContent = permitted("content");
  const canEditOrders = permitted("customers");
  const canManageTeam = user?.role === "owner";
  const viewPermissions: Partial<Record<View, string>> = {
    integrations:"settings", "assistant-knowledge":"assistant", team:"team", audit:"audit",
    options:"products", theme:"settings", content:"content", pages:"content",
    works:"content", "content-studio":"assistant", journey:"customers",
    commercial:"customers", inbox:"customers"
  };
  const visibleNav = nav.filter(item => !viewPermissions[item.id] || permitted(viewPermissions[item.id]!));
  const newOrders = useMemo(() => orders.filter((order) => order.status === "new").length, [orders]);
  const title = nav.find((item) => item.id === view)?.label ?? "إدارة المنصة";

  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api("login", { method: "POST", body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      const session = await api("me"); setUser({ email: session.email, role: session.role, permissions: session.permissions }); setLoginPassword(""); await loadData(session.role);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تسجيل الدخول."); }
    finally { setBusy(false); }
  };

  const requestOwnerPasswordReset = async () => {
    if (!loginEmail.trim()) { setError("أدخل البريد الإلكتروني لحساب المالك أولًا."); return; }
    setBusy(true); setError(""); setRecoveryMessage("");
    try {
      const result = await api("password-reset/request", { method: "POST", body: JSON.stringify({ email: loginEmail }) });
      setRecoveryMessage(result.message || "إذا كان البريد يخص مالك المنصة، تحقق من سجلات خدمة API في Coolify.");
      setRecoveryMode(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر طلب استعادة كلمة المرور."); }
    finally { setBusy(false); }
  };

  const completeOwnerPasswordReset = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api("password-reset/complete", { method: "POST", body: JSON.stringify({ token: recoveryCode, password: newOwnerPassword }) });
      setRecoveryCode(""); setNewOwnerPassword(""); setRecoveryMode(false);
      setRecoveryMessage(result.message || "تم تغيير كلمة مرور المالك. سجّل الدخول بها الآن.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تغيير كلمة المرور."); }
    finally { setBusy(false); }
  };

  const save = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(success);
      // A secondary dashboard refresh must not report a successful publish as failed.
      try { await loadData(); }
      catch { setNotice(`${success} تعذر تحديث بعض بيانات لوحة الإدارة؛ أعد فتحها لاحقًا.`); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ التغييرات."); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    // Clear every account-scoped cache so a later login cannot display another user's data.
    await api("logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setView("overview");
    setPackages([]);
    setOptions([]);
    setOrders([]);
    setJourneyProjects([]);
    setMembers([]);
    setAudit([]);
    setPage({ ...siteCopyDefaults });
    setHiddenHomeFields(new Set());
    setTheme(defaultTheme);
    setVatRate(14);
    setEmailStatus({ configured: false, from: "info@atsh-ai.com", replyTo: "sales@atsh-ai.com" });
    setJourneyError("");
    setError("");
    setNotice("");
    setLoginPassword("");
    setMemberPassword("");
    setRecoveryCode("");
    setNewOwnerPassword("");
  };

  const changePackage = <K extends keyof Package,>(id: string, key: K, value: Package[K]) => setPackages((current) => current.map((item) => item.id !== id ? item : { ...item, [key]: value }));
  const changeOption = <K extends keyof Option,>(id: string, key: K, value: Option[K]) => setOptions((current) => current.map((item) => item.id !== id ? item : { ...item, [key]: value }));
  const savePackage = (item: Package) => save(() => api(`packages/${item.id}`, { method: "PATCH", body: JSON.stringify({ name: item.name, tagline: item.tagline, description: item.description, price: item.is_custom_quote ? 0 : Number(item.price), currency: "EGP", features: item.features, isFeatured: item.is_featured, isCustomQuote: item.is_custom_quote, isPublished: item.is_published, sortOrder: item.sort_order }) }), "تم حفظ البطاقة وتحديثها للعملاء.");
  const saveOption = (item: Option) => save(() => api(`options/${item.id}`, { method: "PATCH", body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.price), pricingType: item.pricing_type, unitLabel: item.unit_label, isRequired: item.is_required, isActive: item.is_active, sortOrder: item.sort_order, visibility: item.visibility ?? "both" }) }), "تم حفظ الإضافة في قاعدة البيانات.");
  const removeOption = async (item: Option) => {
    if (!window.confirm(`إيقاف الإضافة "${item.name}"؟ ستختفي من الخيارات الجديدة مع الاحتفاظ بسجل الطلبات السابقة.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`options/${item.id}`, { method: "DELETE" });
      // Verify persisted catalog state before reporting that the option is disabled.
      const verified = await api("packages");
      const remaining = (verified.options ?? []).find((option: Option) => option.id === item.id);
      if (remaining?.is_active) throw new Error("استقبلنا طلب إيقاف الإضافة، لكن الخادم ما زال يعرضها نشطة. راجع حالة الحفظ قبل إعادة المحاولة.");
      setOptions((verified.options ?? []).filter((option: Option) => option.is_active));
      setNotice("تم التحقق من إيقاف الإضافة للطلبات الجديدة مع الاحتفاظ بسجل الطلبات السابقة.");
      // Other dashboard sections are secondary to the verified catalog mutation.
      try { await loadData(); } catch { setNotice("تم إيقاف الإضافة والتحقق من ذلك، لكن تعذر تحديث بعض أقسام اللوحة."); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إيقاف الإضافة."); }
    finally { setBusy(false); }
  };
  const savePage = () => save(async () => {
    // Preserve structured CMS sections/cards when the quick text editor publishes.
    const current = await api("pages");
    const home = (current.pages ?? []).find((item: { slug: string; locale: string }) => item.slug === "home" && item.locale === "ar");
    const textChanges = Object.fromEntries(siteCopyFields.filter(([key]) => !hiddenHomeFields.has(key)).map(([key]) => [key, page[key] ?? siteCopyDefaults[key] ?? ""]));
    const content: Record<string, unknown> = { ...(home?.content ?? {}), ...textChanges };
    // Synchronize only built-in cards, preserving custom cards and metadata.
    const sync = (key: string, prefix: string, count: number) => {
      if (!Array.isArray(content[key])) return;
      content[key] = (content[key] as Array<Record<string, unknown>>).map(item => {
        if (!item || typeof item !== "object" || typeof item.id !== "string") return item;
        const match = item.id.match(new RegExp("^" + prefix + "-([0-9]+)$"));
        if (!match || Number(match[1]) < 1 || Number(match[1]) > count) return item;
        const n = Number(match[1]);
        const titleKey = prefix === "faq" ? "faq" + n + "Question" : prefix === "trust" ? "trust" + n : prefix + n + "Title";
        const descriptionKey = prefix === "faq" ? "faq" + n + "Answer" : prefix + n + "Description";
        return { ...item, title: textChanges[titleKey] ?? item.title,
          ...(prefix === "trust" ? {} : { description: textChanges[descriptionKey] ?? item.description }) };
      });
    };
    sync("benefitCards", "benefit", 4);
    sync("processCards", "step", 3);
    sync("faqEntries", "faq", 5);
    sync("trustItems", "trust", 4);
    await api("pages/home", { method: "PATCH", body: JSON.stringify({ locale: "ar", content, isPublished: true }) });
    const published = await fetch("/api/site-content/home?locale=ar", { cache: "no-store" });
    if (!published.ok) throw new Error("تم الحفظ، لكن تعذر التحقق من نشر الصفحة الرئيسية.");
    const result = await published.json();
    if (!result.page || Object.entries(textChanges).some(([key, value]) => result.page.content?.[key] !== value)) {
      throw new Error("تم إرسال التعديلات لكن المحتوى المنشور لا يطابقها. تحقق من اتصال الواجهة والـ API بنفس قاعدة البيانات.");
    }
  }, "تم حفظ النصوص والتحقق من ظهورها في واجهة المحتوى المنشور.");
  const saveTheme = () => save(() => api("settings", { method: "PATCH", body: JSON.stringify({ vatRate: Number(vatRate), theme }) }), "تم حفظ الألوان والخط والصور والضريبة.");
  const uploadThemeImage = async (event: ChangeEvent<HTMLInputElement>, key: "logoUrl" | "heroImageUrl" | "backgroundImageUrl") => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try { const result = await api("media", { method: "POST", body: file, headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) } }); setTheme((current) => ({ ...current, [key]: result.media.url })); setNotice("تم رفع الصورة إلى التخزين الدائم للمنصة. احفظ إعدادات الهوية لتطبيقها."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر رفع الصورة."); }
    finally { setBusy(false); event.target.value = ""; }
  };
  const updateOrder = (order: Order, key: "status" | "assigned_to", value: string) => save(() => api(`orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify(key === "status" ? { status: value } : { assignedTo: value || null }) }), "تم تحديث الطلب وتسجيل التغيير.");
  const sendCustomerEmail = async (order: Order, subject: string, message: string) => {
    const result = await api(`orders/${order.id}/email`, { method: "POST", body: JSON.stringify({ subject, message }) });
    setNotice(result.message || "تم تسليم الرسالة لخدمة البريد.");
  };

  const addPackage = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const copiedOptions = options.filter((item) => item.package_id === packageDraft.copyFromPackageId).map((item) => ({ code: item.code, name: item.name, description: item.description, price: Number(item.price), pricingType: item.pricing_type, unitLabel: item.unit_label, isRequired: item.is_required, isActive: item.is_active, sortOrder: item.sort_order }));
      await api("packages", { method: "POST", body: JSON.stringify({ name: packageDraft.name, tagline: packageDraft.tagline, description: packageDraft.description, price: packageDraft.isCustomQuote ? 0 : Number(packageDraft.price), currency: "EGP", features: packageDraft.features.split("\n").map((feature) => feature.trim()).filter(Boolean), isFeatured: packageDraft.isFeatured, isCustomQuote: packageDraft.isCustomQuote, isPublished: packageDraft.isPublished, sortOrder: packages.length * 10 + 10, options: copiedOptions }) });
      setPackageDraft({ name: "", tagline: "", description: "", price: "", features: "", copyFromPackageId: "", isFeatured: false, isCustomQuote: false, isPublished: false }); await loadData(); setNotice("تم إنشاء البطاقة وخياراتها المنسوخة في قاعدة البيانات.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إنشاء الباقة."); }
    finally { setBusy(false); }
  };

  const addOption = async (event: FormEvent) => {
    event.preventDefault();
    if (["logo_design", "visual_identity"].includes(optionDraft.code.trim())) { setError("هذا الرمز قديم ومكرر. استخدم خيارات الشعار والهوية الموجودة في خطوة الشعار والهوية."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await api("options", { method: "POST", body: JSON.stringify({ ...optionDraft, price: Number(optionDraft.price), sortOrder: options.filter((item) => item.package_id === optionDraft.packageId).length * 10 + 10 }) });
      setOptionDraft((current) => ({ ...current, code: "", name: "", description: "", price: "", unitLabel: "" })); await loadData(); setNotice("تمت إضافة الخيار للباقة.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذرت إضافة الخيار."); }
    finally { setBusy(false); }
  };

  const addMember = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("team", { method: "POST", body: JSON.stringify({ email: memberEmail, displayName: memberName, role: memberRole, password: memberPassword }) });
      setMemberEmail(""); setMemberName(""); setMemberPassword(""); await loadData(); setNotice("تم إنشاء حساب العضو. شارك كلمة المرور معه عبر قناة آمنة.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إضافة عضو الفريق."); }
    finally { setBusy(false); }
  };

  if (!authChecked) return <main className="admin-gate"><section className="admin-gate-card"><img src="/images/atsh-logo.jpg" alt="" /><h1>مركز إدارة ATSH AI</h1><p>جارٍ التحقق من الجلسة الإدارية…</p></section></main>;
  if (!user) return <main className="admin-gate" dir="rtl">{recoveryMode ? <form className="admin-gate-card" onSubmit={completeOwnerPasswordReset}><img src="/images/atsh-logo.jpg" alt="" /><h1>استعادة كلمة المرور</h1><p>استخدم الرمز المؤقت الظاهر في سجلات Runtime Logs لخدمة atsh-website-api داخل Coolify. تنتهي صلاحيته خلال 15 دقيقة ويُستخدم مرة واحدة.</p>{recoveryMessage && <p className="success-message" role="status">{recoveryMessage}</p>}<label className="admin-field">رمز الاستعادة<input required autoComplete="one-time-code" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} /></label><label className="admin-field">كلمة المرور الجديدة (12 حرفًا على الأقل)<input type="password" autoComplete="new-password" minLength={12} maxLength={200} required value={newOwnerPassword} onChange={(event) => setNewOwnerPassword(event.target.value)} /></label>{error && <p className="error-message" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "جارٍ التغيير…" : "تغيير كلمة المرور"}</button><button type="button" className="inline-add" onClick={() => { setRecoveryMode(false); setError(""); setRecoveryMessage(""); }}>العودة إلى تسجيل الدخول</button></form> : <form className="admin-gate-card" onSubmit={login}><img src="/images/atsh-logo.jpg" alt="" /><h1>مركز إدارة ATSH AI</h1><p>سجّل الدخول بحساب الإدارة المتصل بخادم ATSH AI.</p><label className="admin-field">البريد الإلكتروني<input type="email" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label><label className="admin-field">كلمة المرور<input type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>{recoveryMessage && <p className="success-message" role="status">{recoveryMessage}</p>}{error && <p className="error-message" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "جارٍ التحقق…" : "تسجيل الدخول"}</button><button type="button" className="inline-add" disabled={busy} onClick={requestOwnerPasswordReset}>نسيت كلمة المرور؟</button><a href="/" className="inline-add">العودة إلى الموقع</a></form>}</main>;

  return <main className="admin-page" dir="rtl" style={{ "--navy": theme.navy, "--navy-2": theme.blue, "--blue": theme.blue, "--gold": theme.gold, "--page": theme.page, "--site-font": `\"${theme.fontFamily}\", system-ui, sans-serif`, "--card-radius": `${theme.cardRadius}px` } as React.CSSProperties}>
    <div className="admin-layout">
      <aside className="admin-sidebar"><a className="admin-brand" href="/"><img src={theme.logoUrl || "/images/atsh-logo.jpg"} alt="" /><span><strong>ATSH <b>AI</b></strong><small>مركز الإدارة</small></span></a><div className="admin-nav-label">إدارة المنصة</div><nav className="admin-nav" aria-label="أقسام لوحة الإدارة">{adminGroups.map(group=>{const allowed=visibleNav.filter(item=>group.views.includes(item.id));if(!allowed.length)return null;const active=allowed.some(item=>item.id===view);return <div key={group.label}><button type="button" className={active?"active":""} style={{fontWeight:800,marginTop:10}} onClick={()=>{setView(allowed[0].id);setError("");setNotice("");}}>{group.label}</button>{active&&allowed.length>1&&<div style={{paddingInlineStart:14}}>{allowed.map(item=><button type="button" key={item.id} className={view===item.id?"active":""} onClick={()=>{setView(item.id);setError("");setNotice("");}}><span>{item.icon}</span>{item.label}</button>)}</div>}</div>})}</nav><div className="admin-sidebar-bottom"><div className="connection-pill"><i />متصل بخادم ATSH AI</div></div></aside>
      <section className="admin-main">
        <header className="admin-topbar"><div><h1>{title}</h1></div><div className="admin-top-actions"><a className="language-pill" href="/">الموقع</a><div className="admin-identity"><span className="admin-avatar">{user.email.slice(0, 1).toUpperCase()}</span><span><strong>{user.email}</strong><small>{roleLabels[user.role]}</small></span></div><button className="inline-add" onClick={logout}>خروج</button></div></header>
        
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}

        {view === "overview" && <><div className="admin-stats"><article className="admin-stat"><span>كل الطلبات</span><strong>{orders.length + journeyProjects.length}</strong><small>محفوظة على خادم المنصة</small></article><article className="admin-stat"><span>طلبات جديدة</span><strong>{newOrders + journeyProjects.filter(project => project.status === "draft" || project.status === "configured").length}</strong><small>تحتاج إلى متابعة</small></article><article className="admin-stat"><span>الباقات المنشورة</span><strong>{packages.filter((item) => item.is_published).length}</strong><small>بالجنيه المصري</small></article><article className="admin-stat"><span>أعضاء الفريق</span><strong>{members.filter((item) => item.is_active).length}</strong><small>حسابات نشطة</small></article></div><section className="admin-content-card"><div className="admin-content-title"><div><h2>أحدث الطلبات</h2><p>تصل بيانات العميل والبريد والهاتف إلى صندوق الإدارة.</p></div><button className="inline-add" onClick={() => setView("inbox")}>فتح الطلبات ←</button></div><OrderTable orders={orders.slice(0, 6)} members={members} onChange={updateOrder} onSendEmail={sendCustomerEmail} canSend={canEditOrders && emailStatus.configured} readOnly={!canEditOrders} /></section></>}

        {view === "content" && <section className="admin-content-card"><div className="admin-content-title"><div><h2>نصوص الصفحة الرئيسية</h2><p>كل العناوين والأوصاف والأزرار والشارات الظاهرة في الواجهة الحالية قابلة للتحرير.</p></div></div><div className="admin-form-grid">{siteCopyFields.filter(([key]) => !hiddenHomeFields.has(key)).map(([key, label, multiline]) => <label className="admin-field" key={key} style={multiline ? { gridColumn: "1 / -1" } : undefined}>{label}{multiline ? <textarea rows={3} value={page[key] ?? ""} onChange={(event) => setPage({ ...page, [key]: event.target.value })} /> : <input value={page[key] ?? ""} onChange={(event) => setPage({ ...page, [key]: event.target.value })} />}</label>)}</div><div className="admin-actions"><button className="button" disabled={busy} onClick={savePage}>حفظ ونشر النصوص ✓</button><button className="button button-outline" onClick={() => setView("pages")}>تحرير البطاقات والأقسام ←</button></div></section>}

        {view === "integrations" && canEditCatalog && <IntegrationStatus />}
        
        {view === "assistant-knowledge" && canEditContent && <AssistantKnowledge />}
        {view === "pages" && <ContentManager onSaved={loadData} />}
        {view === "works" && <ContentManager initialSlug="works" onSaved={loadData} />}
        {view === "content-studio" && canEditContent && <ContentStudio />}
        {view === "journey" && <JourneyManager mode="projects" canManageTasks={canEditCatalog} canArchive={user.role === "owner" || user.role === "admin"} canDelete={user.role === "owner"} />}
      {view === "commercial" && <CommercialManager />}

        {view === "options" && <section className="admin-content-card" aria-label="المعروض"><h2>المعروض</h2><p>إدارة الباقات والأنظمة المخصصة من مكان واحد، دون تكرار نماذج الإنشاء.</p><div role="tablist" aria-label="أقسام المعروض" style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" role="tab" aria-selected={offeringTab==="packages"} className={offeringTab==="packages"?"button button-small":"button button-outline button-small"} onClick={()=>setOfferingTab("packages")}>الباقات</button><button type="button" role="tab" aria-selected={offeringTab==="systems"} className={offeringTab==="systems"?"button button-small":"button button-outline button-small"} onClick={()=>setOfferingTab("systems")}>أنظمة مخصصة</button><button type="button" role="tab" aria-selected={offeringTab==="addons"} className={offeringTab==="addons"?"button button-small":"button button-outline button-small"} onClick={()=>setOfferingTab("addons")}>الإضافات</button><button type="button" role="tab" aria-selected={offeringTab==="preview"} className={offeringTab==="preview"?"button button-small":"button button-outline button-small"} onClick={previewOfferings}>معاينة</button></div></section>}

        {view === "options" && offeringTab === "packages" && <section id="unified-package-pricing" className="admin-content-card">
          <div className="admin-content-title"><div><h2>الباقات والأسعار</h2><p>عدّل البطاقة ومزاياها، أو أنشئ باقة جديدة. السعر بالجنيه المصري، ويمكن نسخ خيارات باقة موجودة كبداية.</p></div></div>
          <form className="admin-package-create" onSubmit={addPackage}>
            <label className="admin-field">اسم الباقة<input required maxLength={160} value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} /></label>
            <label className="admin-field">شارة البطاقة<input maxLength={160} placeholder="مثال: صفحة هبوط" value={packageDraft.tagline} onChange={(event) => setPackageDraft({ ...packageDraft, tagline: event.target.value })} /></label>
            <label className="admin-field">السعر بالجنيه<input required={!packageDraft.isCustomQuote} disabled={packageDraft.isCustomQuote} type="number" min="0" step="0.01" placeholder={packageDraft.isCustomQuote ? "يحدده الفريق بعد المراجعة" : ""} value={packageDraft.price} onChange={(event) => setPackageDraft({ ...packageDraft, price: event.target.value })} /></label>
            <label className="admin-field">نسخ الإضافات من<select value={packageDraft.copyFromPackageId} onChange={(event) => setPackageDraft({ ...packageDraft, copyFromPackageId: event.target.value })}><option value="">بدون إضافات</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="admin-field">وصف البطاقة<input value={packageDraft.description} onChange={(event) => setPackageDraft({ ...packageDraft, description: event.target.value })} /></label>
            <label className="admin-field" style={{ gridColumn: "1 / -1" }}>مزايا البطاقة (ميزة في كل سطر)<textarea rows={3} value={packageDraft.features} onChange={(event) => setPackageDraft({ ...packageDraft, features: event.target.value })} /></label>
            <label className="check-row"><input type="checkbox" checked={packageDraft.isFeatured} onChange={(event) => setPackageDraft({ ...packageDraft, isFeatured: event.target.checked })} /> تمييز البطاقة كموصى بها</label>
            <label className="check-row"><input type="checkbox" checked={packageDraft.isCustomQuote} onChange={(event) => setPackageDraft({ ...packageDraft, isCustomQuote: event.target.checked })} /> اطلب تسعيرًا مخصصًا بدل السعر الثابت</label>
            <label className="check-row"><input type="checkbox" checked={packageDraft.isPublished} onChange={(event) => setPackageDraft({ ...packageDraft, isPublished: event.target.checked })} /> نشر البطاقة فور الإنشاء</label>
            <button className="button" disabled={busy}>إنشاء الباقة</button>
          </form>
          <div className="admin-content-title"><div><h3>معاينة الباقات</h3><p>المعاينة تعرض أول أربع باقات حسب ترتيبها الحالي، بما فيها التعديلات غير المحفوظة. لا تنشر أي تغيير تلقائيًا.</p></div></div>
          <div className="admin-package-quarter-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:12,marginBottom:20}}>
            {[0,1,2,3].map((index) => {
              const item = [...packages].sort((a,b)=>a.sort_order-b.sort_order)[index];
              return <article key={item?.id ?? `empty-${index}`} className="admin-package-editor" style={{margin:0,minHeight:170}}>
                <strong>الباقة {index+1}</strong>
                {item ? <div className="admin-form-grid" style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginTop:8}}>
                  <label className="admin-field">اسم الباقة<input aria-label={`اسم الباقة ${index+1}`} value={item.name} onChange={event=>changePackage(item.id,"name",event.target.value)} /></label>
                  <label className="admin-field">السعر بالجنيه<input type="number" min="0" step="0.01" disabled={item.is_custom_quote} value={item.price} onChange={event=>changePackage(item.id,"price",Number(event.target.value))}/></label>
                  <label className="admin-field">الوصف<textarea rows={2} value={item.description} onChange={event=>changePackage(item.id,"description",event.target.value)}/></label>
                  <label className="admin-field">ترتيب الباقة<input type="number" min="0" step="1" value={item.sort_order} onChange={event=>changePackage(item.id,"sort_order",Number(event.target.value))}/></label>
                  <label className="admin-field">شارة الباقة<input value={item.tagline} onChange={event=>changePackage(item.id,"tagline",event.target.value)}/></label>
                  <label className="admin-field">المزايا (كل ميزة في سطر)<textarea rows={3} value={item.features.join("\n")} onChange={event=>changePackage(item.id,"features",event.target.value.split("\n").map(feature=>feature.trim()).filter(Boolean))}/></label>
                  <label className="check-row"><input type="checkbox" checked={item.is_custom_quote} onChange={event=>changePackage(item.id,"is_custom_quote",event.target.checked)}/> تسعير مخصص</label>
                  <label className="check-row"><input type="checkbox" checked={item.is_featured} onChange={event=>changePackage(item.id,"is_featured",event.target.checked)}/> باقة مميزة</label>
                  <label className="check-row"><input type="checkbox" checked={item.is_published} onChange={event=>changePackage(item.id,"is_published",event.target.checked)}/> منشورة للعملاء</label>
                  <small>{item.is_custom_quote ? "تسعير مخصص" : formatEgp(Number(item.price))} · {item.features.length} مزايا</small>
                  <button type="button" className="button button-small" disabled={busy || !item.name.trim()} onClick={()=>savePackage(item)}>حفظ الباقة</button>
                </div> : <p>لا توجد باقة هنا — أنشئ باقة جديدة لإضافتها.</p>}
              </article>;
            })}
          </div>
          {packages.map((item) => <article className="admin-package-editor" key={item.id}>
            <div className="admin-form-grid">
              <label className="admin-field">اسم البطاقة<input value={item.name} onChange={(event) => changePackage(item.id, "name", event.target.value)} /></label>
              <label className="admin-field">شارة البطاقة<input value={item.tagline} onChange={(event) => changePackage(item.id, "tagline", event.target.value)} /></label>
              <label className="admin-field">السعر بالجنيه<input disabled={item.is_custom_quote} type="number" min="0" step="0.01" value={item.price} onChange={(event) => changePackage(item.id, "price", Number(event.target.value))} /></label>
              <label className="admin-field" style={{ gridColumn: "1 / -1" }}>الوصف<input value={item.description} onChange={(event) => changePackage(item.id, "description", event.target.value)} /></label>
              <label className="admin-field" style={{ gridColumn: "1 / -1" }}>المزايا (ميزة في كل سطر)<textarea rows={3} value={item.features.join("\n")} onChange={(event) => changePackage(item.id, "features", event.target.value.split("\n").map((feature) => feature.trim()).filter(Boolean))} /></label>
            </div>
            <div className="admin-package-controls"><label className="check-row"><input type="checkbox" checked={item.is_published} onChange={(event) => changePackage(item.id, "is_published", event.target.checked)} /> منشورة للعملاء</label><label className="check-row"><input type="checkbox" checked={item.is_featured} onChange={(event) => changePackage(item.id, "is_featured", event.target.checked)} /> موصى بها</label><label className="check-row"><input type="checkbox" checked={item.is_custom_quote} onChange={(event) => changePackage(item.id, "is_custom_quote", event.target.checked)} /> تسعير مخصص</label><label className="admin-field">ترتيب البطاقة<input type="number" value={item.sort_order} onChange={(event) => changePackage(item.id, "sort_order", Number(event.target.value))} /></label><button className="button button-small" disabled={busy} onClick={() => savePackage(item)}>حفظ التعديلات</button></div>
          </article>)}
        </section>}

        {view === "options" && offeringTab === "addons" && <><section id="unified-package-options" className="admin-content-card">
          <div className="admin-content-title"><div><h2>إدارة الإضافات للباقات والأنظمة المخصصة</h2><p>أنشئ الإضافات وعدّل أسعارها وحالتها. الإضافات النشطة تظهر أيضًا في الأنظمة المخصصة، ويمكن إيقافها دون حذف الطلبات القديمة. رمز الربط ثابت بعد الإنشاء.</p></div></div>
          <form className="admin-team-form admin-option-create" onSubmit={addOption}>
            <label className="admin-field">الباقة<select required value={optionDraft.packageId} onChange={(event) => setOptionDraft({ ...optionDraft, packageId: event.target.value })}><option value="">اختر باقة</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="admin-field">رمز الربط<input required pattern="[a-z0-9_-]{2,80}" title="استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة فقط" value={optionDraft.code} onChange={(event) => setOptionDraft({ ...optionDraft, code: event.target.value })} /></label>
            <label className="admin-field">اسم الإضافة<input required value={optionDraft.name} onChange={(event) => setOptionDraft({ ...optionDraft, name: event.target.value })} /></label>
            <label className="admin-field">السعر<input required type="number" min="0" step="0.01" value={optionDraft.price} onChange={(event) => setOptionDraft({ ...optionDraft, price: event.target.value })} /></label>
            <label className="admin-field">طريقة الحساب<select value={optionDraft.pricingType} onChange={(event) => setOptionDraft({ ...optionDraft, pricingType: event.target.value as Option["pricing_type"] })}><option value="fixed">مرة واحدة</option><option value="per_page">لكل صفحة</option><option value="yearly">سنوي</option><option value="monthly">شهري</option></select></label>
            <label className="admin-field">تظهر في<select value={optionDraft.visibility} onChange={(event)=>setOptionDraft({...optionDraft,visibility:event.target.value as "both"|"packages"|"systems"})}><option value="both">الباقات والأنظمة المخصصة</option><option value="packages">الباقات فقط</option><option value="systems">الأنظمة المخصصة فقط</option></select></label>
            <label className="admin-field">وحدة السعر<input maxLength={40} placeholder="مثل: صفحة" value={optionDraft.unitLabel} onChange={(event) => setOptionDraft({ ...optionDraft, unitLabel: event.target.value })} /></label>
            <label className="admin-field" style={{ gridColumn: "1 / -1" }}>الوصف<input value={optionDraft.description} onChange={(event) => setOptionDraft({ ...optionDraft, description: event.target.value })} /></label>
            <label className="check-row"><input type="checkbox" checked={optionDraft.isRequired} onChange={(event) => setOptionDraft({ ...optionDraft, isRequired: event.target.checked })} /> إلزامية</label>
            <button className="button" disabled={busy}>إضافة الخيار</button>
          </form>
          {options.map((item) => <article className="admin-package-editor" key={item.id}>
            <div className="option-admin-heading"><strong>{packages.find((pkg) => pkg.id === item.package_id)?.name ?? "باقة غير معروفة"}</strong><code>{item.code}</code></div>
            <div className="admin-form-grid">
              <label className="admin-field">اسم الإضافة<input value={item.name} onChange={(event) => changeOption(item.id, "name", event.target.value)} /></label>
              <label className="admin-field">السعر<input type="number" min="0" step="0.01" value={item.price} onChange={(event) => changeOption(item.id, "price", Number(event.target.value))} /></label>
              <label className="admin-field">طريقة الحساب<select value={item.pricing_type} onChange={(event) => changeOption(item.id, "pricing_type", event.target.value as Option["pricing_type"])}><option value="fixed">مرة واحدة</option><option value="per_page">لكل صفحة</option><option value="yearly">سنوي</option><option value="monthly">شهري</option></select></label>
              <label className="admin-field">تظهر في<select value={item.visibility??"both"} onChange={(event)=>changeOption(item.id,"visibility",event.target.value as Option["visibility"])}><option value="both">الباقات والأنظمة المخصصة</option><option value="packages">الباقات فقط</option><option value="systems">الأنظمة المخصصة فقط</option></select></label>
              <label className="admin-field">وحدة السعر<input value={item.unit_label} onChange={(event) => changeOption(item.id, "unit_label", event.target.value)} /></label>
              <label className="admin-field" style={{ gridColumn: "1 / -1" }}>الوصف<input value={item.description} onChange={(event) => changeOption(item.id, "description", event.target.value)} /></label>
            </div>
            <div className="admin-package-controls"><label className="check-row"><input type="checkbox" checked={item.is_required} onChange={(event) => changeOption(item.id, "is_required", event.target.checked)} /> إلزامية</label><label className="check-row"><input type="checkbox" checked={item.is_active} onChange={(event) => changeOption(item.id, "is_active", event.target.checked)} /> متاحة للعملاء</label><button className="button button-small" disabled={busy} onClick={() => saveOption(item)}>حفظ التعديلات</button><button type="button" className="button button-outline button-small" disabled={busy || !item.is_active} onClick={() => void removeOption(item)}>حذف من العرض</button></div>
          </article>)}
        </section><section id="unified-vat" className="admin-content-card"><h2>ضريبة القيمة المضافة</h2><p>نسبة الضريبة المستخدمة في ملخص التسعير.</p><label className="admin-field">الضريبة %<input type="number" min="0" max="100" step="0.01" value={vatRate} onChange={(event)=>setVatRate(Number(event.target.value))}/></label><div className="admin-actions"><button type="button" className="button" disabled={busy} onClick={saveTheme}>حفظ نسبة الضريبة</button></div></section></>}
        {view === "options" && offeringTab === "systems" && <div id="unified-catalog-pricing">{canEditCatalog && <CatalogManager />}</div>}
        {view === "options" && offeringTab === "preview" && <section className="admin-content-card"><h2>معاينة الباقات والمنتجات التفاعلية</h2><p>عرض حي لشكل الباقات كما يراه العميل، يشمل التعديلات الحالية قبل الحفظ. لا يتم نشر التعديلات.</p><div className="admin-actions"><button type="button" className="button button-outline" onClick={()=>setOfferPreviewDevice("desktop")}>كمبيوتر</button><button type="button" className="button button-outline" onClick={()=>setOfferPreviewDevice("mobile")}>موبايل</button><button type="button" className="button" onClick={previewOfferings}>تحديث المعاينة</button><button type="button" className="button button-outline" onClick={()=>setOfferingTab("packages")}>رجوع للتعديل</button></div>{offerPreviewUrl&&<div style={{display:"flex",justifyContent:"center",overflowX:"auto",background:"#e8edf2",padding:12}}><iframe title="معاينة الباقات كما تظهر للجمهور" src={offerPreviewUrl} sandbox="allow-scripts allow-same-origin" style={{width:offerPreviewDevice==="mobile"?390:"100%",maxWidth:"100%",height:"75vh",minHeight:480,border:"1px solid #d8dde5",borderRadius:12,background:"#fff"}}/></div>}</section>}

        {view === "theme" && <section className="admin-content-card"><div className="admin-content-title"><div><h2>هوية الموقع وتنسيقه</h2><p>تحكم في الألوان والخط والشعار وصور الواجهة والخلفية. الصور المرفوعة تحفظ في قاعدة بيانات المنصة.</p></div></div><div className="theme-swatches">{([ ["navy","الكحلي"], ["blue","الأزرق"], ["gold","الذهبي"], ["page","الخلفية"] ] as Array<["navy" | "blue" | "gold" | "page",string]>).map(([key,label]) => <label className="theme-swatch" key={key}>{label}<input type="color" value={theme[key]} onChange={(event) => setTheme({ ...theme, [key]: event.target.value })} /></label>)}</div><div className="admin-form-grid"><ImageSetting label="الشعار" value={theme.logoUrl} onChange={(value) => setTheme({ ...theme, logoUrl: value })} onUpload={(event) => void uploadThemeImage(event, "logoUrl")} busy={busy} /><ImageSetting label="صورة الواجهة الرئيسية" value={theme.heroImageUrl} onChange={(value) => setTheme({ ...theme, heroImageUrl: value })} onUpload={(event) => void uploadThemeImage(event, "heroImageUrl")} busy={busy} /><ImageSetting label="خلفية الموقع" value={theme.backgroundImageUrl} onChange={(value) => setTheme({ ...theme, backgroundImageUrl: value })} onUpload={(event) => void uploadThemeImage(event, "backgroundImageUrl")} busy={busy} /></div><div className="admin-form-grid"><label className="admin-field">الخط<select value={theme.fontFamily} onChange={(event) => setTheme({ ...theme, fontFamily: event.target.value as Theme["fontFamily"] })}><option>IBM Plex Sans Arabic</option><option>Cairo</option><option>Tajawal</option></select></label><label className="admin-field">استدارة البطاقات ({theme.cardRadius}px)<input type="range" min="0" max="32" step="1" value={theme.cardRadius} onChange={(event) => setTheme({ ...theme, cardRadius: Number(event.target.value) })} /></label></div><div className="admin-actions"><button className="button" disabled={busy} onClick={saveTheme}>حفظ الهوية والتنسيق ✓</button></div></section>}

        {view === "inbox" && <JourneyManager mode="requests" canManageTasks={canEditCatalog} canArchive={user.role === "owner" || user.role === "admin"} canDelete={user.role === "owner"} />}

        {view === "inbox" && <section className="admin-content-card"><div className="admin-content-title"><div><h2>الطلبات الأخرى</h2></div><span className="status-chip">{orders.length} طلب</span></div><OrderTable orders={orders} members={members} onChange={updateOrder} onSendEmail={sendCustomerEmail} canSend={canEditOrders && emailStatus.configured} detailed readOnly={!canEditOrders} /></section>}

        {view === "team" && canManageTeam && <section className="admin-content-card"><div className="admin-content-title"><div><h2>فريق الإدارة</h2><p>أنشئ حسابات بصلاحيات محدودة؛ إرسال البريد يحتاج مزود بريد متصل.</p></div></div><form className="admin-team-form" onSubmit={addMember}><label className="admin-field">الاسم<input required value={memberName} onChange={(event) => setMemberName(event.target.value)} /></label><label className="admin-field">البريد الإلكتروني<input type="email" required value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} /></label><label className="admin-field">كلمة مرور مؤقتة (12 حرفًا على الأقل)<input type="password" minLength={12} required value={memberPassword} onChange={(event) => setMemberPassword(event.target.value)} /></label><label className="admin-field">الصلاحية<select value={memberRole} onChange={(event) => setMemberRole(event.target.value as Member["role"])}><option value="admin">مدير</option><option value="editor">محرر محتوى</option><option value="sales">متابعة العملاء</option><option value="viewer">مشاهدة فقط</option></select></label><div className="admin-content-card" style={{gridColumn:"1 / -1",padding:12}}><strong>الصلاحيات المرتبطة بالدرجة الإدارية</strong><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>{roleCapabilities[memberRole].map(capability=><label className="check-row" key={capability}><input type="checkbox" checked readOnly disabled /> {capability}</label>)}</div><small>هذه الصلاحيات موروثة من الدرجة الإدارية ولا يمكن تخصيصها بشكل منفصل حاليًا. الحماية الفعلية تحددها صلاحيات الخادم.</small></div><button className="button" disabled={busy}>إنشاء الحساب</button></form><div className="admin-team-list">{members.map((member) => <article className="admin-team-row" key={member.id}><span className="admin-avatar">{member.display_name.slice(0,1)}</span><strong>{member.display_name}</strong><span>{member.email}</span><label className="admin-field">الصلاحية<select aria-label={`صلاحية ${member.display_name}`} value={member.role} disabled={busy} onChange={(event) => { const role = event.target.value as Member["role"]; if (window.confirm(`تغيير صلاحية ${member.display_name} إلى ${roleLabels[role]}؟`)) void save(() => api(`team/${member.id}`, { method: "PATCH", body: JSON.stringify({role}) }), "تم تحديث الصلاحية."); }}><option value="admin">مدير</option><option value="editor">محرر محتوى</option><option value="sales">متابعة العملاء</option><option value="viewer">مشاهدة فقط</option></select></label><details><summary>تعديل الصلاحيات الفردية</summary><div style={{display:"flex",gap:8,flexWrap:"wrap",padding:8}}>{([{key:"assistant",label:"المساعد الذكي"},{key:"customers",label:"العملاء"},{key:"content",label:"إنشاء المحتوى"},{key:"products",label:"المنتجات"},{key:"settings",label:"الإعدادات"},{key:"team",label:"الفريق"},{key:"audit",label:"سجل التغييرات"}] as const).map(capability=><label className="check-row" key={capability.key}><input type="checkbox" disabled={busy} checked={member.permission_overrides?.[capability.key] ?? ({admin:["assistant","customers","content","products","settings","audit"],editor:["assistant","content"],sales:["customers"],viewer:[]}[member.role]?.some((permission: string)=>permission===capability.key) ?? false)} onChange={event=>{const permissions={...member.permission_overrides,[capability.key]:event.target.checked};void save(()=>api(`team/${member.id}`,{method:"PATCH",body:JSON.stringify({permissions})}),"تم حفظ صلاحيات العضو.");}}/> {capability.label}</label>)}</div><small>يتم حفظ كل تغيير على الخادم. يجب تسجيل الدخول مجددًا لتحديث الواجهة.</small></details><span>{member.is_active ? "نشط" : "موقوف"}</span><button type="button" className="inline-add" disabled={busy} onClick={() => { if (window.confirm(`${member.is_active ? "إيقاف" : "إعادة تفعيل"} حساب ${member.display_name}؟`)) void save(() => api(`team/${member.id}`, { method: "PATCH", body: JSON.stringify({isActive:!member.is_active}) }), "تم تحديث حالة الحساب."); }}>{member.is_active ? "إيقاف" : "تفعيل"}</button><button type="button" className="inline-add" disabled={busy || member.email.toLowerCase() === user.email.toLowerCase()} onClick={() => { if(window.confirm(`حذف حساب ${member.display_name} نهائيًا؟ لا يمكن التراجع عن الحذف.`)) void save(async () => { await api(`team/${member.id}/purge`, {method:"POST"}); const verification = await api("team"); if ((verification.members ?? []).some((remaining: Member) => remaining.id === member.id)) throw new Error("أعاد الخادم نجاح الحذف، لكن الحساب لا يزال موجودًا في قاعدة البيانات. لم يتم تأكيد الحذف."); }, "تم حذف عضو الفريق والتحقق من اختفائه من قاعدة البيانات."); }}>حذف نهائي</button></article>)}</div><p className="field-hint">أرسل بيانات الدخول للعضو عبر قناة آمنة منفصلة. لا تُرسل المنصة كلمات المرور بالبريد.</p></section>}

        {view === "audit" && <section className="admin-content-card"><div className="admin-content-title"><div><h2>سجل التغييرات</h2><p>أحدث العمليات الإدارية التي سجلها الخادم.</p></div></div><div className="admin-audit-list">{audit.map((item) => <article key={item.id}><strong>{item.action}</strong><span>{item.entity_type}</span><span>{item.actor}</span><time>{new Date(item.created_at).toLocaleString("ar-EG")}</time></article>)}</div></section>}

        <footer className="platform-footer"><a href="/">ATSH AI</a><span>حساب {roleLabels[user.role]}</span><button className="inline-add" onClick={logout}>إنهاء الجلسة</button></footer>
      </section>
    </div>
  </main>;
}

function ImageSetting({ label, value, onChange, onUpload, busy }: { label: string; value: string; onChange: (value: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; busy: boolean }) {
  return <label className="admin-field admin-image-setting">{label}<input value={value} maxLength={2048} placeholder="ارفع صورة أو الصق رابط HTTPS" onChange={(event) => onChange(event.target.value)} /><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={onUpload} /><small>PNG أو JPG أو WebP، حتى 5 ميجابايت. الرفع يحفظ الملف في قاعدة بيانات المنصة.</small>{value && <img src={value} alt={`معاينة ${label}`} />}</label>;
}

function OrderTable({ orders, members, onChange, onSendEmail, canSend = false, detailed = false, readOnly = false }: { orders: Order[]; members: Member[]; onChange: (order: Order, key: "status" | "assigned_to", value: string) => void; onSendEmail: (order: Order, subject: string, message: string) => Promise<void>; canSend?: boolean; detailed?: boolean; readOnly?: boolean }) {
  const [composingId, setComposingId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, Order>>({});
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const showOrderDetails = async (order: Order) => {
    if (expandedOrderId === order.id) { setExpandedOrderId(null); return; }
    setExpandedOrderId(order.id);
    setDetailError("");
    setDetailLoading(true);
    try {
      const response = await api(`orders/${order.id}`);
      setOrderDetails((current) => ({ ...current, [order.id]: response.order as Order }));
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطلب.");
    } finally {
      setDetailLoading(false);
    }
  };
  if (!orders.length) return <p className="empty-summary">لا توجد طلبات حتى الآن.</p>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>المرجع</th><th>العميل</th><th>البريد والهاتف</th><th>الباقة</th><th>الإجمالي</th><th>الحالة</th><th>المسؤول</th>{detailed && <th>التاريخ</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.reference}</strong>{detailed && <><br /><button type="button" className="inline-add" onClick={() => showOrderDetails(order)}>{expandedOrderId === order.id ? "إخفاء التفاصيل" : "عرض الطلب المعتمد"}</button>{expandedOrderId === order.id && <div style={{maxWidth:420,whiteSpace:"normal"}}>{detailLoading ? <p>جارٍ تحميل التفاصيل…</p> : detailError ? <p role="alert" className="error-message">{detailError}</p> : orderDetails[order.id] ? <><p><strong>ملاحظات الطلب:</strong> {orderDetails[order.id].notes || "لا توجد"}</p><p><strong>المشروع المرتبط:</strong> {orderDetails[order.id].linked_project_id ? <code dir="ltr">{orderDetails[order.id].linked_project_id}</code> : "لا يوجد مشروع مرتبط بهذا الطلب"}</p><details open><summary>المواصفات والاختيارات المحفوظة عند إرسال الطلب</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{orderDetails[order.id].snapshot ? JSON.stringify(orderDetails[order.id].snapshot, null, 2) : "لا توجد لقطة مواصفات محفوظة لهذا الطلب."}</pre></details></> : null}</div>}</>}</td><td>{order.customer_name}</td><td><a href={`mailto:${order.email ?? ""}`}>{order.email || "—"}</a><br />{order.phone}{canSend && order.email && <><br /><button className="inline-add" type="button" onClick={() => { setComposingId(composingId === order.id ? null : order.id); setSubject(`بخصوص طلبك ${order.reference}`); setMessage(""); setSendError(""); }}>إرسال رسالة</button>{composingId === order.id && <form className="admin-mail-compose" onSubmit={async (event) => { event.preventDefault(); setSending(true); setSendError(""); try { await onSendEmail(order, subject, message); setComposingId(null); setSubject(""); setMessage(""); } catch (reason) { setSendError(reason instanceof Error ? reason.message : "تعذر إرسال الرسالة."); } finally { setSending(false); } }}><label className="admin-field">عنوان الرسالة<input required maxLength={180} value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="admin-field">نص الرسالة<textarea required maxLength={10000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></label>{sendError && <span className="error-message" role="alert">{sendError}</span>}<button className="button button-small" disabled={sending}>{sending ? "جارٍ الإرسال…" : "إرسال من البريد الرسمي"}</button></form>}</>}</td><td>{order.package_name ?? "طلب مخصص"}</td><td>{formatEgp(Number(order.total))}</td><td><select disabled={readOnly} aria-label={`حالة ${order.reference}`} value={order.status} onChange={(event) => onChange(order, "status", event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td><td><select disabled={readOnly} aria-label={`المسؤول ${order.reference}`} value={order.assigned_to ?? ""} onChange={(event) => onChange(order, "assigned_to", event.target.value)}><option value="">غير معيّن</option>{members.filter((member) => member.is_active).map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></td>{detailed && <td>{new Date(order.created_at).toLocaleDateString("ar-EG")}</td>}</tr>)}</tbody></table></div>;
}
