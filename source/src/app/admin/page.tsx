"use client";
import OwnershipAdmin from "@/components/ownership-admin";
import AddonPrice from "@/components/addon-price";
import NotificationInbox from "../../components/notification-inbox";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {addonCategories,categoryFor,groupAddons,type AddonCategoryCode,type AddonCategoryOrder} from "@/lib/addon-categories";
import { formatEgp } from "@/lib/catalog";
import { siteCopyDefaults, siteCopyFields } from "@/lib/site-copy";
import ContentManager from "./content-manager";
import VisitorAnalyticsPanel from "./visitor-analytics";
import VideoManager from "./video-manager";
import { createPagePreviewUrl } from "@/lib/page-preview";
import CatalogManager from "./catalog-manager";
import AssistantKnowledge from "./assistant-knowledge";
import IntegrationStatus from "./integration-status";
import ContentStudio from "./content-studio";
import JourneyManager from "./journey-manager";
import CustomerServicesAdmin from "./customer-services-admin";
import CommercialManager from "./commercial-manager";

type Role = "owner" | "admin" | "editor" | "sales" | "viewer";
type View = "videos" | "messages" | "overview" | "integrations" | "assistant-knowledge" | "content" | "pages" | "works" | "content-studio" | "journey" | "commercial" | "options" | "theme" | "inbox" | "team" | "audit";
type Package = { ownershipPrices?:import("@/components/ownership-selector").OwnershipPrices|null; list_price?:number|string;initial_price?:number|string;discount_percent?:number|string; id: string; name: string; tagline: string; description: string; price: number | string; currency: string; features: string[]; is_featured: boolean; is_custom_quote: boolean; is_published: boolean; sort_order: number; visibility: "both" | "packages" | "systems" };
type Option = { list_price?:number|string;discount_percent?:number|string;initial_price?:number|string;initial_pricing_type?:Option["pricing_type"];initial_unit_label?:string;category_code?:AddonCategoryCode;category_sort_order?:number; id: string; package_id: string; code: string; name: string; description: string; price: number | string; pricing_type: "fixed" | "monthly" | "yearly" | "per_page"; unit_label: string; is_required: boolean; is_active: boolean; sort_order: number; visibility: "both" | "packages" | "systems" };
type Order = { id: string; reference: string; customer_name: string; phone: string; email: string | null; status: string; currency: string; total: number | string; created_at: string; assigned_to: string | null; assigned_to_name: string | null; package_name: string | null; notes?: string; linked_project_id?: string | null; snapshot?: { package?: { name?: string }; options?: Array<{ name: string; quantity?: number; lineTotal?: number }> } };
type JourneyProject = { id:string; customer_name:string; customer_email:string|null; status:string; created_at:string };
type Member = { id: string; email: string; display_name: string; role: Exclude<Role, "owner">; is_active: boolean; permission_overrides?: Record<string, boolean> | null; created_at: string };
type Theme = { navy: string; blue: string; gold: string; page: string; logoUrl: string; heroImageUrl: string; backgroundImageUrl: string; fontFamily: "IBM Plex Sans Arabic" | "Cairo" | "Tajawal"; cardRadius: number };
type Audit = { id: number; actor: string; action: string; entity_type: string; created_at: string };
type AdminUser = { email: string; role: Role; permissions?: Record<string, boolean> };
const canAccess = (user: AdminUser | null, key: string) => user?.role === "owner" || user?.permissions?.[key] === true;
const canReadTeam = (user: AdminUser | null) => canAccess(user, "team");
type EmailStatus = { configured: boolean; from: string; replyTo: string };
type PageContent = Record<string, string>;
type ApiPayload = Record<string, any>;
type PackageDraft = { name: string; tagline: string; description: string; price: string; features: string; copyFromPackageId: string; isFeatured: boolean; isCustomQuote: boolean; isPublished: boolean };
type OptionDraft = { categoryCode:AddonCategoryCode;sortOrder:number; packageId: string; code: string; name: string; description: string; price: string; pricingType: Option["pricing_type"]; unitLabel: string; isRequired: boolean; isActive: boolean; visibility: "both" | "packages" | "systems" };

const nav: Array<{ id: View; label: string; icon: string }> = [
  { id: "overview", label: "نظرة عامة", icon: "◫" }, { id: "integrations", label: "حالة الربط", icon: "🔌" }, { id:"assistant-knowledge",label:"تعريفات GPT والردود",icon:"✦" }, { id: "content", label: "تعديل المحتوى", icon: "▤" },
  { id: "pages", label: "صفحات المنصة", icon: "▧" }, { id: "works", label: "سجل الأعمال السابقة", icon: "▣" },
  { id: "options", label: "المنتجات", icon: "▦" },
  { id: "content-studio", label: "منشئ المحتوى", icon: "✦" },
  { id: "videos", label: "إدارة الفيديوهات", icon: "▶" },
  { id: "messages", label: "مركز المراسلات", icon: "✉" },
  { id: "journey", label: "المشاريع", icon: "◎" },
  { id: "commercial", label: "العروض والعقود", icon: "▤" },
  { id: "theme", label: "تصميم المنصة", icon: "◉" }, { id: "inbox", label: "طلبات العملاء", icon: "✉" },
  { id: "team", label: "إدارة الفريق", icon: "♙" }, { id: "audit", label: "سجل التغييرات", icon: "≡" }
];
const adminGroups: Array<{label:string;views:View[];showChildren?:boolean}>= [
 {label:"نظرة عامة",views:["overview"]},
 {label:"المراسلات",views:["messages"]},
 {label:"العملاء",views:["inbox","journey"]},
 {label:"محتوى المنصة",views:["pages","options","content-studio","videos"],showChildren:true},
 {label:"الفريق",views:["team"]},
 {label:"المساعد الذكي",views:["assistant-knowledge"]}
];
const viewPermissions: Partial<Record<View, string>> = {
    integrations:"settings", "assistant-knowledge":"assistant", team:"team", audit:"audit",
    options:"products", theme:"settings", content:"content", pages:"content",
    works:"content", videos:"content", "content-studio":"assistant", journey:"customers",
    commercial:"customers", inbox:"customers"
  };
const samePermissions = (a: AdminUser, b: AdminUser) => a.email === b.email && a.role === b.role && [...new Set([...Object.keys(a.permissions ?? {}), ...Object.keys(b.permissions ?? {})])].every(key => canAccess(a,key) === canAccess(b,key));
const defaultTheme: Theme = { navy: "#203958", blue: "#4c78ae", gold: "#b59a6b", page: "#faf9f5", logoUrl: "/images/atsh-logo.jpg", heroImageUrl: "/images/atsh-hero.jpg", backgroundImageUrl: "", fontFamily: "IBM Plex Sans Arabic", cardRadius: 16 };
const statuses = ["new", "reviewing", "quoted", "approved", "in_progress", "completed", "cancelled"] as const;
const statusLabels: Record<string, string> = { new: "جديد", reviewing: "قيد المراجعة", quoted: "تم إرسال عرض", approved: "موافق عليه", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
const roleLabels: Record<Role, string> = { owner: "مالك المنصة", admin: "مدير", editor: "محرر محتوى", sales: "متابعة العملاء", viewer: "مشاهدة فقط" };
const teamCapabilities = [{key:"assistant",label:"المساعد الذكي"},{key:"customers",label:"العملاء"},{key:"content",label:"إنشاء المحتوى"},{key:"products",label:"المنتجات"},{key:"settings",label:"الإعدادات"},{key:"team",label:"الفريق"},{key:"audit",label:"سجل التغييرات"}] as const;
const emptyTeamPermissions = () => Object.fromEntries(teamCapabilities.map(x=>[x.key,false]));

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
  const [chatTarget,setChatTarget]=useState("");
  const [chatSequence,setChatSequence]=useState(0);
  useEffect(()=>{const open=()=>{const p=new URLSearchParams(window.location.search);if(p.get("view")==="messages"){setChatTarget(p.toString());setChatSequence(n=>n+1);setView("messages");}};open();window.addEventListener("popstate",open);window.addEventListener("atsh-open-chat",open);return()=>{window.removeEventListener("popstate",open);window.removeEventListener("atsh-open-chat",open);};},[]);
  const [offeringTab, setOfferingTab] = useState<"packages" | "systems" | "addons" | "preview">("packages");
  const [offerPreviewUrl,setOfferPreviewUrl]=useState("");
  const [orderPreviewUrl,setOrderPreviewUrl]=useState("");
  const [orderPreviewDevice,setOrderPreviewDevice]=useState<"desktop"|"mobile">("desktop");
  const previewCustomerOrder=()=>setOrderPreviewUrl(createPagePreviewUrl({slug:"home",locale:"ar",content:{previewOfferings:{packages:packages.map(p=>({...p,is_published:true})),options:packages.flatMap(p=>options.filter(o=>o.is_active).map(o=>({...o,category_sort_order:categoryOrder.find(c=>c.code===categoryFor(o))?.sort_order,package_id:p.id,visibility:"both"})))}}})+"#packages");
  const [offerPreviewDevice,setOfferPreviewDevice]=useState<"desktop"|"mobile">("desktop");
  const previewOfferings=()=>{setOfferPreviewUrl(createPagePreviewUrl({slug:"home",locale:"ar",content:{previewOfferings:{packages:packages.map(p=>({...p,is_published:true})),options:packages.flatMap(p=>options.filter(o=>o.is_active).map(o=>({...o,category_sort_order:categoryOrder.find(c=>c.code===categoryFor(o))?.sort_order,package_id:p.id,visibility:"both"})))}}})+"#packages");setOfferingTab("preview");};
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
  const [bulkAddonDiscount,setBulkAddonDiscount]=useState("0");
  const [bulkPackageDiscount,setBulkPackageDiscount]=useState("0");
  const [categoryOrder,setCategoryOrder]=useState<AddonCategoryOrder[]>(addonCategories.map((c,i)=>({code:c.code,sort_order:(i+1)*10})));
  const [addonTab,setAddonTab]=useState<AddonCategoryCode>("foundation");
  const [orders, setOrders] = useState<Order[]>([]);
  const [journeyProjects, setJourneyProjects] = useState<JourneyProject[]>([]);
  const [journeyError, setJourneyError] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({ configured: false, from: "info@atsh-ai.com", replyTo: "sales@atsh-ai.com" });
  const [members, setMembers] = useState<Member[]>([]);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [page, setPage] = useState<PageContent>(siteCopyDefaults);
  const [hiddenHomeFields, setHiddenHomeFields] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [vatRate, setVatRate] = useState(14);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberPermissions,setMemberPermissions] = useState<Record<string,boolean>>(emptyTeamPermissions);
  const [packageDraft, setPackageDraft] = useState<PackageDraft>({ name: "", tagline: "", description: "", price: "", features: "", copyFromPackageId: "", isFeatured: false, isCustomQuote: false, isPublished: false });
  const [optionDraft, setOptionDraft] = useState<OptionDraft>({ categoryCode:"foundation",sortOrder:10,packageId: "", code: "", name: "", description: "", price: "", pricingType: "fixed", unitLabel: "", isRequired: false, isActive: true, visibility: "both" as const });

  const dataGeneration = useRef(0);
  const loadData = useCallback(async (session: AdminUser) => {
    const generation = ++dataGeneration.current;
    // A valid session is not permission to read every administrative endpoint.
    // Match the API's permission (and team role) checks, including on refresh.
    const endpoints = ["packages", "orders", "settings", "pages", "team", "audit", "email-status", "journey/projects"] as const;
    const allowed = [canAccess(session,"products"), canAccess(session,"customers"), canAccess(session,"settings"), canAccess(session,"content"), canReadTeam(session), canAccess(session,"audit"), canAccess(session,"settings"), canAccess(session,"customers")];
    // Remove revoked section data immediately; failed requests must not restore it.
    if (!allowed[0]) { setPackages([]); setOptions([]); }
    if (!allowed[1]) setOrders([]);
    if (!allowed[2]) { setTheme(defaultTheme); setVatRate(14); setEmailStatus({configured:false,from:"info@atsh-ai.com",replyTo:"sales@atsh-ai.com"}); }
    if (!allowed[3]) { setPage({...siteCopyDefaults}); setHiddenHomeFields(new Set()); }
    if (!allowed[4]) { setMembers([]); setTeamLoaded(false); }
    if (!allowed[5]) setAudit([]);
    if (!allowed[7]) setJourneyProjects([]);
    const results = await Promise.allSettled(endpoints.map((endpoint,index) => allowed[index] ? api(endpoint) : Promise.resolve(null)));
    if (generation !== dataGeneration.current) return;
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
      setOptions(catalog.sharedOptions ?? []);
      setOptionDraft(d=>({...d,sortOrder:Math.max(0,...(catalog.sharedOptions??[]).filter((o:Option)=>categoryFor(o)===d.categoryCode).map((o:Option)=>o.sort_order))+10}));
      if(Array.isArray(catalog.addonCategories)&&catalog.addonCategories.length===addonCategories.length)setCategoryOrder(catalog.addonCategories);
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
    if (team) { setMembers(team.members ?? []); setTeamLoaded(true); }
    else if (!allowed[4]) { setMembers([]); setTeamLoaded(false); }
    if (changes) setAudit(changes.logs ?? []);
    if (email) setEmailStatus({
      configured: Boolean(email.configured),
      from: typeof email.from === "string" ? email.from : "info@atsh-ai.com",
      replyTo: typeof email.replyTo === "string" ? email.replyTo : "sales@atsh-ai.com",
    });
    if (journeys) {
      setJourneyProjects(journeys.projects ?? []);
      setJourneyError("");
    } else if (allowed[7]) {
      setJourneyError("تعذر تحميل مشروعات العملاء. حاول تحديث البيانات لاحقًا.");
    } else {
      setJourneyError("");
    }
    if (failed.length) {
      setError(`تعذر تحديث بعض أقسام الإدارة: ${failed.join("، ")}. تم عرض البيانات المتاحة دون حذف البيانات المحفوظة.`);
    } else {
      setError("");
    }
  }, []);

  useEffect(() => {
    let active = true;
    api("me").then((data) => { if (!active) return; const session: AdminUser = { email: data.email, role: data.role, permissions: data.permissions }; setUser(session); return loadData(session); })
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

  // Permissions are stored on the server, not in the browser session. Revalidate
  // while the dashboard is open, and immediately when returning to it.
  useEffect(() => {
    if (!authChecked || !user || user.role === "owner") return;
    let active = true, pending = false;
    const sync = async () => {
      if (!active || pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const data = await api("me");
        if (!active) return;
        const next: AdminUser = {email:data.email,role:data.role,permissions:data.permissions};
        if (!samePermissions(user,next)) {
          setUser(next);
          setView(current => viewPermissions[current] && !canAccess(next,viewPermissions[current]!) ? "overview" : current);
          await loadData(next);
        }
      } catch {
        // A temporary connection failure is not a permission revocation.
        // The API independently enforces permissions on every operation.
      } finally { pending = false; }
    };
    const timer = window.setInterval(sync, 10000);
    window.addEventListener("focus",sync);
    document.addEventListener("visibilitychange",sync);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus",sync); document.removeEventListener("visibilitychange",sync); };
  }, [authChecked,user,loadData]);

  const permitted = (key: string) => canAccess(user, key);
  const refreshData = () => user ? loadData(user) : Promise.resolve();
  const canEditCatalog = permitted("products");
  const canEditContent = permitted("content");
  const canEditOrders = permitted("customers");
  const canManageTeam = user?.role === "owner";
  const visibleNav = nav.filter(item => item.id === "team" ? canReadTeam(user) : !viewPermissions[item.id] || permitted(viewPermissions[item.id]!));
  const newOrders = useMemo(() => orders.filter((order) => order.status === "new").length, [orders]);
  const title = nav.find((item) => item.id === view)?.label ?? "إدارة المنصة";

  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api("login", { method: "POST", body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      const data = await api("me"); const session: AdminUser = { email: data.email, role: data.role, permissions: data.permissions }; setUser(session); setLoginPassword(""); await loadData(session);
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
      try { await refreshData(); }
      catch { setNotice(`${success} تعذر تحديث بعض بيانات لوحة الإدارة؛ أعد فتحها لاحقًا.`); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ التغييرات."); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    // Clear every account-scoped cache so a later login cannot display another user's data.
    await api("logout", { method: "POST" }).catch(() => undefined);
    ++dataGeneration.current;
    setUser(null);
    setView("overview");
    setPackages([]);
    setOptions([]);
    setOrders([]);
    setJourneyProjects([]);
    setMembers([]);
    setTeamLoaded(false);
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
    setMemberPassword(""); setMemberPermissions(emptyTeamPermissions());
    setRecoveryCode("");
    setNewOwnerPassword("");
  };

  const changePackage = <K extends keyof Package,>(id: string, key: K, value: Package[K]) => setPackages((current) => current.map((item) => item.id !== id ? item : (()=>{const next={...item,[key]:value}; if(key==="list_price"||key==="discount_percent"||key==="is_custom_quote"){next.list_price=next.list_price??item.price;if(next.is_custom_quote)next.discount_percent=0;next.price=Math.round(Number(next.list_price)*(100-Number(next.discount_percent??0)))/100;}return next;})()));
  const changeOption = <K extends keyof Option,>(id: string, key: K, value: Option[K]) => setOptions(current=>current.map(item=>{
    if(item.id!==id)return item;
    const next={...item,[key]:value};
    if(key==="list_price"||key==="discount_percent"){
      next.list_price=next.list_price??item.price;
      next.price=Math.round(Number(next.list_price)*(100-Number(next.discount_percent??0)))/100;
    }
    return next;
  }));
  const savePackage = (item: Package) => save(() => api(`packages/${item.id}`, { method: "PATCH", body: JSON.stringify({ name: item.name, tagline: item.tagline, description: item.description, price: Number(item.list_price??item.price), discountPercent:item.is_custom_quote?0:Number(item.discount_percent??0), currency: "EGP", features: item.features, isFeatured: item.is_featured, isCustomQuote: item.is_custom_quote, isPublished: item.is_published, sortOrder: item.sort_order }) }), "تم حفظ البطاقة وتحديثها للعملاء.");
  const applyPackageDiscount=(cancel=false)=>{
    const value=cancel?0:Number(bulkPackageDiscount);
    if((!cancel&&!bulkPackageDiscount.trim())||!Number.isFinite(value)||value<0||value>100){setError("أدخل نسبة خصم من 0 إلى 100.");return;}
    if(!window.confirm(cancel?"إلغاء خصومات جميع الباقات؟":`تطبيق خصم ${value}% على كل الباقات ذات السعر الثابت؟`))return;
    void save(()=>api("packages/discount",{method:"POST",body:JSON.stringify({discountPercent:value})}),cancel?"تم إلغاء خصومات الباقات.":"تم تطبيق خصم الباقات.");
  };
  const resetPackagePrices=(item?:Package)=>{
    if(!window.confirm(item?`إعادة سعر "${item.name}" للسعر الأساسي وإلغاء الخصم؟`:"إعادة ضبط جميع أسعار الباقات وإلغاء الخصومات؟ لن تتغير الطلبات السابقة."))return;
    void save(()=>api("packages/reset-prices",{method:"POST",body:JSON.stringify(item?{id:item.id}:{})}),"تمت إعادة ضبط أسعار الباقات.");
  };
  const packagePriceFields=(item:Package)=>item.ownershipPrices&&!item.is_custom_quote?<OwnershipAdmin scope="package" productKey={item.id} base={Number(item.list_price??item.price)} initial={item.ownershipPrices}/>:<><label className="admin-field">السعر قبل الخصم<input type="number" min="0" step="0.01" disabled={item.is_custom_quote} value={item.list_price??item.price} onChange={e=>changePackage(item.id,"list_price",Number(e.target.value))}/></label><label className="admin-field">نسبة الخصم (%)<input type="number" min="0" max="100" step="0.01" disabled={item.is_custom_quote} value={item.discount_percent??0} onChange={e=>changePackage(item.id,"discount_percent",Math.min(100,Math.max(0,Number(e.target.value))))}/></label><div className="admin-field">السعر بعد الخصم{item.is_custom_quote?<strong>حسب الطلب</strong>:<AddonPrice item={item}/>}</div></>;
  const removePackage = async (item: Package) => {
    if (!window.confirm(`حذف الباقة "${item.name}" من المنتجات والموقع؟ ستظل الطلبات السابقة محفوظة.`)) return;
    setBusy(true);setError("");setNotice("");
    try { await api(`packages/${item.id}`, {method:"DELETE"}); const verified=await api("packages"); if((verified.packages??[]).some((p:Package)=>p.id===item.id))throw new Error("لم تختف الباقة من قائمة المنتجات"); setPackages(verified.packages??[]);setOptions(verified.sharedOptions??[]);setPackageDraft(p=>p.copyFromPackageId===item.id?{...p,copyFromPackageId:""}:p);setNotice("تم حذف الباقة من المنتجات والموقع."); }catch(e){setError(e instanceof Error?e.message:"تعذر حذف الباقة");}finally{setBusy(false);}
  };
  const saveOption = (item: Option) => save(() => api(`options/${item.id}`, { method: "PATCH", body: JSON.stringify({ name: item.name, description: item.description, price: Number(item.list_price??item.price), discountPercent:Number(item.discount_percent??0), pricingType: item.pricing_type, unitLabel: item.unit_label, isRequired: item.is_required, isActive: item.is_active, sortOrder: item.sort_order, categoryCode:categoryFor(item), visibility: item.visibility ?? "both" }) }), "تم تحديث الإضافة في جميع الباقات والأنظمة المخصصة.");
  const applyBulkAddonDiscount=()=>{
    const value=Number(bulkAddonDiscount);
    if(!bulkAddonDiscount.trim()||!Number.isFinite(value)||value<0||value>100){setError("أدخل نسبة خصم من 0 إلى 100.");return;}
    if(!window.confirm(`تطبيق خصم ${value}% على كل الإضافات دون تغيير حالة التفعيل؟`))return;
    void save(()=>api("options/discount",{method:"POST",body:JSON.stringify({discountPercent:value})}),"تم تطبيق الخصم على جميع الإضافات.");
  };
  const resetAddonPrices=(item?:Option)=>{
    if(!window.confirm(item?`إعادة ضبط سعر "${item.name}" ووحدة حسابه للسعر الأساسي المعتمد؟`:"إعادة ضبط جميع أسعار الإضافات ووحدات الحساب للأسعار الأساسية المعتمدة؟ لن تتغير حالات التفعيل أو الطلبات السابقة."))return;
    void save(()=>api("options/reset-prices",{method:"POST",body:JSON.stringify(item?{id:item.id}:{})}),item?"تمت إعادة ضبط سعر الإضافة.":"تمت إعادة ضبط جميع أسعار الإضافات.");
  };
  const orderedAddonGroups=groupAddons(options,categoryOrder);
  const moveCategory=(code:AddonCategoryCode,direction:number)=>setCategoryOrder(old=>{const list=[...old].sort((a,b)=>a.sort_order-b.sort_order);const i=list.findIndex(c=>c.code===code),j=i+direction;if(i<0||j<0||j>=list.length)return old;[list[i],list[j]]=[list[j],list[i]];return list.map((c,k)=>({...c,sort_order:(k+1)*10}));});
  const saveCategoryOrder=()=>save(()=>api("addon-categories",{method:"PATCH",body:JSON.stringify({codes:[...categoryOrder].sort((a,b)=>a.sort_order-b.sort_order).map(c=>c.code)})}),"تم حفظ ترتيب الأقسام في جميع واجهات التسعير.");
  const selectAddonTab=(code:AddonCategoryCode)=>{setAddonTab(code);setOptionDraft(d=>({...d,categoryCode:code,sortOrder:Math.max(0,...options.filter(o=>categoryFor(o)===code).map(o=>o.sort_order))+10}));};
  const removeOption = async (item: Option) => {
    if (!window.confirm(`إيقاف الإضافة "${item.name}"؟ ستختفي من الخيارات الجديدة مع الاحتفاظ بسجل الطلبات السابقة.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`options/${item.id}`, { method: "DELETE" });
      // Verify persisted catalog state before reporting that the option is disabled.
      const verified = await api("packages");
      const remaining = (verified.sharedOptions ?? []).find((option: Option) => option.id === item.id);
      if (remaining?.is_active) throw new Error("استقبلنا طلب إيقاف الإضافة، لكن الخادم ما زال يعرضها نشطة. راجع حالة الحفظ قبل إعادة المحاولة.");
      setOptions(verified.sharedOptions ?? []);
      setNotice("تم التحقق من إيقاف الإضافة للطلبات الجديدة مع الاحتفاظ بسجل الطلبات السابقة.");
      // Other dashboard sections are secondary to the verified catalog mutation.
      try { await refreshData(); } catch { setNotice("تم إيقاف الإضافة والتحقق من ذلك، لكن تعذر تحديث بعض أقسام اللوحة."); }
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

      await api("packages", { method: "POST", body: JSON.stringify({ name: packageDraft.name, tagline: packageDraft.tagline, description: packageDraft.description, price: packageDraft.isCustomQuote ? 0 : Number(packageDraft.price), currency: "EGP", features: packageDraft.features.split("\n").map((feature) => feature.trim()).filter(Boolean), isFeatured: packageDraft.isFeatured, isCustomQuote: packageDraft.isCustomQuote, isPublished: packageDraft.isPublished, sortOrder: packages.length * 10 + 10, options: [] }) });
      setPackageDraft({ name: "", tagline: "", description: "", price: "", features: "", copyFromPackageId: "", isFeatured: false, isCustomQuote: false, isPublished: false }); await refreshData(); setNotice("تم إنشاء الباقة وربط جميع الإضافات المشتركة تلقائيًا.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إنشاء الباقة."); }
    finally { setBusy(false); }
  };

  const addOption = async (event: FormEvent) => {
    event.preventDefault();
    if (["logo_design", "visual_identity", "domain", "domain_com", "domain_eg"].includes(optionDraft.code.trim())) { setError("هذا الرمز قديم ومكرر. استخدم خيارات الشعار والهوية الموجودة في خطوة الشعار والهوية."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const {packageId: _ignoredPackage, ...sharedDraft}=optionDraft;
      await api("options", { method: "POST", body: JSON.stringify({ ...sharedDraft, visibility:"both", price: Number(optionDraft.price), sortOrder: optionDraft.sortOrder }) });
      setOptionDraft((current) => ({ ...current, code: "", name: "", description: "", price: "", unitLabel: "",sortOrder:current.sortOrder+10 })); await refreshData(); setNotice("تمت إضافة الخيار لجميع الباقات والأنظمة المخصصة.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذرت إضافة الخيار."); }
    finally { setBusy(false); }
  };

  const addMember = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("team", { method: "POST", body: JSON.stringify({ email: memberEmail, displayName: memberName, role: "viewer", permissions: memberPermissions, password: memberPassword }) });
      setMemberEmail(""); setMemberName(""); setMemberPassword(""); await refreshData(); setNotice("تم إنشاء حساب العضو. شارك كلمة المرور معه عبر قناة آمنة.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر إضافة عضو الفريق."); }
    finally { setBusy(false); }
  };

  if (!authChecked) return <main className="admin-gate"><section className="admin-gate-card"><img src="/images/atsh-logo.jpg" alt="" /><h1>مركز إدارة ATSH AI</h1><p>جارٍ التحقق من الجلسة الإدارية…</p></section></main>;
  if (!user) return <main className="admin-gate" dir="rtl">{recoveryMode ? <form className="admin-gate-card" onSubmit={completeOwnerPasswordReset}><img src="/images/atsh-logo.jpg" alt="" /><h1>استعادة كلمة المرور</h1><p>أدخل رمز الاستعادة المرسل إلى بريدك الإلكتروني المسجل. تنتهي صلاحيته خلال 15 دقيقة ويُستخدم مرة واحدة.</p>{recoveryMessage && <p className="success-message" role="status">{recoveryMessage}</p>}<label className="admin-field">رمز الاستعادة<input required autoComplete="one-time-code" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} /></label><label className="admin-field">كلمة المرور الجديدة (12 حرفًا على الأقل)<input type="password" autoComplete="new-password" minLength={12} maxLength={200} required value={newOwnerPassword} onChange={(event) => setNewOwnerPassword(event.target.value)} /></label>{error && <p className="error-message" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "جارٍ التغيير…" : "تغيير كلمة المرور"}</button><button type="button" className="inline-add" onClick={() => { setRecoveryMode(false); setError(""); setRecoveryMessage(""); }}>العودة إلى تسجيل الدخول</button></form> : <form className="admin-gate-card" onSubmit={login}><img src="/images/atsh-logo.jpg" alt="" /><h1>مركز إدارة ATSH AI</h1><p>سجّل الدخول بحساب الإدارة المتصل بخادم ATSH AI.</p><label className="admin-field">البريد الإلكتروني<input type="email" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label><label className="admin-field">كلمة المرور<input type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>{recoveryMessage && <p className="success-message" role="status">{recoveryMessage}</p>}{error && <p className="error-message" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "جارٍ التحقق…" : "تسجيل الدخول"}</button><button type="button" className="inline-add" disabled={busy} onClick={requestOwnerPasswordReset}>نسيت كلمة المرور؟</button><a href="/" className="inline-add">العودة إلى الموقع</a></form>}</main>;

  return <main className="admin-page" dir="rtl" style={{ "--navy": theme.navy, "--navy-2": theme.blue, "--blue": theme.blue, "--gold": theme.gold, "--page": theme.page, "--site-font": `\"${theme.fontFamily}\", system-ui, sans-serif`, "--card-radius": `${theme.cardRadius}px` } as React.CSSProperties}>
    <div className="admin-layout">
      <aside className="admin-sidebar"><a className="admin-brand" href="/"><img src={theme.logoUrl || "/images/atsh-logo.jpg"} alt="" /><span><strong>ATSH <b>AI</b></strong><small>مركز الإدارة</small></span></a><div className="admin-nav-label">إدارة المنصة</div><nav className="admin-nav" aria-label="أقسام لوحة الإدارة">{adminGroups.map(group=>{const allowed=visibleNav.filter(item=>group.views.includes(item.id));if(!allowed.length)return null;const active=allowed.some(item=>item.id===view);return <div key={group.label}><button type="button" className={active?"active":""} style={{fontWeight:800,marginTop:10}} onClick={()=>{setView(allowed[0].id);setError("");setNotice("");}}>{group.label}</button>{active&&(allowed.length>1||group.showChildren)&&<div style={{paddingInlineStart:14}}>{allowed.map(item=><button type="button" key={item.id} className={view===item.id?"active":""} onClick={()=>{setView(item.id);setError("");setNotice("");}}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</div>}</div>})}</nav><div className="admin-sidebar-bottom"><div className="connection-pill"><i />متصل بخادم ATSH AI</div></div></aside>
      <section className="admin-main">
        <header className="admin-topbar" style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12}}><div style={{flex:"1 1 120px",minWidth:0}}><h1>{title}</h1></div><div className="admin-top-actions" style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"flex-start",gap:8,minWidth:0,maxWidth:"100%"}}><NotificationInbox /><a className="language-pill" href="/">الموقع</a><div className="admin-identity"><span className="admin-avatar">{user.email.slice(0, 1).toUpperCase()}</span><span><strong>{user.email}</strong><small>{roleLabels[user.role]}</small></span></div><button className="inline-add" onClick={logout}>خروج</button></div></header>
        
        {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}

        {view === "messages" && <InternalMessaging key={chatSequence} target={chatTarget} canCustomers={canEditOrders} />}
        {view === "overview" && user && user.role !== "owner" && <AssignedTaskChat />}
        {view === "overview" && <><div className="admin-stats"><article className="admin-stat"><span>كل الطلبات</span><strong>{orders.length + journeyProjects.length}</strong><small>محفوظة على خادم المنصة</small></article><article className="admin-stat"><span>طلبات جديدة</span><strong>{newOrders + journeyProjects.filter(project => project.status === "draft" || project.status === "configured").length}</strong><small>تحتاج إلى متابعة</small></article><article className="admin-stat"><span>الباقات المنشورة</span><strong>{packages.filter((item) => item.is_published).length}</strong><small>بالجنيه المصري</small></article><article className="admin-stat"><span>أعضاء الفريق</span><strong>{canReadTeam(user) && teamLoaded ? members.filter((item) => item.is_active).length : "—"}</strong><small>{!canReadTeam(user) ? "غير متاح لصلاحياتك" : teamLoaded ? "حسابات نشطة" : "تعذر تحميل البيانات"}</small></article>{(user?.role==="owner"||user?.role==="admin") && <VisitorAnalyticsPanel />}</div><section className="admin-content-card"><div className="admin-content-title"><div><h2>أحدث الطلبات</h2><p>تصل بيانات العميل والبريد والهاتف إلى صندوق الإدارة.</p></div><button className="inline-add" onClick={() => setView("inbox")}>فتح الطلبات ←</button></div>{journeyProjects.length>0&&<div style={{display:"grid",gap:8,marginBottom:14}}>{journeyProjects.slice(0,6).map(project=><article key={project.id} style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",padding:12,border:"1px solid #dce4ef",borderRadius:10}}><strong>{project.customer_name}</strong><span>{project.status}</span><button type="button" className="inline-add" onClick={()=>setView("inbox")}>عرض الطلب</button></article>)}</div>}<OrderTable orders={orders.slice(0, 6)} members={members} onChange={updateOrder} onSendEmail={sendCustomerEmail} canSend={canEditOrders && emailStatus.configured} readOnly={!canEditOrders} /></section></>}

        {view === "content" && <section className="admin-content-card"><div className="admin-content-title"><div><h2>نصوص الصفحة الرئيسية</h2><p>كل العناوين والأوصاف والأزرار والشارات الظاهرة في الواجهة الحالية قابلة للتحرير.</p></div></div><div className="admin-form-grid">{siteCopyFields.filter(([key]) => !hiddenHomeFields.has(key)).map(([key, label, multiline]) => <label className="admin-field" key={key} style={multiline ? { gridColumn: "1 / -1" } : undefined}>{label}{multiline ? <textarea rows={3} value={page[key] ?? ""} onChange={(event) => setPage({ ...page, [key]: event.target.value })} /> : <input value={page[key] ?? ""} onChange={(event) => setPage({ ...page, [key]: event.target.value })} />}</label>)}</div><div className="admin-actions"><button className="button" disabled={busy} onClick={savePage}>حفظ ونشر النصوص ✓</button><button className="button button-outline" onClick={() => setView("pages")}>تحرير البطاقات والأقسام ←</button></div></section>}

        {view === "integrations" && canEditCatalog && <IntegrationStatus />}
        
        {view === "assistant-knowledge" && canEditContent && <AssistantKnowledge />}
        {view === "videos" && canEditContent && <VideoManager />}
        {view === "pages" && <ContentManager onSaved={refreshData} logoEditor={<><ImageSetting label="الشعار" value={theme.logoUrl} onChange={value=>setTheme(current=>({...current,logoUrl:value}))} onUpload={event=>void uploadThemeImage(event,"logoUrl")} busy={busy}/><button type="button" className="button button-small" disabled={busy} onClick={saveTheme}>حفظ الشعار</button></>} heroImageEditor={<><ImageSetting label="صورة الواجهة" value={theme.heroImageUrl} onChange={value=>setTheme(current=>({...current,heroImageUrl:value}))} onUpload={event=>void uploadThemeImage(event,"heroImageUrl")} busy={busy}/><button type="button" className="button button-small" disabled={busy} onClick={saveTheme}>حفظ صورة الواجهة</button></>} />}
        {view === "works" && <ContentManager initialSlug="works" onSaved={refreshData} />}
        {view === "content-studio" && canEditContent && <ContentStudio />}
        {view === "journey" && <><JourneyManager mode="projects" showMyTasks={user.role!=="owner"} canManageTasks={canEditOrders} canArchive={user.role === "owner" || user.role === "admin"} canDelete={user.role === "owner"} />{(user.role === "owner" || user.role === "admin") && <CustomerServicesAdmin canEdit={true} />}</>}
      {view === "commercial" && <CommercialManager />}

        {view === "options" && <section className="admin-content-card" aria-label="المعروض"><h2>المعروض</h2><p>إدارة الباقات والأنظمة المخصصة من مكان واحد، دون تكرار نماذج الإنشاء.</p><div role="tablist" aria-label="أقسام المعروض" style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" role="tab" aria-selected={offeringTab==="packages"} className={offeringTab==="packages"?"button button-small":"button button-outline button-small"} onClick={()=>setOfferingTab("packages")}>الباقات</button><button type="button" role="tab" aria-selected={offeringTab==="systems"} className={offeringTab==="systems"?"button button-small":"button button-outline button-small"} onClick={()=>setOfferingTab("systems")}>أنظمة مخصصة</button><button type="button" role="tab" aria-selected={offeringTab==="addons"} className={offeringTab==="addons"?"button button-small":"button button-outline button-small"} onClick={()=>setOfferingTab("addons")}>الإضافات</button><button type="button" role="tab" aria-selected={offeringTab==="preview"} className={offeringTab==="preview"?"button button-small":"button button-outline button-small"} onClick={previewOfferings}>معاينة</button></div></section>}

        {view === "options" && offeringTab === "packages" && <section id="unified-package-pricing" className="admin-content-card">
          <div className="admin-content-title"><div><h2>الباقات والأسعار</h2><p>عدّل البطاقة ومزاياها، أو أنشئ باقة جديدة. السعر بالجنيه المصري، ويمكن نسخ خيارات باقة موجودة كبداية.</p></div></div>
          <div className="admin-actions"><label className="admin-field">خصم جميع الباقات (%)<input type="number" min="0" max="100" step="0.01" value={bulkPackageDiscount} onChange={e=>setBulkPackageDiscount(e.target.value)}/></label><button type="button" className="button button-small" disabled={busy||!packages.some(p=>!p.is_custom_quote)} onClick={()=>applyPackageDiscount()}>تطبيق الخصم على الباقات</button><button type="button" className="button button-outline button-small" disabled={busy} onClick={()=>applyPackageDiscount(true)}>إلغاء خصومات الباقات</button><button type="button" className="button button-outline button-small" disabled={busy||!packages.some(p=>!p.is_custom_quote)} onClick={()=>resetPackagePrices()}>إعادة ضبط جميع أسعار الباقات</button></div>
          <p className="field-hint">إعادة الضبط تستعيد السعر الأساسي وتلغي الخصم. الباقات ذات التسعير المخصص لا تتأثر.</p>
          <form className="admin-package-create" onSubmit={addPackage}>
            <label className="admin-field">اسم الباقة<input required maxLength={160} value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} /></label>
            <label className="admin-field">شارة البطاقة<input maxLength={160} placeholder="مثال: صفحة هبوط" value={packageDraft.tagline} onChange={(event) => setPackageDraft({ ...packageDraft, tagline: event.target.value })} /></label>
            <label className="admin-field">السعر بالجنيه<input required={!packageDraft.isCustomQuote} disabled={packageDraft.isCustomQuote} type="number" min="0" step="0.01" placeholder={packageDraft.isCustomQuote ? "يحدده الفريق بعد المراجعة" : ""} value={packageDraft.price} onChange={(event) => setPackageDraft({ ...packageDraft, price: event.target.value })} /></label>
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
                  {packagePriceFields(item)}
                  <label className="admin-field">الوصف<textarea rows={2} value={item.description} onChange={event=>changePackage(item.id,"description",event.target.value)}/></label>
                  <label className="admin-field">ترتيب الباقة<input type="number" min="0" step="1" value={item.sort_order} onChange={event=>changePackage(item.id,"sort_order",Number(event.target.value))}/></label>
                  <label className="admin-field">شارة الباقة<input value={item.tagline} onChange={event=>changePackage(item.id,"tagline",event.target.value)}/></label>
                  <label className="admin-field">المزايا (كل ميزة في سطر)<textarea rows={3} value={item.features.join("\n")} onChange={event=>changePackage(item.id,"features",event.target.value.split("\n").map(feature=>feature.trim()).filter(Boolean))}/></label>
                  <label className="check-row"><input type="checkbox" checked={item.is_custom_quote} onChange={event=>changePackage(item.id,"is_custom_quote",event.target.checked)}/> تسعير مخصص</label>
                  <label className="check-row"><input type="checkbox" checked={item.is_featured} onChange={event=>changePackage(item.id,"is_featured",event.target.checked)}/> باقة مميزة</label>
                  <label className="check-row"><input type="checkbox" checked={item.is_published} onChange={event=>changePackage(item.id,"is_published",event.target.checked)}/> منشورة للعملاء</label>
                  <small>{item.is_custom_quote ? "تسعير مخصص" : formatEgp(Number(item.price))} · {item.features.length} مزايا</small>
                  <button type="button" className="button button-small" disabled={busy || !item.name.trim()} onClick={()=>savePackage(item)}>حفظ الباقة</button> <button type="button" className="button button-outline button-small" disabled={busy||item.is_custom_quote||item.initial_price==null} onClick={()=>resetPackagePrices(item)}>إعادة ضبط السعر</button> <button type="button" className="button button-outline button-small" style={{color:"#b91c1c"}} disabled={busy} onClick={()=>void removePackage(item)}>حذف الباقة</button>
                </div> : <p>لا توجد باقة هنا — أنشئ باقة جديدة لإضافتها.</p>}
              </article>;
            })}
          </div>
          {packages.map((item) => <article className="admin-package-editor" key={item.id}>
            <div className="admin-form-grid">
              <label className="admin-field">اسم البطاقة<input value={item.name} onChange={(event) => changePackage(item.id, "name", event.target.value)} /></label>
              <label className="admin-field">شارة البطاقة<input value={item.tagline} onChange={(event) => changePackage(item.id, "tagline", event.target.value)} /></label>
              {packagePriceFields(item)}
              <label className="admin-field" style={{ gridColumn: "1 / -1" }}>الوصف<input value={item.description} onChange={(event) => changePackage(item.id, "description", event.target.value)} /></label>
              <label className="admin-field" style={{ gridColumn: "1 / -1" }}>المزايا (ميزة في كل سطر)<textarea rows={3} value={item.features.join("\n")} onChange={(event) => changePackage(item.id, "features", event.target.value.split("\n").map((feature) => feature.trim()).filter(Boolean))} /></label>
            </div>
            <div className="admin-package-controls"><label className="check-row"><input type="checkbox" checked={item.is_published} onChange={(event) => changePackage(item.id, "is_published", event.target.checked)} /> منشورة للعملاء</label><label className="check-row"><input type="checkbox" checked={item.is_featured} onChange={(event) => changePackage(item.id, "is_featured", event.target.checked)} /> موصى بها</label><label className="check-row"><input type="checkbox" checked={item.is_custom_quote} onChange={(event) => changePackage(item.id, "is_custom_quote", event.target.checked)} /> تسعير مخصص</label><label className="admin-field">ترتيب البطاقة<input type="number" value={item.sort_order} onChange={(event) => changePackage(item.id, "sort_order", Number(event.target.value))} /></label><button className="button button-small" disabled={busy} onClick={() => savePackage(item)}>حفظ التعديلات</button> <button type="button" className="button button-outline button-small" disabled={busy||item.is_custom_quote||item.initial_price==null} onClick={()=>resetPackagePrices(item)}>إعادة ضبط السعر</button> <button type="button" className="button button-outline button-small" style={{color:"#b91c1c"}} disabled={busy} onClick={()=>void removePackage(item)}>حذف الباقة</button></div>
          </article>)}
        </section>}

        {view === "options" && offeringTab === "addons" && <><section id="unified-package-options" className="admin-content-card">
          <div className="admin-content-title"><div><h2>إدارة الإضافات للباقات والأنظمة المخصصة</h2><p>كل إضافة تُدار مرة واحدة وتظهر تلقائيًا في جميع الباقات والأنظمة الحالية والمستقبلية. تعديل السعر أو الإيقاف يسري على الجميع دون تغيير الطلبات السابقة.</p></div></div>
          <div className="admin-actions"><button type="button" className="button button-outline button-small" disabled={busy||!options.length} onClick={()=>resetAddonPrices()}>إعادة ضبط جميع أسعار الإضافات</button><p className="field-hint">تعود الأسعار ووحدات الحساب للقيم الأساسية المعتمدة وتُلغى الخصومات، دون تغيير التفعيل أو الترتيب.</p></div>
          <div className="admin-actions"><label className="admin-field">خصم جميع الإضافات (%)<input type="number" min={0} max={100} step="0.01" value={bulkAddonDiscount} onChange={e=>setBulkAddonDiscount(e.target.value)}/></label><button type="button" className="button button-small" disabled={busy} onClick={applyBulkAddonDiscount}>تطبيق الخصم على الكل</button><button type="button" className="button button-outline button-small" disabled={busy} onClick={()=>{if(window.confirm("إلغاء الخصومات من كل الإضافات؟"))void save(()=>api("options/discount",{method:"POST",body:JSON.stringify({discountPercent:0})}),"تم إلغاء الخصومات.");}}>إلغاء الخصومات</button></div>
          <details><summary>ترتيب عرض الأقسام</summary><p className="field-hint">الدومين يظل أول خطوة مستقلة. غيّر ترتيب الأقسام ثم احفظ.</p><div className="admin-addon-order">{orderedAddonGroups.map((g,i)=><div className="admin-addon-order-row" key={g.code}><span>{i+1}</span><strong>{g.name}</strong><button type="button" className="button button-outline button-small" disabled={busy||i===0} aria-label={`تقديم ${g.name}`} onClick={()=>moveCategory(g.code,-1)}>↑</button><button type="button" className="button button-outline button-small" disabled={busy||i===orderedAddonGroups.length-1} aria-label={`تأخير ${g.name}`} onClick={()=>moveCategory(g.code,1)}>↓</button></div>)}<button type="button" className="button button-small" disabled={busy} onClick={saveCategoryOrder}>حفظ ترتيب الأقسام</button></div></details>
          <div className="admin-addon-tabs" role="group" aria-label="أقسام الإضافات">{orderedAddonGroups.map(g=><button type="button" key={g.code} aria-pressed={addonTab===g.code} className={addonTab===g.code?"button button-small":"button button-outline button-small"} onClick={()=>selectAddonTab(g.code)}>{g.name} ({g.items.length})</button>)}</div>
          <h3>{addonCategories.find(c=>c.code===addonTab)?.name}</h3>
          <form className="admin-team-form admin-option-create" onSubmit={addOption}>
            <label className="admin-field">القسم<select aria-label="القسم" value={optionDraft.categoryCode} onChange={e=>selectAddonTab(e.target.value as AddonCategoryCode)}>{orderedAddonGroups.map(g=><option key={g.code} value={g.code}>{g.name}</option>)}</select></label><label className="admin-field">ترتيب العرض داخل القسم<input type="number" min={-100000} max={100000} step={1} required value={optionDraft.sortOrder} onChange={e=>setOptionDraft(d=>({...d,sortOrder:Number(e.target.value)}))}/></label>
            <label className="admin-field">رمز الربط<input required pattern="[a-z0-9_-]{2,80}" title="استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة فقط" value={optionDraft.code} onChange={(event) => setOptionDraft({ ...optionDraft, code: event.target.value })} /></label>
            <label className="admin-field">اسم الإضافة<input required value={optionDraft.name} onChange={(event) => setOptionDraft({ ...optionDraft, name: event.target.value })} /></label>
            <label className="admin-field">السعر<input required type="number" min="0" step="0.01" value={optionDraft.price} onChange={(event) => setOptionDraft({ ...optionDraft, price: event.target.value })} /></label>
            <label className="admin-field">طريقة الحساب<select value={optionDraft.pricingType} onChange={(event) => setOptionDraft({ ...optionDraft, pricingType: event.target.value as Option["pricing_type"] })}><option value="fixed">مرة واحدة</option><option value="per_page">لكل صفحة</option><option value="yearly">سنوي</option><option value="monthly">شهري</option></select></label>
            <label className="admin-field">وحدة السعر<input maxLength={40} placeholder="مثل: صفحة" value={optionDraft.unitLabel} onChange={(event) => setOptionDraft({ ...optionDraft, unitLabel: event.target.value })} /></label>
            <label className="admin-field" style={{ gridColumn: "1 / -1" }}>الوصف<input value={optionDraft.description} onChange={(event) => setOptionDraft({ ...optionDraft, description: event.target.value })} /></label>
            <label className="check-row"><input type="checkbox" checked={optionDraft.isRequired} onChange={(event) => setOptionDraft({ ...optionDraft, isRequired: event.target.checked })} /> إلزامية</label>
            <button className="button" disabled={busy}>إضافة للجميع</button>
          </form>
          {(orderedAddonGroups.find(g=>g.code===addonTab)?.items??[]).map((item) => <article className="admin-package-editor" key={item.id}>
            <div className="option-admin-heading"><strong>{item.name}</strong><small>{item.is_active?"متاحة للجميع":"متوقفة"}</small><code>{item.code}</code>{item.initial_price!=null&&<small>السعر الأساسي: {formatEgp(Number(item.initial_price))}</small>}</div>
            <div className="admin-form-grid">
              <label className="admin-field">القسم<select aria-label="القسم" value={categoryFor(item)} onChange={e=>{const code=e.target.value as AddonCategoryCode;changeOption(item.id,"category_code",code);selectAddonTab(code);}}>{orderedAddonGroups.map(g=><option key={g.code} value={g.code}>{g.name}</option>)}</select></label><label className="admin-field">ترتيب العرض داخل القسم<input type="number" min={-100000} max={100000} step={1} value={item.sort_order} onChange={e=>changeOption(item.id,"sort_order",Number(e.target.value))}/></label><label className="admin-field">اسم الإضافة<input value={item.name} onChange={(event) => changeOption(item.id, "name", event.target.value)} /></label>
              <label className="admin-field">السعر قبل الخصم<input aria-label="السعر" type="number" min="0" step="0.01" value={item.list_price??item.price} onChange={event=>changeOption(item.id,"list_price",Number(event.target.value))}/></label>
              <label className="admin-field">نسبة الخصم (%)<input type="number" min={0} max={100} step="0.01" value={item.discount_percent??0} onChange={event=>changeOption(item.id,"discount_percent",Math.min(100,Math.max(0,Number(event.target.value))))}/></label>
              <div className="admin-field">السعر بعد الخصم<AddonPrice item={{price:Math.round(Number(item.list_price??item.price)*(100-Number(item.discount_percent??0)))/100,list_price:item.list_price??item.price,discount_percent:item.discount_percent}}/></div>
              <label className="admin-field">طريقة الحساب<select value={item.pricing_type} onChange={(event) => changeOption(item.id, "pricing_type", event.target.value as Option["pricing_type"])}><option value="fixed">مرة واحدة</option><option value="per_page">لكل صفحة</option><option value="yearly">سنوي</option><option value="monthly">شهري</option></select></label>
              <label className="admin-field">وحدة السعر<input value={item.unit_label} onChange={(event) => changeOption(item.id, "unit_label", event.target.value)} /></label>
              <label className="admin-field" style={{ gridColumn: "1 / -1" }}>الوصف<input value={item.description} onChange={(event) => changeOption(item.id, "description", event.target.value)} /></label>
            </div>
            <div className="admin-package-controls"><label className="check-row"><input type="checkbox" checked={item.is_required} onChange={(event) => changeOption(item.id, "is_required", event.target.checked)} /> إلزامية</label><label className="check-row"><input type="checkbox" checked={item.is_active} onChange={(event) => changeOption(item.id, "is_active", event.target.checked)} /> متاحة للعملاء</label><button className="button button-small" disabled={busy} onClick={() => saveOption(item)}>حفظ التعديلات</button><button type="button" className="button button-outline button-small" disabled={busy||item.initial_price==null} onClick={()=>resetAddonPrices(item)}>إعادة ضبط السعر</button><button type="button" className="button button-outline button-small" disabled={busy || !item.is_active} onClick={() => void removeOption(item)}>حذف من العرض</button></div>
          </article>)}
        </section><section id="unified-vat" className="admin-content-card"><h2>ضريبة القيمة المضافة</h2><p>نسبة الضريبة المستخدمة في ملخص التسعير.</p><label className="admin-field">الضريبة %<input type="number" min="0" max="100" step="0.01" value={vatRate} onChange={(event)=>setVatRate(Number(event.target.value))}/></label><div className="admin-actions"><button type="button" className="button" disabled={busy} onClick={saveTheme}>حفظ نسبة الضريبة</button></div></section></>}
        {view === "options" && offeringTab === "systems" && <div id="unified-catalog-pricing">{canEditCatalog && <CatalogManager />}</div>}
        {view === "options" && offeringTab === "preview" && <section className="admin-content-card"><h2>معاينة الباقات والمنتجات التفاعلية</h2><p>عرض حي لشكل الباقات كما يراه العميل، يشمل التعديلات الحالية قبل الحفظ. لا يتم نشر التعديلات.</p><div className="admin-actions"><button type="button" className="button button-outline" onClick={()=>setOfferPreviewDevice("desktop")}>كمبيوتر</button><button type="button" className="button button-outline" onClick={()=>setOfferPreviewDevice("mobile")}>موبايل</button><button type="button" className="button" onClick={previewOfferings}>تحديث المعاينة</button><button type="button" className="button button-outline" onClick={()=>setOfferingTab("packages")}>رجوع للتعديل</button></div>{offerPreviewUrl&&<div style={{display:"flex",justifyContent:"center",overflowX:"auto",background:"#e8edf2",padding:12}}><iframe title="معاينة الباقات كما تظهر للجمهور" src={offerPreviewUrl} sandbox="allow-scripts allow-same-origin" style={{width:offerPreviewDevice==="mobile"?390:"100%",maxWidth:"100%",height:"75vh",minHeight:480,border:"1px solid #d8dde5",borderRadius:12,background:"#fff"}}/></div>}</section>}

        {view === "theme" && <section className="admin-content-card"><div className="admin-content-title"><div><h2>هوية الموقع وتنسيقه</h2><p>تحكم في الألوان والخط والشعار وصور الواجهة والخلفية. الصور المرفوعة تحفظ في قاعدة بيانات المنصة.</p></div></div><div className="theme-swatches">{([ ["navy","الكحلي"], ["blue","الأزرق"], ["gold","الذهبي"], ["page","الخلفية"] ] as Array<["navy" | "blue" | "gold" | "page",string]>).map(([key,label]) => <label className="theme-swatch" key={key}>{label}<input type="color" value={theme[key]} onChange={(event) => setTheme({ ...theme, [key]: event.target.value })} /></label>)}</div><div className="admin-form-grid"><ImageSetting label="الشعار" value={theme.logoUrl} onChange={(value) => setTheme({ ...theme, logoUrl: value })} onUpload={(event) => void uploadThemeImage(event, "logoUrl")} busy={busy} /><ImageSetting label="صورة الواجهة الرئيسية" value={theme.heroImageUrl} onChange={(value) => setTheme({ ...theme, heroImageUrl: value })} onUpload={(event) => void uploadThemeImage(event, "heroImageUrl")} busy={busy} /><ImageSetting label="خلفية الموقع" value={theme.backgroundImageUrl} onChange={(value) => setTheme({ ...theme, backgroundImageUrl: value })} onUpload={(event) => void uploadThemeImage(event, "backgroundImageUrl")} busy={busy} /></div><div className="admin-form-grid"><label className="admin-field">الخط<select value={theme.fontFamily} onChange={(event) => setTheme({ ...theme, fontFamily: event.target.value as Theme["fontFamily"] })}><option>IBM Plex Sans Arabic</option><option>Cairo</option><option>Tajawal</option></select></label><label className="admin-field">استدارة البطاقات ({theme.cardRadius}px)<input type="range" min="0" max="32" step="1" value={theme.cardRadius} onChange={(event) => setTheme({ ...theme, cardRadius: Number(event.target.value) })} /></label></div><div className="admin-actions"><button className="button" disabled={busy} onClick={saveTheme}>حفظ الهوية والتنسيق ✓</button></div></section>}

        {view === "inbox" && <JourneyManager mode="requests" showMyTasks={user.role!=="owner"} canManageTasks={canEditOrders} canArchive={user.role === "owner" || user.role === "admin"} canDelete={user.role === "owner"} />}

        {view === "inbox" && <section className="admin-content-card"><div className="admin-content-title"><div><h2>الطلبات الأخرى</h2></div><span className="status-chip">{orders.length} طلب</span></div><OrderTable orders={orders} members={members} onChange={updateOrder} onSendEmail={sendCustomerEmail} canSend={canEditOrders && emailStatus.configured} detailed readOnly={!canEditOrders} /></section>}

        {view === "team" && canReadTeam(user) && !canManageTeam && <section className="admin-content-card admin-team-permissions-panel"><div className="admin-content-title"><div><h2>فريق الإدارة</h2><p>يمكنك الاطلاع على الفريق بصلاحيتك. إنشاء الحسابات وتعديل الصلاحيات والحذف للمالك فقط.</p></div></div>{!teamLoaded?<p>تعذر تحميل بيانات الفريق.</p>:members.length===0?<p>لا توجد حسابات فريق.</p>:<div className="admin-team-list">{members.map(member=><article className="admin-team-row" key={member.id}><span className="admin-avatar">{member.display_name.slice(0,1)}</span><strong>{member.display_name}</strong><span>{member.email}</span><span>{roleLabels[member.role]}</span><span>{member.is_active ? "نشط" : "موقوف"}</span></article>)}</div>}</section>}

        {view === "team" && canManageTeam && <section className="admin-content-card admin-team-permissions-panel"><div className="admin-content-title"><div><h2>فريق الإدارة</h2><p>أنشئ حسابات بصلاحيات محدودة؛ إرسال البريد يحتاج مزود بريد متصل.</p></div></div><form className="admin-team-form" onSubmit={addMember}><label className="admin-field">الاسم<input required value={memberName} onChange={(event) => setMemberName(event.target.value)} /></label><label className="admin-field">البريد الإلكتروني<input type="email" required value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} /></label><label className="admin-field">كلمة مرور مؤقتة (12 حرفًا على الأقل)<input type="password" minLength={12} required value={memberPassword} onChange={(event) => setMemberPassword(event.target.value)} /></label><div className="admin-content-card" style={{gridColumn:"1 / -1",padding:12}}><strong>حدد صلاحيات العضو</strong><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>{teamCapabilities.map(capability=><label className="check-row" key={capability.key}><input type="checkbox" checked={memberPermissions[capability.key]===true} onChange={event=>setMemberPermissions(previous=>({...previous,[capability.key]:event.target.checked}))}/> {capability.label}</label>)}</div><small>يتم منح الصلاحيات المحددة فقط. إدارة الحسابات تظل للمالك.</small></div><button className="button" disabled={busy}>إنشاء الحساب</button></form><div className="admin-team-list">{members.map((member) => <article className="admin-team-row" key={member.id}><span className="admin-avatar">{member.display_name.slice(0,1)}</span><strong>{member.display_name}</strong><span>{member.email}</span><details open><summary>تعديل الصلاحيات الفردية</summary><div style={{display:"flex",gap:8,flexWrap:"wrap",padding:8}}>{([{key:"assistant",label:"المساعد الذكي"},{key:"customers",label:"العملاء"},{key:"content",label:"إنشاء المحتوى"},{key:"products",label:"المنتجات"},{key:"settings",label:"الإعدادات"},{key:"team",label:"الفريق"},{key:"audit",label:"سجل التغييرات"}] as const).map(capability=><label className="check-row" key={capability.key}><input type="checkbox" disabled={busy} checked={member.permission_overrides?.[capability.key] ?? ({admin:["assistant","customers","content","products","settings","audit"],editor:["assistant","content"],sales:["customers"],viewer:[]}[member.role]?.some((permission: string)=>permission===capability.key) ?? false)} onChange={event=>{const permissions={...member.permission_overrides,[capability.key]:event.target.checked};void save(async()=>{const saved=await api(`team/${member.id}`,{method:"PATCH",body:JSON.stringify({permissions})});if(saved.member?.permission_overrides?.[capability.key]!==permissions[capability.key])throw new Error("لم يؤكد الخادم حفظ الصلاحية.");},"تم حفظ صلاحيات العضو.");}}/> {capability.label}</label>)}</div><small>يتم حفظ كل تغيير على الخادم. تُحدّث صلاحيات العضو تلقائيًا أثناء فتح لوحة الإدارة.</small></details><span>{member.is_active ? "نشط" : "موقوف"}</span><button type="button" className="inline-add" disabled={busy} onClick={() => { if (window.confirm(`${member.is_active ? "إيقاف" : "إعادة تفعيل"} حساب ${member.display_name}؟`)) void save(() => api(`team/${member.id}`, { method: "PATCH", body: JSON.stringify({isActive:!member.is_active}) }), "تم تحديث حالة الحساب."); }}>{member.is_active ? "إيقاف" : "تفعيل"}</button><button type="button" className="inline-add" disabled={busy || member.email.toLowerCase() === user.email.toLowerCase()} onClick={() => { if(window.confirm(`حذف حساب ${member.display_name} نهائيًا؟ لا يمكن التراجع عن الحذف.`)) void save(async () => { await api(`team/${member.id}/purge`, {method:"POST"}); const verification = await api("team"); if ((verification.members ?? []).some((remaining: Member) => remaining.id === member.id)) throw new Error("أعاد الخادم نجاح الحذف، لكن الحساب لا يزال موجودًا في قاعدة البيانات. لم يتم تأكيد الحذف."); }, "تم حذف عضو الفريق والتحقق من اختفائه من قاعدة البيانات."); }}>حذف نهائي</button></article>)}</div><p className="field-hint">أرسل بيانات الدخول للعضو عبر قناة آمنة منفصلة. لا تُرسل المنصة كلمات المرور بالبريد.</p></section>}

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

function AssignedTaskChat(){
 const [tasks,setTasks]=useState<Array<{id:string;project_id:string;title:string;project_name:string}>>([]);
 const [project,setProject]=useState("");
 const [messages,setMessages]=useState<Array<{id:string;actor:string;body:string}>>([]);
 const [body,setBody]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [tasksLoaded,setTasksLoaded]=useState(false),[tasksError,setTasksError]=useState("");
 useEffect(()=>{
   let active=true,pending=false;
   const load=async()=>{
     if(!active||pending||document.visibilityState==="hidden")return;
     pending=true;
     try{
       const r=await fetch("/api/admin/journey/my-tasks",{credentials:"include",cache:"no-store"});
       if(!r.ok)throw Error();
       const d=await r.json();
       if(active){setTasks(d.tasks||[]);setTasksLoaded(true);setTasksError("");}
     }catch{if(active)setTasksError("تعذر تحميل المهام");}
     finally{pending=false;}
   };
   void load();const timer=setInterval(load,15000);
   window.addEventListener("focus",load);document.addEventListener("visibilitychange",load);
   return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",load);document.removeEventListener("visibilitychange",load);};
 },[]);
 useEffect(()=>{setMessages([]);if(!project)return;let active=true;const load=()=>fetch("/api/admin/journey/assigned-chat/"+encodeURIComponent(project),{credentials:"include",cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(active){setMessages(d.messages||[]);setError("")}}).catch(()=>{if(active){setMessages([]);setError("المحادثة غير متاحة أو انتهت صلاحية الإسناد")}});void load();const timer=setInterval(load,5000);return()=>{active=false;clearInterval(timer)}},[project]);
 async function send(){if(busy||!project||body.trim().length<2)return;setBusy(true);try{const r=await fetch("/api/admin/journey/projects/"+encodeURIComponent(project)+"/messages",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:body.trim()})});if(!r.ok)throw Error();const d=await r.json();setMessages(old=>[...old,d.message]);setBody("");}catch{setError("تعذر إرسال الرسالة")}finally{setBusy(false)}}
 return <section className="admin-content-card" style={{padding:"12px 16px"}}><h2 style={{fontSize:"16px",margin:"0 0 6px",lineHeight:1.4}}>مهامي ومحادثات العملاء</h2>{tasks.map(t=><div key={t.id}><strong>{t.title} — {t.project_name}</strong> <button type="button" onClick={()=>{setProject(t.project_id);setBody("");setError("")}}>محادثة العميل</button></div>)}{!tasks.length&&tasksLoaded&&!tasksError&&<p style={{fontSize:"13px",margin:0,lineHeight:1.5}}>لا توجد مهام مسندة حاليًا.</p>}{!tasksLoaded&&!tasksError&&<p>جارٍ تحميل المهام…</p>}{tasksError&&<p role="alert">{tasksError}</p>}{error&&<p role="alert">{error}</p>}{project&&<div><button type="button" onClick={()=>setProject("")}>إغلاق المحادثة</button>{messages.map(m=><p key={m.id}><strong>{m.actor==="customer"?"العميل":"الفريق"}:</strong> {m.body}</p>)}<textarea aria-label="رسالة للعميل" value={body} onChange={e=>setBody(e.target.value)}/><button type="button" disabled={busy||body.trim().length<2} onClick={()=>void send()}>إرسال الرسالة</button></div>}</section>;
}

function InternalMessaging({canCustomers,target}:{canCustomers:boolean;target:string}){
 type Contact={id:string;display_name:string};type Msg={id:string;sender_id:string;sender_name?:string;file_id?:string;filename?:string;body:string;created_at:string};
 const [contacts,setContacts]=useState<Contact[]>([]),[me,setMe]=useState(""),[peer,setPeer]=useState(""),[messages,setMessages]=useState<Msg[]>([]),[body,setBody]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[mode,setMode]=useState(()=>new URLSearchParams(target).get("chat")==="support"?"support":"internal"),[groups,setGroups]=useState<Contact[]>([]),[search,setSearch]=useState("");
 useEffect(()=>{const p=new URLSearchParams(target);if(p.get("chat")==="internal")setPeer(p.get("peer")||"");if(p.get("chat")==="support")setMode("support");},[target]);
 useEffect(()=>{let active=true;fetch("/api/admin/internal-chat/contacts",{credentials:"include",cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(active){setContacts(d.contacts);setMe(d.me)}}).catch(()=>{if(active)setError("تعذر تحميل الفريق")});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;fetch("/api/admin/internal-groups",{credentials:"include",cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(active)setGroups(d.groups.map((g:{id:string;title?:string})=>({id:"group:"+g.id,display_name:g.title||"مشروع "+g.id.slice(0,8)})))}).catch(()=>{if(active)setError("تعذر تحميل المجموعات")});return()=>{active=false}},[]);
 const endpoint=(id:string)=>id.startsWith("group:")?"/api/admin/internal-groups/"+encodeURIComponent(id.slice(6)):"/api/admin/internal-chat/"+encodeURIComponent(id);
 useEffect(()=>{setMessages([]);setBody("");setError("");if(!peer)return;let active=true;const load=async()=>{try{const r=await fetch(endpoint(peer),{credentials:"include",cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();if(active){setMessages(d.messages);setError("")}}catch{if(active)setError("تعذر تحميل الرسائل")}};void load();const timer=setInterval(load,5000);return()=>{active=false;clearInterval(timer)}},[peer]);
 async function send(e:FormEvent){e.preventDefault();if(busy||!peer||body.trim().length<2)return;setBusy(true);try{const r=await fetch(endpoint(peer),{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:body.trim()})});if(!r.ok)throw Error();const d=await r.json();setMessages(old=>old.some(m=>m.id===d.message.id)?old:[...old,d.message]);setBody("");setError("")}catch{setError("تعذر إرسال الرسالة")}finally{setBusy(false)}}
 async function upload(file:File){if(!peer||busy)return;if(file.size>20*1024*1024||!file.size){setError("حجم الملف غير صالح (20 ميجابايت كحد أقصى)");return;}setBusy(true);try{const r=await fetch(endpoint(peer)+"/files",{method:"POST",credentials:"include",headers:{"Content-Type":"application/octet-stream","x-file-name":encodeURIComponent(file.name)},body:file});if(!r.ok)throw Error();const d=await r.json();setMessages(old=>old.some(m=>m.id===d.message.id)?old:[...old,d.message]);setError("")}catch{setError("تعذر رفع المرفق")}finally{setBusy(false)}}
 return <section className="admin-content-card internal-messenger" dir="rtl"><style>{`.internal-messenger .messaging-tabs{display:flex;gap:6px;flex-wrap:wrap;background:#edf2f3;padding:6px;border-radius:16px}.internal-messenger .messaging-tabs button,.internal-messenger .support-assignment button,.internal-messenger .support-assignment select,.internal-messenger .live-support-layout aside button,.internal-messenger .live-support-back{border:1px solid #dce6e5;border-radius:12px;background:#f4f8f7;color:#254b47;padding:10px 12px;font:inherit;font-size:13px;cursor:pointer}.internal-messenger .messaging-tabs button[aria-pressed=true]{background:#087e70;color:white;border-color:#087e70}.internal-messenger .support-assignment{display:flex;flex-wrap:wrap;gap:8px;padding:10px;background:#f6f8fa;border-radius:14px}.internal-messenger button:disabled{opacity:.5}.internal-messenger .chat-attachment{display:inline-flex;align-items:center;justify-content:center;position:relative;min-width:32px;min-height:36px;color:#087e70;cursor:pointer;font-size:18px}.internal-messenger .chat-attachment input[type=file]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}`}</style><div className="messaging-tabs"><button type="button" aria-pressed={mode==="internal"} onClick={()=>setMode("internal")}>محادثات الفريق</button><button type="button" aria-pressed={mode==="support"} onClick={()=>setMode("support")}>خدمة العملاء المباشرة</button>{canCustomers&&<button type="button" aria-pressed={mode==="customers"} onClick={()=>setMode("customers")}>محادثات العملاء</button>}</div>{mode==="support"?<LiveSupportInbox initialThread={new URLSearchParams(target).get("thread")||""} contacts={contacts} owner={me==="00000000-0000-4000-8000-000000000001"}/>:mode==="customers"&&canCustomers?<JourneyManager mode="requests" showMyTasks={me!=="00000000-0000-4000-8000-000000000001"} canManageTasks={false} canArchive={false} canDelete={false}/>:<div className="internal-chat-layout" data-open={!!peer}><style>{`.internal-messenger button{border:0;border-radius:9px;padding:10px 15px;background:#e6efec;color:#17463e;cursor:pointer;font:inherit}.internal-messenger button:disabled{opacity:.5}.internal-chat-list{background:#fff;border-inline-end:1px solid #dce5e2;padding:10px;overflow:auto;max-height:70vh}.internal-chat-list button{background:#f5f8f7;text-align:right;display:flex;align-items:center;gap:10px}.internal-chat-list button[aria-current=true]{background:#cce8df}.internal-chat-list input,.internal-chat-thread input{border:1px solid #d6e2de;border-radius:22px;padding:10px 14px;font:inherit}.internal-chat-thread{background:#f0eee8;border-radius:12px;overflow:hidden}.internal-chat-thread>div:first-child{background:#075e54;color:white;padding:15px}.internal-chat-thread form{background:#fff;padding:10px;align-items:center}.internal-chat-thread form button{background:#087e70;color:white}.internal-chat-scroll{background-image:radial-gradient(#c9c5b955 1px,transparent 1px);background-size:18px 18px}.internal-chat-avatar{display:inline-grid;place-items:center;border-radius:50%;width:38px;height:38px;background:#d1e8e1;color:#075e54;flex:none}.internal-chat-layout{display:grid;grid-template-columns:minmax(140px,240px) minmax(0,1fr);gap:12px;margin-top:12px}.internal-chat-list{display:flex;flex-direction:column;gap:6px}.internal-chat-thread{display:flex;flex-direction:column;min-height:420px}.internal-chat-scroll{height:55vh;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:12px}.internal-chat-back{display:none}@media(max-width:700px){.internal-chat-layout{display:block}.internal-chat-layout[data-open=true] .internal-chat-list{display:none}.internal-chat-layout[data-open=false] .internal-chat-thread{display:none}.internal-chat-back{display:inline-block}.internal-chat-layout[data-open=true] .internal-chat-thread{position:fixed;inset:0;z-index:1000;border-radius:0;height:100dvh}.internal-chat-layout[data-open=true] .internal-chat-scroll{height:auto;flex:1;min-height:0}.internal-chat-thread form{padding-bottom:max(10px,env(safe-area-inset-bottom))}}`}</style><div className="internal-chat-list"><input placeholder="بحث عن محادثة" aria-label="بحث عن محادثة" value={search} onChange={e=>setSearch(e.target.value)}/>{[...contacts,...groups].filter(p=>p.display_name.toLowerCase().includes(search.toLowerCase())).map(p=><button key={p.id} aria-current={peer===p.id} disabled={busy} type="button" onClick={()=>setPeer(p.id)} style={{padding:12,textAlign:"right",fontWeight:peer===p.id?800:400}}><span className="internal-chat-avatar">{p.id.startsWith("group:")?"♟":p.display_name.slice(0,1)}</span>{p.display_name}</button>)}</div><div className="internal-chat-thread"><div><button className="internal-chat-back" type="button" disabled={busy} onClick={()=>setPeer("")}>رجوع</button> <strong>{[...contacts,...groups].find(p=>p.id===peer)?.display_name||"اختر عضوًا"}</strong></div><div className="internal-chat-scroll" role="log">{!peer&&<p style={{margin:"auto",color:"#52645f"}}>اختر محادثة من القائمة لبدء المراسلة</p>}{messages.map(m=><div key={m.id} style={{alignSelf:m.sender_id===me?"flex-start":"flex-end",background:m.sender_id===me?"#d9fdd3":"#eee",color:"#17212b",borderRadius:12,padding:"8px 12px",maxWidth:"85%",overflowWrap:"anywhere",whiteSpace:"pre-wrap"}}>{peer.startsWith("group:")&&m.sender_id!==me&&<strong style={{display:"block"}}>{m.sender_name||"عضو الفريق"}</strong>}{m.file_id?<a href={endpoint(peer)+"/files/"+encodeURIComponent(m.file_id)} download={m.filename}>📎 {m.filename||"تنزيل المرفق"}</a>:m.body}<small style={{display:"block",opacity:.7}}>{new Date(m.created_at).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</small></div>)}</div>{peer&&<form onSubmit={send} style={{display:"flex",gap:8}}><label className="chat-attachment" title="مستند PDF أو Word">📄<input type="file" aria-label="إرفاق مستند" disabled={busy} accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void upload(f)}}/></label><label className="chat-attachment" title="إرفاق صورة">📷<input type="file" accept="image/*" aria-label="إرفاق صورة" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void upload(f)}}/></label><input aria-label="الرسالة" value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} style={{flex:1,minWidth:0}}/><button disabled={busy||body.trim().length<2}>إرسال</button></form>}{error&&<p role="alert">{error}</p>}</div></div>}</section>
}

function LiveSupportInbox({contacts,owner,initialThread}:{initialThread:string;contacts:{id:string;display_name:string}[];owner:boolean}){
 useEffect(()=>{const ping=()=>{if(document.visibilityState==="visible")void fetch("/api/admin/live-support-presence",{method:"POST"}).catch(()=>undefined)};ping();const timer=setInterval(ping,15000);document.addEventListener("visibilitychange",ping);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",ping)}},[]);
 type Thread={id:string;assigned_to:string|null;last_message:string|null};type Msg={id:string;sender:string;body:string;file_id?:string;filename?:string};
 const [threads,setThreads]=useState<Thread[]>([]),[id,setId]=useState(initialThread),[messages,setMessages]=useState<Msg[]>([]),[body,setBody]=useState(""),[error,setError]=useState(""),[assignment,setAssignment]=useState(""),[busy,setBusy]=useState(false);

 useEffect(()=>{let active=true;async function load(){try{const r=await fetch("/api/admin/live-support",{cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();if(active)setThreads(d.threads)}catch{if(active)setError("تعذر تحميل المحادثات")}}void load();const timer=setInterval(load,3000);return()=>{active=false;clearInterval(timer)}},[]);
 useEffect(()=>{setMessages([]);setBody("");if(!id)return;let active=true;async function load(){try{const r=await fetch("/api/admin/live-support/"+id,{cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();if(active)setMessages(d.messages)}catch{if(active)setError("تعذر تحميل الرسائل")}}void load();const timer=setInterval(load,3000);return()=>{active=false;clearInterval(timer)}},[id]);
 async function deleteThread(){if(!owner||!id||busy||!window.confirm("حذف المحادثة ورسائلها نهائيًا؟"))return;setBusy(true);try{const r=await fetch("/api/admin/live-support/"+encodeURIComponent(id),{method:"DELETE"});if(!r.ok)throw Error();setThreads(old=>old.filter(t=>t.id!==id));setId("");setMessages([]);setError("");}catch{setError("تعذر حذف المحادثة")}finally{setBusy(false)}}
 async function assign(thread:boolean){try{const r=await fetch(thread?"/api/admin/live-support/"+id+"/assignment":"/api/admin/live-support-assignment",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({assigned_to:assignment||null})});if(!r.ok)throw Error();setError("تم حفظ التعيين")}catch{setError("تعذر حفظ التعيين")}}
 async function send(e:FormEvent){e.preventDefault();if(!id||!body.trim()||busy)return;setBusy(true);try{const r=await fetch("/api/admin/live-support/"+id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:body.trim()})});if(!r.ok)throw Error();const d=await r.json();setMessages(old=>old.some(m=>m.id===d.message.id)?old:[...old,d.message]);setBody("");setError("")}catch{setError("تعذر الإرسال")}finally{setBusy(false)}}
 async function upload(file:File){if(!id||busy)return;if(!file.size||file.size>20*1024*1024){setError("حجم الملف غير صالح");return;}setBusy(true);try{const r=await fetch("/api/admin/live-support/"+id+"/files",{method:"POST",headers:{"Content-Type":"application/octet-stream","x-file-name":encodeURIComponent(file.name)},body:file});if(!r.ok)throw Error();const d=await r.json();setMessages(old=>old.some(m=>m.id===d.message.id)?old:[...old,d.message]);setError("")}catch{setError("تعذر رفع الملف")}finally{setBusy(false)}}
 return <div style={{marginTop:12}}>{owner&&<div className="support-assignment"><select aria-label="موظف خدمة العملاء" value={assignment} onChange={e=>setAssignment(e.target.value)}><option value="">الإدارة فقط</option>{contacts.filter(c=>c.id!=="00000000-0000-4000-8000-000000000001").map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select><button onClick={()=>void assign(false)}>تعيين للمحادثات الجديدة</button><button disabled={!id} onClick={()=>void assign(true)}>تعيين المحادثة الحالية</button></div>}<div className="live-support-layout" data-open={!!id}><style>{`.live-support-layout{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:12px;margin-top:12px;min-width:0}.live-support-layout>*{min-width:0;max-width:100%;box-sizing:border-box}.live-support-layout form{min-width:0;align-items:center}.live-support-layout form input{width:0;min-width:0;box-sizing:border-box}.live-support-layout form button{flex:none}.live-support-back{display:none}@media(max-width:700px){.live-support-layout{display:block}.live-support-layout[data-open=true]>aside,.live-support-layout[data-open=false]>section{display:none}.live-support-back{display:inline-block}.live-support-layout section{width:100%}}`}</style><aside style={{maxHeight:"60vh",overflow:"auto"}}>{threads.map(t=><button key={t.id} onClick={()=>setId(t.id)} style={{display:"block",width:"100%",textAlign:"right",marginBottom:6,background:t.id===id?"#cce8df":undefined}}>زائر {t.id.slice(0,8)}<small style={{display:"block"}}>{t.last_message?.slice(0,80)||"محادثة جديدة"}</small></button>)}</aside><section style={{background:"#f0eee8",borderRadius:12,padding:12,color:"#17212b"}}><button type="button" className="live-support-back" onClick={()=>setId("")}>رجوع</button> <strong>{id?"محادثة الزائر "+id.slice(0,8):"اختر محادثة"}</strong>{owner&&id&&<button type="button" disabled={busy} onClick={()=>void deleteThread()} style={{color:"#a51d28",marginInlineStart:8}}>حذف المحادثة</button>}<div role="log" style={{height:"50vh",overflow:"auto",display:"flex",flexDirection:"column",gap:8,padding:8}}>{messages.map(m=><div key={m.id} style={{alignSelf:m.sender==="staff"?"flex-start":"flex-end",background:m.sender==="staff"?"#d9fdd3":"white",borderRadius:10,padding:10,maxWidth:"85%",overflowWrap:"anywhere"}}>{m.file_id?<a href={"/api/admin/live-support/"+id+"/files/"+m.file_id} download={m.filename}>📎 {m.filename}</a>:m.body}</div>)}</div>{id&&<form onSubmit={send} style={{display:"flex",gap:8,alignItems:"center"}}><div style={{display:"flex",alignItems:"center",flex:"1 1 0",minWidth:0,background:"#fff",borderRadius:28,padding:"4px 12px",gap:8}}><input aria-label="الرسالة" placeholder="رسالة" value={body} maxLength={2000} onChange={e=>setBody(e.target.value)} style={{flex:1,minWidth:0,border:0,outline:"none",background:"transparent",padding:"10px 0",fontSize:16}}/><label className="chat-attachment" title="مستند PDF أو Word">📄<input type="file" aria-label="إرفاق مستند" disabled={busy} accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void upload(f)}}/></label><label className="chat-attachment" title="إرفاق صورة">📷<input type="file" accept="image/*" aria-label="إرفاق صورة" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void upload(f)}}/></label></div><button type="submit" aria-label="إرسال" disabled={busy||!body.trim()} style={{width:46,height:46,border:0,borderRadius:"50%",background:"#008069",color:"#fff",display:"grid",placeItems:"center",padding:0,opacity:busy||!body.trim() ? 0.5 : 1}}><svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12 2 3l3 8 11 1-11 1-3 8z" transform="translate(24 0) scale(-1 1)"/></svg></button></form>}</section></div>{error&&<p role="status">{error}</p>}</div>
}
