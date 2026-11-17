"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import { addonOptions, calculateQuote, formatEgp, identityOptions, packages, type AddonId, type ContentId, type DomainId, type IdentityId, type PackageId } from "@/lib/catalog";
import { siteCopyDefaults } from "@/lib/site-copy";
import { findSector } from "@/lib/sector-catalog";
import { loadGuestWorkspace, loadAccountWorkspace, saveGuestWorkspace } from "@/lib/customer-workspace";
import Concierge from "@/components/concierge";

type Customer = { name: string; company: string; email: string; phone: string; details: string; compliance: string };
type BackendPackage = { id: string; name: string; tagline: string; description: string; price: number | string; currency: string; features: string[]; is_featured: boolean; is_custom_quote: boolean };
type BackendOption = { id: string; package_id: string; code: string; name: string; description: string; price: number | string; pricing_type: string; unit_label: string; is_required: boolean };
type BackendCatalog = { packages: BackendPackage[]; options: BackendOption[] };
type SiteConfig = { page?: { content?: Record<string, unknown> } | null; theme?: { navy: string; blue: string; gold: string; page: string; logoUrl?: string; heroImageUrl?: string; backgroundImageUrl?: string; fontFamily?: string; cardRadius?: number } | null; vatRate?: number };
type PageLink = { slug: string; title: string };
type PublicCard = { id?: string; title?: string; description?: string; imageUrl?: string; href?: string; linkLabel?: string; icon?: string };
const backendPackageIds: Record<string, string> = {
  landing: "11111111-1111-4111-8111-111111111111",
  multi: "22222222-2222-4222-8222-222222222222",
  dynamic: "33333333-3333-4333-8333-333333333333",
  enterprise: "44444444-4444-4444-8444-444444444444"
};
const builtInOptionCodes = new Set(["language", "logo", "brand", "writing", "seo", "booking", "contact", "analytics", "hosting", "domain_com", "domain_eg", "maintenance"]);

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [packageId, setPackageId] = useState<PackageId | null>(null);
  const [pages, setPages] = useState(1);
  const [bilingual, setBilingual] = useState(false);
  const [stylePreference, setStylePreference] = useState("");
  const [inspirationLinks, setInspirationLinks] = useState([""]);
  const [identity, setIdentity] = useState<IdentityId>("provided");
  const [logoName, setLogoName] = useState("");
  const [content, setContent] = useState<ContentId>("provided");
  const [addons, setAddons] = useState<AddonId[]>([]);
  const [selectedExtraOptionIds, setSelectedExtraOptionIds] = useState<string[]>([]);
  const [hosting, setHosting] = useState(true);
  const [domain, setDomain] = useState<DomainId>("com");
  const [maintenance, setMaintenance] = useState(false);
  const [startWindow, setStartWindow] = useState("month");
  const [contactWindow, setContactWindow] = useState("anytime");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [customer, setCustomer] = useState<Customer>({ name: "", company: "", email: "", phone: "", details: "", compliance: "" });
  const [customerSignedIn,setCustomerSignedIn]=useState(false);
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [requestMessage, setRequestMessage] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [apiCatalog, setApiCatalog] = useState<BackendCatalog>({ packages: [], options: [] });
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({});
  const [pageLinks, setPageLinks] = useState<PageLink[]>([]);
  const [selectedSector, setSelectedSector] = useState<{ slug: string; name: string } | null>(null);
  const [sectorPricedAddons,setSectorPricedAddons]=useState<Array<{code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"}>>([]);
  const [sectorAddonCodes,setSectorAddonCodes]=useState<string[]>([]);
  const [sectorPrice,setSectorPrice]=useState<{subtotal:number;monthly:number;yearly:number;needsCustomQuote:boolean;items:Array<{code:string;name:string;price:number;pricingType:string}>}|null>(null);
  const copy = (key: string) => { const value = siteConfig.page?.content?.[key]; return (typeof value === "string" ? value.trim() : "") || siteCopyDefaults[key] || ""; };
  const steps = Array.from({ length: 8 }, (_, index) => copy(`stepper${index}`));
  const startWindowLabel = ({ soon: copy("startSoon"), month: copy("startInMonth"), twoMonths: copy("startInTwoMonths"), exploring: copy("startExploring") } as Record<string, string>)[startWindow] ?? copy("startInMonth");
  const contactWindowLabel = ({ anytime: copy("contactAnytime"), morning: copy("contactMorning"), afternoon: copy("contactAfternoon"), evening: copy("contactEvening") } as Record<string, string>)[contactWindow] ?? copy("contactAnytime");
  const contentData = siteConfig.page?.content ?? {};
  const cardsFromContent = (key: string, fallback: PublicCard[]): PublicCard[] => Array.isArray(contentData[key]) ? contentData[key] as PublicCard[] : fallback;
  const benefitCards = cardsFromContent("benefitCards", [1,2,3,4].map((n) => ({ id: `benefit-${n}`, title: copy(`benefit${n}Title`), description: copy(`benefit${n}Description`), icon: String(n).padStart(2, "0") })));
  const processCards = cardsFromContent("processCards", [1,2,3].map((n) => ({ id: `step-${n}`, title: copy(`step${n}Title`), description: copy(`step${n}Description`), icon: String(n).padStart(2, "0") })));
  const trustItems = cardsFromContent("trustItems", [1,2,3,4].map((n) => ({ id: `trust-${n}`, title: copy(`trust${n}`) })));
  const faqItems = cardsFromContent("faqEntries", [1,2,3,4,5].map((n) => ({ id: `faq-${n}`, title: copy(`faq${n}Question`), description: copy(`faq${n}Answer`) })).filter((item) => item.title || item.description));
  const vatRate = siteConfig.vatRate ?? 14;

  useEffect(() => {
    let active = true;
    fetch("/api/catalog", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("catalog unavailable");
      return await response.json() as BackendCatalog;
    }).then((catalog) => {
      if (!active) return;
      setApiCatalog(catalog);
      setCatalogStatus(catalog.packages.length ? "ready" : "unavailable");
    }).catch(() => { if (active) setCatalogStatus("unavailable"); });
    fetch("/api/site-content/home", { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as SiteConfig : null)
      .then((config) => { if (active && config) setSiteConfig(config); }).catch(() => undefined);
    fetch("/api/site-pages", { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as { pages?: PageLink[] } : null)
      .then((result) => { if (active) setPageLinks((result?.pages ?? []).filter((item) => item.slug !== "home")); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("sector");
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
    const builtin = findSector(slug);
    if (builtin) setSelectedSector({ slug, name: builtin.name });
    fetch("/api/site-content/catalog", { cache: "no-store" })
      .then(async response => response.ok ? await response.json() : null)
      .then(data => {
        const items = data?.page?.content?.items;
        if (!Array.isArray(items)) return;
        const item = items.find((candidate: {slug?:string;name?:string;published?:boolean;archived?:boolean}) => candidate.slug === slug && candidate.published !== false && !candidate.archived);
        if (item && typeof item.name === "string") {
          setSelectedSector({ slug, name: item.name });
          setSectorPricedAddons(Array.isArray(item.pricedAddons)?item.pricedAddons:[]);
        }
      }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active=true;
    const guest=loadGuestWorkspace();
    const slug=new URLSearchParams(window.location.search).get("sector");
    if(!slug&&guest.sectorSlug&&guest.sectorName)setSelectedSector({slug:guest.sectorSlug,name:guest.sectorName});
    if(guest.packageId)setPackageId(guest.packageId);
    // Account-owned draft is only read after authentication; never silently merge guest data into another account.
    if(!guest.sectorSlug&&!guest.packageId&&!slug){
      void loadAccountWorkspace().then(account=>{
        if(!active||!account)return;
        if(account.sectorSlug&&account.sectorName)setSelectedSector({slug:account.sectorSlug,name:account.sectorName});
        if(account.packageId)setPackageId(account.packageId);
      }).catch(()=>undefined);
    }
    return()=>{active=false;};
  }, []);
  useEffect(() => {
    if (selectedSector) saveGuestWorkspace({sectorSlug:selectedSector.slug,sectorName:selectedSector.name,source:"configurator"});
  }, [selectedSector]);
  useEffect(() => {
    if (packageId) saveGuestWorkspace({packageId,source:"configurator"});
  }, [packageId]);
  useEffect(() => {
    if (!selectedSector){setSectorPrice(null);setSectorPricedAddons([]);return;}
    // Restore options when the visitor enters from a saved workspace, not just a URL.
    fetch("/api/site-content/catalog",{cache:"no-store"})
      .then(async r=>r.ok?r.json():null).then(data=>{
        const entry=(data?.page?.content?.items??[]).find((item:{slug?:string;published?:boolean;archived?:boolean})=>item.slug===selectedSector.slug&&item.published!==false&&!item.archived);
        setSectorPricedAddons(Array.isArray(entry?.pricedAddons)?entry.pricedAddons:[]);
      }).catch(()=>setSectorPricedAddons([]));
    let active=true;
    const params=new URLSearchParams({slug:selectedSector.slug});
    if(sectorAddonCodes.length)params.set("addons",sectorAddonCodes.join(","));
    fetch(`/api/sector-price?${params}`,{cache:"no-store"})
      .then(async r=>{if(!r.ok)throw Error("Sector pricing unavailable");return r.json();})
      .then(data=>{if(active)setSectorPrice(data);})
      .catch(()=>{if(active)setSectorPrice({subtotal:0,monthly:0,yearly:0,needsCustomQuote:true,items:[]});});
    return()=>{active=false;};
  },[selectedSector,sectorAddonCodes]);
  useEffect(()=>{
    let active=true;
    fetch("/api/customer/auth/me",{credentials:"include",cache:"no-store"})
      .then(async response=>response.ok?response.json():null)
      .then(result=>{
        if(!active||!result?.customer)return;
        setCustomerSignedIn(true);
        setCustomer(existing=>({...existing,name:existing.name||result.customer.name,email:result.customer.email}));
      }).catch(()=>undefined);
    return()=>{active=false};
  },[]);
  const localPackageFor = (backendId: string) => packages.find((item) => backendPackageIds[item.id] === backendId);
  const apiOverrides = apiCatalog.packages.map((backend) => {
    const local = localPackageFor(backend.id);
    return { id: local?.id ?? backend.id, name: backend.name, price: backend.is_custom_quote || local?.price === null ? null : Number(backend.price), description: backend.description };
  });
  const visiblePackages = catalogStatus === "ready" ? apiCatalog.packages.map((backend) => {
    const local = localPackageFor(backend.id);
    return {
      id: local?.id ?? backend.id,
      name: backend.name,
      short: backend.tagline || local?.short || "باقة ATSH AI",
      description: backend.description,
      price: backend.is_custom_quote || local?.price === null ? null : Number(backend.price),
      includedPages: local?.includedPages ?? null,
      features: backend.features ?? local?.features ?? [],
      recommended: backend.is_featured || (local?.recommended ?? false)
    };
  }) : packages;
  const selectedBackendPackageId = packageId ? backendPackageIds[packageId] ?? packageId : undefined;
  const selectedServerPackage = selectedBackendPackageId ? apiCatalog.packages.find((item) => item.id === selectedBackendPackageId) : undefined;
  const serverOptions = apiCatalog.options.filter((option) => option.package_id === selectedServerPackage?.id);
  const customerSelectedOptionCodes = [
    ...(bilingual ? ["language"] : []),
    ...(identity === "provided" ? [] : [identity]),
    ...(content === "writing" ? ["writing"] : []),
    ...addons,
    ...(hosting ? ["hosting"] : []),
    ...(hosting && domain !== "none" ? [`domain_${domain}`] : []),
    ...(maintenance ? ["maintenance"] : [])
  ];
  const selectedOptionCodes = [...new Set([...customerSelectedOptionCodes, ...serverOptions.filter((option) => option.is_required).map((option) => option.code)])];
  const selectedConfiguredOptions = selectedOptionCodes.map((code) => serverOptions.find((option) => option.code === code));
  const selectedExtraOptions = serverOptions.filter((option) => !builtInOptionCodes.has(option.code) && (option.is_required || selectedExtraOptionIds.includes(option.id)));
  const selectedServerOptions = Array.from(new Map([...serverOptions.filter((option) => option.is_required), ...selectedConfiguredOptions.filter((option): option is BackendOption => Boolean(option)), ...selectedExtraOptions].map((option) => [option.id, option])).values());
  const requiredOptionsNotIncludedInQuote = serverOptions.filter((option) => option.is_required && !customerSelectedOptionCodes.includes(option.code));
  const extraQuoteOptions = [...selectedExtraOptions, ...requiredOptionsNotIncludedInQuote.filter((option) => !selectedExtraOptions.some((selected) => selected.id === option.id))].map((option) => ({ id: option.id, name: option.name, price: Number(option.price), pricingType: option.pricing_type, unitLabel: option.unit_label }));
  const apiConfigured = catalogStatus === "ready" && Boolean(selectedServerPackage) && selectedConfiguredOptions.every(Boolean);
  const selectedPackageOptions = serverOptions.map((option) => ({ code: option.code, name: option.name, price: Number(option.price), pricingType: option.pricing_type }));
  const quote = useMemo(() => calculateQuote({ packageId, identity, content, addons, pages, bilingual, hosting, maintenance, domain }, apiOverrides, selectedPackageOptions, vatRate, extraQuoteOptions), [packageId, identity, content, addons, pages, bilingual, hosting, maintenance, domain, apiOverrides, selectedPackageOptions, vatRate, extraQuoteOptions]);
  const sectorSubtotal=selectedSector&&sectorPrice&&!sectorPrice.needsCustomQuote?sectorPrice.subtotal:0;
  const quoteSubtotal=quote.subtotal+sectorSubtotal;
  const quoteTax=quoteSubtotal*vatRate/100;
  const quoteTotal=quoteSubtotal+quoteTax;
  const quoteRecurring=quote.recurring+(sectorPrice?.yearly??0);
  const sectorNeedsQuote=Boolean(selectedSector&&(!sectorPrice||sectorPrice.needsCustomQuote));
  const selectedPackage = visiblePackages.find((item) => item.id === packageId);
  const includedPages = selectedPackage?.includedPages ?? 0;

  const begin = (id?: PackageId) => {
    if (id) {
      setPackageId(id);
      setPages(visiblePackages.find((item) => item.id === id)?.includedPages ?? 1);
      setSelectedExtraOptionIds([]);
    }
    setStep(0);
    document.getElementById("configurator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleAddon = (id: AddonId) => setAddons((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleExtraOption = (id: string) => setSelectedExtraOptionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateCustomer = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer((current) => ({ ...current, [event.target.name]: event.target.value }));
  const addInspiration = () => setInspirationLinks((current) => [...current, ""]);
  const setInspiration = (index: number, value: string) => setInspirationLinks((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));

  const downloadSummary = () => {
    const summary = [
      "طلب تقدير سعر — ATSH AI",
      `الباقة: ${selectedPackage?.name ?? "عرض مخصص"}`,
      `الصفحات المطلوبة: ${pages}`,
      `اللغات: ${bilingual ? "العربية والإنجليزية" : "العربية"}`,
      `الهوية: ${identityOptions.find((item) => item.id === identity)?.name ?? "شعار العميل"}`,
      `المحتوى: ${content === "writing" ? "كتابة محتوى" : "محتوى مقدم من العميل"}`,
      ...quote.items.map((item) => `${item.label}: ${formatEgp(item.amount)}${item.period ? ` / ${item.period}` : ""}`),
      ...(sectorPrice&&!sectorPrice.needsCustomQuote?sectorPrice.items.map(item=>`${item.name}: ${formatEgp(item.price)} / ${item.pricingType}`):[]),
      `المجموع قبل الضريبة: ${formatEgp(quoteSubtotal)}`,
      `ضريبة القيمة المضافة (${vatRate}%): ${formatEgp(quoteTax)}`,
      `إجمالي البنود المسعّرة: ${formatEgp(quoteTotal)}`,
      `مبلغ سنوي متكرر: ${formatEgp(quoteRecurring)}`,
      quote.needsCustomQuote ? "يتطلب الطلب مراجعة بنود مخصصة قبل اعتماد السعر النهائي." : "",
      `${copy("startDateLabel")}: ${startWindowLabel}`,
      customer.name ? `الاسم: ${customer.name}` : "",
      customer.company ? `الشركة: ${customer.company}` : "",
      customer.email ? `البريد: ${customer.email}` : "",
      customer.phone ? `الهاتف: ${customer.phone}` : "",
      customer.details ? `التفاصيل: ${customer.details}` : "",
    ].filter(Boolean).join("\n");
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "atsh-ai-quote.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!privacyAccepted) {
      setRequestState("error");
      setRequestMessage(copy("privacyRequiredMessage"));
      return;
    }
    setRequestState("sending");
    setRequestMessage("");
    try {
      if (!selectedServerPackage || selectedServerOptions.some((option) => !option)) throw new Error("تعذر مطابقة اختياراتك مع كتالوج الخادم. أعد تحميل الصفحة أو تواصل معنا.");
      const resolvedOptions = selectedServerOptions.filter((option): option is BackendOption => Boolean(option));
      const optionQuantities = Object.fromEntries(resolvedOptions.filter((option) => option.pricing_type === "per_page").map((option) => [option.id, pages]));
      const notes = [
        `الشركة: ${customer.company || "غير محدد"}`,
        `عدد الصفحات: ${pages}`,
        `اللغات: ${bilingual ? "العربية والإنجليزية" : "العربية"}`,
        `الهوية: ${identityOptions.find((item) => item.id === identity)?.name ?? "الشعار الحالي"}`,
        `المحتوى: ${content === "writing" ? "كتابة المحتوى" : "محتوى يقدمه العميل"}`,
        `الميزات: ${addons.map((id) => addonOptions.find((item) => item.id === id)?.name).filter(Boolean).join("، ") || "لا توجد"}`,
        `الاستضافة: ${hosting ? "مُدارة" : "بواسطة العميل"}`,
        `النطاق: ${domain === "none" ? "لدى العميل" : `.${domain}`}`,
        `الصيانة السنوية: ${maintenance ? "مطلوبة" : "غير مطلوبة"}`,
        `${copy("startDateLabel")}: ${startWindowLabel}`,
        `${copy("contactTimeLabel")}: ${contactWindowLabel}`,
        stylePreference ? `تفضيل التصميم: ${stylePreference}` : "",
        inspirationLinks.filter(Boolean).length ? `مراجع تصميم: ${inspirationLinks.filter(Boolean).join("، ")}` : "",
        customer.details ? `تفاصيل المشروع: ${customer.details}` : "",
        customer.compliance ? `اشتراطات: ${customer.compliance}` : "",
        logoName ? `اسم ملف الشعار المرفوع: ${logoName}` : "",
        quote.needsCustomQuote ? "يتطلب الطلب مراجعة فنية قبل اعتماد السعر النهائي." : ""
      ].filter(Boolean).join("\n").slice(0, 4000);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedServerPackage.id,
          optionIds: resolvedOptions.map((option) => option.id),
          optionQuantities,
          ...(selectedSector ? {sectorSlug:selectedSector.slug,sectorAddonCodes} : {}),
          customerName: customer.name,
          email: customer.email,
          phone: customer.phone,
          notes
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || "تعذر تسجيل الطلب الآن.");
      setRequestState("sent");
      setRequestMessage(`${copy("orderSuccessPrefix")} ${data.order?.reference ?? copy("orderSuccessFallback")}`);
    } catch (error) {
      setRequestState("error");
      setRequestMessage(error instanceof Error ? error.message : "تعذر تسجيل الطلب الآن.");
    }
  };

  const handleBuilderSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (step !== steps.length - 1) {
      event.preventDefault();
      return;
    }
    void submitRequest(event);
  };

  return (
    <main className="platform" dir="rtl" style={{ "--navy": siteConfig.theme?.navy, "--navy-2": siteConfig.theme?.blue, "--blue": siteConfig.theme?.blue, "--gold": siteConfig.theme?.gold, "--page": siteConfig.theme?.page, "--site-font": siteConfig.theme?.fontFamily ? `\"${siteConfig.theme.fontFamily}\", system-ui, sans-serif` : undefined, "--card-radius": siteConfig.theme?.cardRadius === undefined ? undefined : `${siteConfig.theme.cardRadius}px`, backgroundImage: siteConfig.theme?.backgroundImageUrl ? `linear-gradient(rgba(250,249,245,.94), rgba(250,249,245,.94)), url(${JSON.stringify(siteConfig.theme.backgroundImageUrl)})` : undefined, backgroundSize: siteConfig.theme?.backgroundImageUrl ? "cover" : undefined, backgroundAttachment: siteConfig.theme?.backgroundImageUrl ? "fixed" : undefined } as CSSProperties}>
      <Concierge />
      <header className="platform-header">
        <a className="platform-brand" href="#top" aria-label={copy("homeAriaLabel")}>
          <img src={siteConfig.theme?.logoUrl || "/images/atsh-logo.jpg"} alt={copy("logoAlt")} />
          <span><strong>ATSH <b>AI</b></strong><small>{copy("brandTagline")}</small></span>
        </a>
        <nav className="platform-nav" aria-label={copy("mainNavigationLabel")}>
          <a href="#why">{copy("navWhy")}</a><a href="#packages">{copy("navPackages")}</a><a href="#how">{copy("navHow")}</a><a href="#faq">{copy("navFaq")}</a>{pageLinks.map((item) => <a key={item.slug} href={`/${item.slug}`}>{item.title}</a>)}
        </nav>
        <div className="platform-header-actions"><a className="language-pill" href="#configurator">{copy("languageLabel")} <span>⌄</span></a><a className="button button-small" href="#configurator">{copy("navAction")} <span>←</span></a></div>
      </header>

      <section className="build-hero" id="top">
        <div className="build-hero-copy">
          <span className="eyebrow-pill">{copy("heroEyebrow")}</span>
          <h1>{copy("heroTitle")}</h1>
          <p>{copy("heroDescription")}</p>
          <div className="hero-actions"><button className="button" onClick={() => begin()}>{copy("ctaText")} <span>←</span></button><a className="button button-quiet" href="#packages">{copy("secondaryCta")}</a></div>
          <div className="hero-trust">{cardsFromContent("heroTrustItems", [1,2,3].map((n) => ({ id: `hero-trust-${n}`, title: copy(`heroTrust${n}`) }))).map((item, index) => <span key={item.id ?? index}>✓ {item.title}</span>)}</div>
        </div>
        <div className="build-hero-art">
          <img src={siteConfig.theme?.heroImageUrl || "/images/atsh-hero.jpg"} alt={copy("heroImageAlt")} />
          <div className="hero-art-caption"><span>ATSH AI</span><span>{copy("heroBrandLine")}</span></div>
          <div className="hero-price-card">
            <div className="price-card-top"><span className="status-dot" /> {copy("heroPriceLabel")}</div>
            <div className="price-preview-line"><span>{visiblePackages.find((item) => item.id === "multi")?.name ?? copy("priceSummaryPackageFallback")}</span><b>{formatEgp(visiblePackages.find((item) => item.id === "multi")?.price ?? 2500)}</b></div>
            <div className="price-preview-line"><span>{copy("heroIdentityLine")}</span><b>{formatEgp(3500)}</b></div>
            <div className="price-preview-line"><span>{copy("heroHostingLine")}</span><b>{formatEgp(600)} / {copy("yearUnit")}</b></div>
            <div className="price-preview-total"><span>{copy("heroTotalLabel")} {vatRate}%</span><strong>{formatEgp(((visiblePackages.find((item) => item.id === "multi")?.price ?? 2500) + 3500 + 600) * (1 + vatRate / 100))}</strong></div>
            <small>{copy("heroPriceFootnote")}</small>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label={copy("trustStripLabel")}>{trustItems.filter((item) => item.title).map((item, index) => <span key={item.id ?? index}>✓ {item.title}</span>)}</section>

      {activeCustomSections(contentData.sections).map((section) => <CustomSection key={section.id} section={section} />)}

      <section className="why-section" id="why">
        <div className="section-heading"><div><span className="section-kicker">{copy("whyKicker")}</span><h2>{copy("whyTitle")}</h2></div><p>{copy("whyDescription")}</p></div>
        <div className="benefit-grid">
          {benefitCards.map((item, index) => <article key={item.id ?? index}><span className="benefit-icon">{item.icon || String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading"><div><span className="section-kicker">{copy("howKicker")}</span><h2>{copy("howTitle")}</h2></div><p>{copy("howDescription")}</p></div>
        <div className="how-grid">{processCards.map((item, index) => <article key={item.id ?? index}><span>{item.icon || String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
      </section>

      <section className="packages-section" id="packages">
        <div className="section-heading"><div><span className="section-kicker">{copy("packagesKicker")}</span><h2>{copy("packagesTitle")}</h2></div><p>{copy("packagesDescription")}</p></div>
        <div className="package-grid">
          {visiblePackages.map((item) => <article key={item.id} className={item.recommended ? "package-card package-recommended" : "package-card"}>
            {item.recommended && <span className="popular-badge">{copy("featuredBadge")}</span>}
            <span className="package-kicker">{item.short}</span><h3>{item.name}</h3><p>{item.description}</p>
            <ul>{item.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
            <div className="package-price">{item.price === null ? <><strong>{copy("customQuoteLabel")}</strong><small>{copy("customQuoteDescription")}</small></> : <><strong>{copy("packagePricePrefix")} {formatEgp(item.price)}</strong><small>{copy("packagePriceFootnote")}</small></>}</div>
            <button className={item.recommended ? "button package-cta" : "button button-outline package-cta"} onClick={() => begin(item.id as PackageId)}>{item.price === null ? copy("customQuoteButton") : copy("packageButton")} <span>←</span></button>
          </article>)}
        </div>
        <div className="comparison-wrap"><h3>{copy("comparisonTitle")}</h3><div className="comparison-scroll"><table className="comparison-table"><thead><tr><th>{copy("comparisonFeatureTitle")}</th>{visiblePackages.map((item) => <th key={item.id}>{item.name}</th>)}</tr></thead><tbody>
          {[...new Set(visiblePackages.flatMap((item) => item.features))].map((feature) => <tr key={feature}><th>{feature}</th>{visiblePackages.map((item) => <td key={item.id}>{item.features.includes(feature) ? "✓" : "—"}</td>)}</tr>)}
        </tbody></table></div></div>
      </section>

      <section className="configurator-section" id="configurator">
        {selectedSector && sectorPricedAddons.length>0 && <section style={{border:"1px solid #d5e1ef",background:"#fff",padding:16,borderRadius:12,marginBottom:14}}>
          <h3>إضافات خاصة بنظام {selectedSector.name}</h3>
          {sectorPricedAddons.map(option=><label key={option.code} style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"9px 0"}}>
            <span><input type="checkbox" checked={sectorAddonCodes.includes(option.code)} onChange={event=>setSectorAddonCodes(current=>event.target.checked?[...current,option.code]:current.filter(x=>x!==option.code))}/> {option.name}</span>
            <b>{formatEgp(option.price)} {option.pricingType==="monthly"?"/ شهري":option.pricingType==="yearly"?"/ سنوي":""}</b>
          </label>)}
        </section>}
        {selectedSector && <div role="status" style={{border:"1px solid #d5e1ef",borderRadius:12,padding:"12px 16px",margin:"18px 0",background:"#eef5fc",color:"#203958"}}>
          النموذج الذي اخترته: <strong>{selectedSector.name}</strong>. تُحسب أسعار القطاع والإضافات المنشورة من الخادم. {sectorNeedsQuote ? "تكلفة هذا النظام تحتاج اعتماد عرض مخصص قبل الشراء." : `تكلفة قطاعك وإضافاته: ${formatEgp(sectorSubtotal)}.`}
        </div>}
        <div className="section-heading configurator-title"><div><span className="section-kicker">{copy("configuratorKicker")}</span><h2>{copy("configuratorTitle")}</h2></div><p>{copy("configuratorDescription")}</p></div>
        <div className="builder-layout">
          <div className="builder-main">
            <div className="stepper" aria-label={`الخطوة ${step + 1} من ${steps.length}`}>
              {steps.map((label, index) => <button key={label} className={index === step ? "stepper-item current" : index < step ? "stepper-item done" : "stepper-item"} onClick={() => index <= step && setStep(index)} disabled={index > step} aria-current={index === step ? "step" : undefined}>
                <span className="stepper-number">{index < step ? "✓" : index + 1}</span><span>{label}</span>
              </button>)}
            </div>
            <form className="builder-card" onSubmit={handleBuilderSubmit}>
              <div className="builder-step-heading"><span>{copy("stepCountLabel")} {step + 1} {copy("stepCountOf")} {steps.length}</span><h3>{steps[step]}</h3><p>{copy(`stepDesc${step}`)}</p></div>

              {step === 0 && <div className="option-grid package-option-grid">
                {visiblePackages.map((item) => <button type="button" key={item.id} className={packageId === item.id ? "select-card selected" : "select-card"} onClick={() => { setPackageId(item.id); setPages(item.includedPages ?? 5); setSelectedExtraOptionIds([]); }}>
                  <span className="select-mark">{packageId === item.id ? "✓" : "+"}</span><span className="select-card-copy"><strong>{item.name}</strong><small>{item.description}</small><b>{item.price === null ? copy("packageReviewPrice") : `${copy("packageStartPrice")} ${formatEgp(item.price)}`}</b></span><span className="included-chip">{copy("packageIncludedBenefits")}</span>
                </button>)}
              </div>}

              {step === 1 && <div className="form-stack">
                <label className="field-label">{copy("requestedPagesLabel")}<input type="number" min="1" max="50" value={pages} onChange={(event) => setPages(Math.max(1, Number(event.target.value) || 1))} /></label>
                <p className="field-hint">{includedPages ? `${copy("includedPagesLead")} ${includedPages} ${copy(includedPages === 1 ? "includedOnePage" : "includedManyPages")}.` : copy("scopeReviewText")} {copy("extraPagesReviewText")}</p>
                <div className="choice-row"><div><strong>{copy("languageChoiceTitle")}</strong><small>{copy("languageIncluded")}</small></div><div className="choice-toggle"><button type="button" className={!bilingual ? "selected" : ""} onClick={() => setBilingual(false)}>{copy("languageArabic")}</button><button type="button" className={bilingual ? "selected" : ""} onClick={() => setBilingual(true)}>{copy("languageBilingual")} <b>+{formatEgp(Number(serverOptions.find((option) => option.code === "language")?.price ?? 900))}</b></button></div></div>
                <label className="field-label">{copy("colorPreferenceLabel")}<textarea value={stylePreference} onChange={(event) => setStylePreference(event.target.value)} placeholder={copy("colorPreferencePlaceholder")} rows={3} /></label>
                <div className="field-label">{copy("inspirationLabel")} <small>{copy("optionalLabel")}</small>{inspirationLinks.map((link, index) => <input key={index} value={link} onChange={(event) => setInspiration(index, event.target.value)} placeholder={copy("inspirationPlaceholder")} type="url" />)}<button type="button" className="inline-add" onClick={addInspiration}>{copy("addLink")}</button></div>
              </div>}

              {step === 2 && <div className="option-grid">
                {identityOptions.map((item) => { const configured = serverOptions.find((option) => option.code === item.id); const itemName = configured?.name ?? item.name; const itemDescription = configured?.description || item.description; const itemPrice = configured ? Number(configured.price) : item.price; return <button type="button" key={item.id} className={identity === item.id ? "select-card selected" : "select-card"} onClick={() => setIdentity(item.id)}><span className="select-mark">{identity === item.id ? "✓" : "+"}</span><span className="select-card-copy"><strong>{itemName}</strong><small>{itemDescription}</small><b>{itemPrice ? `+${formatEgp(itemPrice)}` : "ضمن الباقة"}</b></span></button>; })}
                {identity === "provided" && <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={(event) => setLogoName(event.target.files?.[0]?.name ?? "")} /><span className="upload-icon">↑</span><strong>{logoName || copy("logoUploadLabel")}</strong><small>{copy("logoUploadFormats")}</small></label>}
              </div>}

              {step === 3 && <div className="form-stack">
                <div className="choice-row"><div><strong>{copy("contentWritingTitle")}</strong><small>{copy("contentIncluded")}</small></div><div className="choice-toggle"><button type="button" className={content === "provided" ? "selected" : ""} onClick={() => setContent("provided")}>{copy("provideContent")}</button><button type="button" className={content === "writing" ? "selected" : ""} onClick={() => setContent("writing")}>{copy("requestWriting")} <b>+{formatEgp(250)} {copy("perPageSuffix")}</b></button></div></div>
                <h4 className="subsection-title">{copy("addonsTitle")}</h4>
                <div className="option-grid addon-grid">{addonOptions.map((item) => { const configured = serverOptions.find((option) => option.code === item.id); return <button type="button" key={item.id} className={addons.includes(item.id) ? "select-card selected" : "select-card"} onClick={() => toggleAddon(item.id)}><span className="select-mark">{addons.includes(item.id) ? "✓" : "+"}</span><span className="select-card-copy"><strong>{configured?.name ?? item.name}</strong><small>{configured?.description || item.description}</small><b>+{formatEgp(Number(configured?.price ?? item.price))}</b></span></button>; })}</div>
                {serverOptions.some((option) => !builtInOptionCodes.has(option.code)) && <><h4 className="subsection-title">{copy("extraOptionsTitle")}</h4><div className="option-grid addon-grid">{serverOptions.filter((option) => !builtInOptionCodes.has(option.code)).map((option) => { const selected = option.is_required || selectedExtraOptionIds.includes(option.id); return <button type="button" key={option.id} disabled={option.is_required} className={selected ? "select-card selected" : "select-card"} onClick={() => toggleExtraOption(option.id)}><span className="select-mark">{selected ? "✓" : "+"}</span><span className="select-card-copy"><strong>{option.name}{option.is_required ? copy("requiredSuffix") : ""}</strong><small>{option.description || copy("extraOptionFallback")}</small><b>+{formatEgp(Number(option.price))}{option.pricing_type === "yearly" ? ` / ${copy("yearUnit")}` : option.pricing_type === "monthly" ? ` / ${copy("monthUnit")}` : option.pricing_type === "per_page" ? ` / ${copy("pageUnit")}` : ""}</b></span></button>; })}</div></>}
              </div>}

              {step === 4 && <div className="form-stack">
                <div className="hosting-callout"><span className="hosting-icon">✓</span><div><strong>{copy("hostingCalloutTitle")}</strong><p>{copy("hostingCalloutText")}</p></div></div>
                <button type="button" className={hosting ? "select-card selected" : "select-card"} onClick={() => setHosting((value) => !value)}><span className="select-mark">{hosting ? "✓" : "+"}</span><span className="select-card-copy"><strong>{serverOptions.find((option) => option.code === "hosting")?.name ?? copy("hostingOptionTitle")}</strong><small>{serverOptions.find((option) => option.code === "hosting")?.description || copy("hostingOptionDescription")}</small><b>+{formatEgp(Number(serverOptions.find((option) => option.code === "hosting")?.price ?? 600))} / {copy("yearUnit")}</b></span></button>
                <div className="field-label">{copy("domainLabel")} <div className="choice-toggle domain-choice"><button type="button" className={domain === "com" ? "selected" : ""} onClick={() => setDomain("com")}>{copy("domainComLabel")} <small>{hosting ? copy("domainIncluded") : copy("domainOnDemand")}</small></button><button type="button" className={domain === "eg" ? "selected" : ""} onClick={() => setDomain("eg")}>{copy("domainEgLabel")} <small>{hosting ? copy("domainIncluded") : copy("domainOnDemand")}</small></button><button type="button" className={domain === "none" ? "selected" : ""} onClick={() => setDomain("none")}>{copy("domainOwn")}</button></div></div>
                <button type="button" className={maintenance ? "select-card selected" : "select-card"} onClick={() => setMaintenance((value) => !value)}><span className="select-mark">{maintenance ? "✓" : "+"}</span><span className="select-card-copy"><strong>{serverOptions.find((option) => option.code === "maintenance")?.name ?? copy("maintenanceTitle")}</strong><small>{serverOptions.find((option) => option.code === "maintenance")?.description || copy("maintenanceDescription")}</small><b>+{formatEgp(Number(serverOptions.find((option) => option.code === "maintenance")?.price ?? 3600))} / {copy("yearUnit")}</b></span></button>
              </div>}

              {step === 5 && <div className="form-stack customer-fields">
                <label className="field-label">{copy("fullNameLabel")}<input name="name" required autoComplete="name" value={customer.name} onChange={updateCustomer} placeholder={copy("fullNamePlaceholder")} /></label>
                <label className="field-label">{copy("companyNameLabel")}<input name="company" autoComplete="organization" value={customer.company} onChange={updateCustomer} placeholder={copy("companyPlaceholder")} /></label>
                <label className="field-label">{copy("customerEmailLabel")}<input type="email" name="email" required autoComplete="email" value={customer.email} onChange={updateCustomer} placeholder={copy("emailPlaceholder")} /></label>
                <label className="field-label">{copy("customerPhoneLabel")}<input type="tel" name="phone" required autoComplete="tel" value={customer.phone} onChange={updateCustomer} placeholder={copy("customerPhonePlaceholder")} /></label>
                <p className="field-hint">{copy("privacyHint")}</p>
              </div>}

              {step === 6 && <div className="form-stack">
                <label className="field-label">{copy("startDateLabel")}<select value={startWindow} onChange={(event) => setStartWindow(event.target.value)}><option value="soon">{copy("startSoon")}</option><option value="month">{copy("startInMonth")}</option><option value="twoMonths">{copy("startInTwoMonths")}</option><option value="exploring">{copy("startExploring")}</option></select></label>
                <label className="field-label">{copy("contactTimeLabel")}<select value={contactWindow} onChange={(event) => setContactWindow(event.target.value)}><option value="anytime">{copy("contactAnytime")}</option><option value="morning">{copy("contactMorning")}</option><option value="afternoon">{copy("contactAfternoon")}</option><option value="evening">{copy("contactEvening")}</option></select></label>
                <label className="field-label">{copy("projectRequirementsLabel")}<textarea name="details" value={customer.details} onChange={updateCustomer} rows={4} placeholder={copy("projectRequirementsPlaceholder")} /></label>
                <label className="field-label">{copy("complianceLabel")}<textarea name="compliance" value={customer.compliance} onChange={updateCustomer} rows={3} placeholder={copy("compliancePlaceholder")} /></label>
                <label className="check-row"><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} /><span>{copy("privacyConsent")}</span></label>
              </div>}

              {step === 7 && <div className="review-screen">
                <div className="review-callout"><strong>{quote.needsCustomQuote ? copy("reviewNeedsCustomTitle") : copy("reviewReadyTitle")}</strong><p>{quote.needsCustomQuote ? copy("reviewCustomDescription") : copy("reviewStandardDescription")}</p></div>
                <div className="review-section"><h4>{copy("reviewInfoTitle")}</h4><div className="review-detail"><span>{copy("reviewPackageLabel")}</span><b>{selectedPackage?.name ?? copy("customQuoteLabel")}</b></div><div className="review-detail"><span>{copy("reviewPagesLabel")}</span><b>{pages} {copy(pages === 1 ? "pageSingular" : "pagePlural")}</b></div><div className="review-detail"><span>{copy("reviewLanguageLabel")}</span><b>{bilingual ? copy("languageBilingual") : copy("languageArabic")}</b></div><div className="review-detail"><span>{copy("reviewIdentityLabel")}</span><b>{identityOptions.find((item) => item.id === identity)?.name}</b></div><div className="review-detail"><span>{copy("reviewStartLabel")}</span><b>{startWindowLabel}</b></div></div>
                {sectorNeedsQuote&&<p className="api-notice">تكلفة القطاع غير معتمدة، لا يمكن تسجيل شراء بهذه القيمة الجزئية.</p>}
                <div className="review-section"><h4>{copy("reviewPriceTitle")}</h4>{sectorPrice&&!sectorPrice.needsCustomQuote&&sectorPrice.items.map(item=><div key={item.code} className="review-detail"><span>{item.name} · {item.pricingType==="yearly"?"سنوي":item.pricingType==="monthly"?"شهري":"مرة واحدة"}</span><b>{formatEgp(item.price)}</b></div>)}{quote.items.map((item) => <div key={item.id} className="review-detail"><span>{item.label}{item.period ? ` · ${item.period}` : ""}</span><b>{formatEgp(item.amount)}</b></div>)}<div className="review-detail review-subtotal"><span>{copy("reviewSubtotal")}</span><b>{formatEgp(quote.subtotal)}</b></div><div className="review-detail"><span>{copy("reviewTax")} {vatRate}%</span><b>{formatEgp(quote.tax)}</b></div><div className="review-total"><span>{copy("reviewTotal")}</span><strong>{formatEgp(quoteTotal)}</strong></div><div className="review-detail recurring-row"><span>{copy("recurringFees")}</span><b>{formatEgp(quoteRecurring)}</b></div></div>
                <div className="review-section"><h4>{copy("reviewContactTitle")}</h4><div className="review-detail"><span>{copy("fullNameLabel")}</span><b>{customer.name || "—"}</b></div><div className="review-detail"><span>{copy("customerEmailLabel")}</span><b>{customer.email || "—"}</b></div><div className="review-detail"><span>{copy("customerPhoneLabel")}</span><b>{customer.phone || "—"}</b></div></div>
                {!customerSignedIn&&<p className="api-notice">لإكمال رحلة المعاينة الشخصية والعقد وتسليم المشروع، <a href="/account/login" style={{textDecoration:"underline",fontWeight:700}}>سجّل الدخول</a> أو <a href="/account/register" style={{textDecoration:"underline",fontWeight:700}}>افتح حسابًا</a>. اختياراتك محفوظة مؤقتًا على هذا المتصفح لنقلها إلى حسابك بموافقتك.</p>}
                <div className="review-actions"><button type="button" className="button button-outline" onClick={downloadSummary}>{copy("downloadSummaryButton")}</button><button className="button" type="submit" disabled={!apiConfigured || sectorNeedsQuote || requestState === "sending" || !customer.name || !customer.email || !customer.phone || !privacyAccepted}>{requestState === "sending" ? copy("sendingRequest") : copy("submitRequestButton")}<span>←</span></button></div>
                {!apiConfigured && <p className="api-notice">{catalogStatus === "loading" ? copy("loadingCatalogMessage") : catalogStatus === "unavailable" ? copy("unavailableCatalogMessage") : copy("catalogMismatchMessage")}</p>}
                {requestMessage && <p className={requestState === "sent" ? "success-message" : "error-message"} role="status">{requestMessage}</p>}
              </div>}

              <div className="builder-controls"><button type="button" className="button button-outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>{copy("previousStep")}</button><span>{step + 1} / {steps.length}</span>{step < steps.length - 1 ? <button type="button" className="button" onClick={() => { if (step === 0 && !packageId) return; if (step === 5 && (!customer.name || !customer.email || !customer.phone)) return; setStep((current) => Math.min(steps.length - 1, current + 1)); }} disabled={(step === 0 && !packageId) || (step === 5 && (!customer.name || !customer.email || !customer.phone))}>{copy("nextStep")} <span>←</span></button> : <button type="button" className="button button-outline" onClick={() => setStep(0)}>{copy("editChoices")}</button>}</div>
            </form>
          </div>
          <aside className="quote-sidebar">
            <div className="quote-summary-card">
              <div className="summary-heading"><div><span className="section-kicker">{copy("quoteSummaryKicker")}</span><h3>{copy("quoteSummaryTitle")}</h3></div><span className="summary-status">{packageId ? copy("quoteConfiguring") : copy("quoteStartSelecting")}</span></div>
              <div className="included-banner">✦ 3 تصاميم و5 اتجاهات لونية مشمولة</div>
              {!packageId ? <p className="empty-summary">{copy("quoteEmpty")}</p> : <>
                <div className="summary-lines">{sectorPrice&&!sectorPrice.needsCustomQuote&&sectorPrice.items.map(item=><div className="summary-line" key={item.code}><span>{item.name}<small>{item.pricingType==="yearly"?"سنوي":item.pricingType==="monthly"?"شهري":"مرة واحدة"}</small></span><b>{formatEgp(item.price)}</b></div>)}{quote.items.map((item) => <div className="summary-line" key={item.id}><span>{item.label}{item.period ? <small>{item.period}</small> : null}</span><b>{formatEgp(item.amount)}</b></div>)}</div>
                <div className="summary-math"><div><span>{copy("reviewSubtotal")}</span><b>{formatEgp(quote.subtotal)}</b></div><div><span>{copy("reviewTax")} ({vatRate}%)</span><b>{formatEgp(quote.tax)}</b></div><div className="summary-grand"><span>{copy("reviewTotal")}</span><strong>{formatEgp(quote.total)}</strong></div></div>
                <div className="summary-annual"><span>{copy("quoteRecurring")}</span><b>{formatEgp(quote.recurring)}</b></div>
                {(quote.needsCustomQuote||sectorNeedsQuote) && <p className="custom-quote-note">{copy("quoteCustomNote")}</p>}
              </>}
              <p className="summary-footnote">{copy("quoteFootnote")}</p>
            </div>
            <div className="support-card"><span className="support-mark">?</span><div><strong>{copy("supportTitle")}</strong><p>{copy("supportDescription")}</p></div><a href="mailto:support@atsh-ai.com">{copy("supportEmail")} <span>↗</span></a><a href="#faq">{copy("supportFaq")} <span>←</span></a></div>
          </aside>
        </div>
      </section>

      <section className="faq-section" id="faq"><div className="section-heading"><div><span className="section-kicker">{copy("faqKicker")}</span><h2>{copy("faqTitle")}</h2></div><p>{copy("faqDescription")}</p></div><div className="faq-list">{faqItems.map((item, index) => <article key={item.id ?? index} className={openFaq === index ? "faq-item open" : "faq-item"}><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span className="faq-num">0{index + 1}</span><strong>{item.title}</strong><span className="faq-toggle">{openFaq === index ? "−" : "+"}</span></button>{openFaq === index && <p>{item.description}</p>}</article>)}</div></section>

      <section className="final-cta"><div><span className="section-kicker">{copy("finalKicker")}</span><h2>{copy("finalTitle")}</h2><p>{copy("finalDescription")}</p></div><button className="button" onClick={() => begin()}>{copy("finalCta")} <span>←</span></button></section>
      <footer className="platform-footer"><a className="platform-brand" href="#top"><img src={siteConfig.theme?.logoUrl || "/images/atsh-logo.jpg"} alt="" /><span><strong>ATSH <b>AI</b></strong><small>{copy("footerTagline")}</small></span></a>{pageLinks.map((item) => <a key={item.slug} href={`/${item.slug}`}>{item.title}</a>)}<a href={`mailto:${copy("footerInfoEmail")}`}>{copy("footerInfoLabel")}</a><a href={`mailto:${copy("footerSalesEmail")}`}>{copy("footerSalesLabel")}</a><a href={`mailto:${copy("footerSupportEmail")}`}>{copy("footerSupportLabel")}</a><span>{copy("copyrightPrefix")} {new Date().getFullYear()} ATSH AI</span><a href="/admin">{copy("footerAdminLabel")}</a><a href="#top">{copy("footerTopLabel")}</a></footer>
    </main>
  );
}

type CustomSectionData = { id: string; eyebrow: string; title: string; body: string; layout: "text" | "cards"; backgroundColor: string; textColor: string; columns: number; align: "right" | "center"; isVisible: boolean; cards: PublicCard[] };
function activeCustomSections(value: unknown): CustomSectionData[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    return {
      id: typeof item.id === "string" ? item.id : `section-${index + 1}`,
      eyebrow: typeof item.eyebrow === "string" ? item.eyebrow : "",
      title: typeof item.title === "string" ? item.title : "",
      body: typeof item.body === "string" ? item.body : "",
      layout: item.layout === "cards" ? "cards" as const : "text" as const,
      backgroundColor: typeof item.backgroundColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.backgroundColor) ? item.backgroundColor : "#ffffff",
      textColor: typeof item.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.textColor) ? item.textColor : "#26313f",
      columns: [2,3,4].includes(Number(item.columns)) ? Number(item.columns) : 3,
      align: item.align === "center" ? "center" as const : "right" as const,
      isVisible: item.isVisible !== false,
      cards: Array.isArray(item.cards) ? item.cards as PublicCard[] : []
    };
  }).filter((item) => item.isVisible);
}

function CustomSection({ section }: { section: CustomSectionData }) {
  const safeImage = (value?: string) => {
    if (!value) return "";
    if (/^\/(?!\/)[A-Za-z0-9/_?&=#.%:+-]*$/.test(value)) return value;
    try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
  };
  const safeHref = (value?: string) => {
    if (!value) return "";
    if (/^\/(?!\/)|^#[A-Za-z0-9_-]+$/.test(value)) return value;
    return safeImage(value);
  };
  return <section className="custom-content-section" id={section.id} style={{ backgroundColor: section.backgroundColor, color: section.textColor, textAlign: section.align }}>
    {section.eyebrow && <span className="section-kicker">{section.eyebrow}</span>}{section.title && <h2>{section.title}</h2>}{section.body && <p>{section.body}</p>}
    {section.layout === "cards" && <div className="custom-content-grid" style={{ gridTemplateColumns: `repeat(${section.columns},minmax(0,1fr))` }}>{section.cards.map((card, index) => {
      const image = safeImage(card.imageUrl), href = safeHref(card.href);
      return <article className="custom-content-card" key={card.id ?? index}>{image && <img src={image} alt="" />}{card.title && <h3>{card.title}</h3>}{card.description && <p>{card.description}</p>}{href && card.linkLabel && <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{card.linkLabel} ←</a>}</article>;
    })}</div>}
  </section>;
}
