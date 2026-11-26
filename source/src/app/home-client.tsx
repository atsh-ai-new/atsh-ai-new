"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import { addonOptions, calculateQuote, formatEgp, identityOptions, packages, type AddonId, type ContentId, type DomainId, type IdentityId, type PackageId } from "@/lib/catalog";
import { siteCopyDefaults } from "@/lib/site-copy";
import { readPagePreview } from "@/lib/page-preview";
import { siteCopyEn, englishPackages, englishOptions, englishPrice } from "@/lib/site-copy-en";
import { findSector } from "@/lib/sector-catalog";
import { loadGuestWorkspace, loadAccountWorkspace, saveGuestWorkspace } from "@/lib/customer-workspace";
import {normalizeCatalogSectors,resolvePlacement} from "@/lib/catalog-sectors";
import SystemThumbnail from "@/components/system-thumbnail";
import AddonPrice from "@/components/addon-price";
import AddonGroups from "@/components/addon-groups";
import type {CategorizedAddon} from "@/lib/addon-categories";
import DomainLookup from "@/components/domain-lookup";
import HomeCatalogShowcase, {type HomeCatalogItem} from "@/components/home-catalog-showcase";
import { combinedQuoteSummary } from "@/lib/quote-breakdown";

type Customer = { name: string; company: string; email: string; phone: string; details: string; compliance: string };
type BackendPackage = { ownershipPrices?:import("@/components/ownership-selector").OwnershipPrices|null; list_price?:number|string;discount_percent?:number|string; id: string; name: string; tagline: string; description: string; price: number | string; currency: string; features: string[]; is_featured: boolean; is_custom_quote: boolean };
type BackendOption = CategorizedAddon & {list_price?:number|string;discount_percent?:number|string; id: string; package_id: string; code: string; name: string; description: string; price: number | string; pricing_type: string; unit_label: string; is_required: boolean; visibility?: "both" | "packages" | "systems" };
type BackendCatalog = { packages: BackendPackage[]; options: BackendOption[]; sharedOptions?:BackendOption[] };
type SiteConfig = { page?: { content?: Record<string, unknown> } | null; theme?: { navy: string; blue: string; gold: string; page: string; logoUrl?: string; heroImageUrl?: string; backgroundImageUrl?: string; fontFamily?: string; cardRadius?: number } | null; vatRate?: number };
type PageLink = { slug: string; title: string };
type PublicCard = { id?: string; title?: string; description?: string; imageUrl?: string; href?: string; linkLabel?: string; icon?: string };
const backendPackageIds: Record<string, string> = {
  landing: "11111111-1111-4111-8111-111111111111",
  multi: "22222222-2222-4222-8222-222222222222",
  dynamic: "33333333-3333-4333-8333-333333333333",
  enterprise: "44444444-4444-4444-8444-444444444444"
};
const obsoleteIdentityOptionCodes = new Set(["logo_design", "visual_identity"]);
const builtInOptionCodes = new Set(["language", "logo", "brand", "writing", "seo", "booking", "contact", "analytics", "extra_page", "hosting", "domain_com", "domain_eg", "maintenance"]);

function FeaturedLiveDemo({item,base,assetId}:{item:HomeCatalogItem;base:string;assetId?:string}){
 return <a href={base+"/catalog/"+encodeURIComponent(item.slug)+"?fullscreen=1&featuredHome=1"} style={{display:"block",overflow:"hidden",borderRadius:10}}>
 <SystemThumbnail slug={item.slug} name={item.name} assetId={assetId||item.previewAssetId} imageUrl={item.imageUrl}/>
 </a>;
}
export default function HomePage({locale="ar",configuratorOnly=false,pricingOnly=false}:{locale?:"ar"|"en";configuratorOnly?:boolean;pricingOnly?:boolean}) {
  const isEnglish=locale==="en";
  const groupedPricing=pricingOnly||!configuratorOnly;
  const money=(value:number)=>isEnglish?englishPrice(value):formatEgp(value);
  const localizeOption=(code:string,original:string,type:"name"|"description"="name")=>isEnglish?(englishOptions[code]?.[type] || (type==="name" ? original : "Available on request")):original;
  const localizePackage=(id:string,original:string,type:"name"|"short"|"description")=>isEnglish?(englishPackages[id]?.[type] || original):original;
  const t=(ar:string,en:string)=>isEnglish?en:ar;
  const [showOtherDetails,setShowOtherDetails]=useState(false);
  const [signedInCustomerName,setSignedInCustomerName]=useState("");
  const [sessionEnding,setSessionEnding]=useState(false);
  const [sessionEndError,setSessionEndError]=useState("");
  const [step, setStep] = useState(1);
  const [showConfigurator,setShowConfigurator]=useState(configuratorOnly);
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
  const [domain, setDomain] = useState<DomainId>("none");
  const [requestedDomainName,setRequestedDomainName]=useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [startWindow, setStartWindow] = useState("month");
  const [contactWindow, setContactWindow] = useState("anytime");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [customer, setCustomer] = useState<Customer>({ name: "", company: "", email: "", phone: "", details: "", compliance: "" });
  const [customerSignedIn,setCustomerSignedIn]=useState(false);
  const [selectedProjectDraftId,setSelectedProjectDraftId]=useState<string|null>(null);
  const submitRequestInFlight=useRef(false);
  const orderSubmissionKey=useRef<{key:string;payload:string}|null>(null);
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [requestMessage, setRequestMessage] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [apiCatalog, setApiCatalog] = useState<BackendCatalog>({ packages: [], options: [] });
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({});
  // Arabic published content is the visibility reference for the English homepage.
  const [arabicReference, setArabicReference] = useState<Record<string, unknown> | null>(null);
  const [featuredSystems,setFeaturedSystems]=useState<HomeCatalogItem[]>([]);
  useEffect(()=>{let live=true;void Promise.all([fetch("/api/site-content/catalog?locale=ar&metadata=1",{cache:"no-store"}).then(r=>r.ok?r.json():null),isEnglish?fetch("/api/site-content/catalog?locale=en&metadata=1",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null)]).then(([ar,en])=>{if(!live)return;const content=ar?.page?.content;const sectors=normalizeCatalogSectors(content?.sectors);const translated=new Map<string,HomeCatalogItem>((en?.page?.content?.items??[]).map((x:HomeCatalogItem)=>[x.slug,x]));setFeaturedSystems((Array.isArray(content?.items)?content.items:[]).filter((x:HomeCatalogItem)=>{if(!x||!x.slug||x.published===false||x.archived)return false;const p=resolvePlacement(x,sectors);return p.sector?.isPublished&&p.subcategory?.isPublished!==false;}).map((x:HomeCatalogItem)=>({...x,name:translated.get(x.slug)?.name||x.name,description:translated.get(x.slug)?.description||x.description})));}).catch(()=>{});return()=>{live=false;};},[isEnglish]);
  const [pageLinks, setPageLinks] = useState<PageLink[]>([]);
  const [selectedSector, setSelectedSector] = useState<{ slug: string; name: string } | null>(null);
  const [sectorPricedAddons,setSectorPricedAddons]=useState<Array<{code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"}>>([]);
  const [sectorAddonCodes,setSectorAddonCodes]=useState<string[]>([]);
  const [sectorAddonQuantities,setSectorAddonQuantities]=useState<Record<string,number>>({});
  const [sectorPrice,setSectorPrice]=useState<{subtotal:number;monthly:number;yearly:number;needsCustomQuote:boolean;items:Array<{code:string;name:string;price:number;pricingType:"fixed"|"monthly"|"yearly"}>}|null>(null);
  const copy=(key:string)=>{const content=siteConfig.page?.content;const value=content?.[key];if(isEnglish && arabicReference && Object.prototype.hasOwnProperty.call(arabicReference,key) && arabicReference[key] === "")return "";if(typeof value==="string")return value;return isEnglish ? siteCopyEn[key] ?? "" : siteCopyDefaults[key] ?? "";};
  const steps = Array.from({ length: 8 }, (_, index) => copy(`stepper${index}`));
  const startWindowLabel = ({ soon: copy("startSoon"), month: copy("startInMonth"), twoMonths: copy("startInTwoMonths"), exploring: copy("startExploring") } as Record<string, string>)[startWindow] ?? copy("startInMonth");
  const contactWindowLabel = ({ anytime: copy("contactAnytime"), morning: copy("contactMorning"), afternoon: copy("contactAfternoon"), evening: copy("contactEvening") } as Record<string, string>)[contactWindow] ?? copy("contactAnytime");
  const contentData = siteConfig.page?.content ?? {};
  const cardsFromContent = (key: string, fallback: PublicCard[]): PublicCard[] => {const reference=arabicReference?.[key];const source=Array.isArray(contentData[key]) ? contentData[key] as PublicCard[] : fallback;const visibleIds=isEnglish && Array.isArray(reference) ? new Set(reference.filter((item):item is PublicCard=>!!item && typeof item==="object").map(item=>item.id).filter(Boolean)) : null;return source.filter((item)=>item && typeof item.title==="string" && item.title.trim().length>0 && (!visibleIds || (item.id && visibleIds.has(item.id))));};
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
      const preview=readPagePreview("home",locale);
      const offerings=preview?.content?.previewOfferings as BackendCatalog|undefined;
      const visible=offerings&&Array.isArray(offerings.packages)&&Array.isArray(offerings.options)?offerings:catalog;
      setApiCatalog(visible);
      setCatalogStatus("ready");
    }).catch(() => { if (active) setCatalogStatus("unavailable"); });
    if (isEnglish) fetch("/api/site-content/home?locale=ar&metadata=1", { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as SiteConfig : null).then((config)=>{if(active && config?.page?.content)setArabicReference(config.page.content);}).catch(()=>undefined);
    fetch(`/api/site-content/home?locale=${locale}&metadata=1`, { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as SiteConfig : null)
      .then((config) => { if (!active)return; const preview=readPagePreview("home",locale);if(preview)setSiteConfig({...config,page:{content:preview.content}});else if(config)setSiteConfig(config); }).catch(() => { const preview=readPagePreview("home",locale);if(active&&preview)setSiteConfig({page:{content:preview.content}}); });
    fetch(`/api/site-pages?locale=${locale}`, { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as { pages?: PageLink[] } : null)
      .then((result) => { if (active) setPageLinks((result?.pages ?? []).filter((item) => item.slug !== "home")); }).catch(() => undefined);
    return () => { active = false; };
  }, [locale]);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("sector");
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
    const builtin = findSector(slug);
    if (builtin) setSelectedSector({ slug, name: builtin.name });
    fetch("/api/site-content/catalog?metadata=1", { cache: "no-store" })
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

  const restoreAddonChoices=(options:unknown)=>{
    if(!Array.isArray(options))return;
    setAddons(addonOptions.filter(option=>options.includes(option.id)).map(option=>option.id));
    setSelectedExtraOptionIds([...new Set(options.filter((option):option is string=>typeof option==="string"))]);
  };
  useEffect(() => {
    let active=true;
    const guest=loadGuestWorkspace();
    const slug=new URLSearchParams(window.location.search).get("sector");
    if(!slug&&guest.sectorSlug&&guest.sectorName)setSelectedSector({slug:guest.sectorSlug,name:guest.sectorName});
    const requestedPackage=new URLSearchParams(window.location.search).get("package");
    if(configuratorOnly&&requestedPackage){setPackageId(requestedPackage);setPages(packages.find(item=>item.id===requestedPackage)?.includedPages??1);}
    else if(guest.packageId)setPackageId(guest.packageId);
    if(!requestedPackage||guest.packageId===requestedPackage)restoreAddonChoices(guest.options);
    if(Array.isArray(guest.sectorAddonCodes)&&(!slug||guest.sectorSlug===slug)){setSectorAddonCodes(guest.sectorAddonCodes);setSectorAddonQuantities(guest.sectorAddonQuantities??{});}
    // Account-owned draft is only read after authentication; never silently merge guest data into another account.
    if(!guest.sectorSlug&&!guest.packageId&&!slug){
      void loadAccountWorkspace().then(account=>{
        if(!active||!account)return;
        if(account.sectorSlug&&account.sectorName)setSelectedSector({slug:account.sectorSlug,name:account.sectorName});
        if(account.packageId)setPackageId(account.packageId);
        restoreAddonChoices(account.options);
        if(Array.isArray(account.sectorAddonCodes)){setSectorAddonCodes(account.sectorAddonCodes);setSectorAddonQuantities(account.sectorAddonQuantities??{});}
      }).catch(()=>undefined);
    }
    return()=>{active=false;};
  }, []);
  useEffect(() => {
    if (selectedSector) saveGuestWorkspace({sectorSlug:selectedSector.slug,sectorName:selectedSector.name,source:"catalog"});
  }, [selectedSector]);
  useEffect(() => {
    if (packageId) saveGuestWorkspace({packageId,source:"configurator"});
  }, [packageId]);
  useEffect(() => {
    if (!selectedSector){setSectorPrice(null);setSectorPricedAddons([]);return;}
    // Restore options when the visitor enters from a saved workspace, not just a URL.
    fetch("/api/site-content/catalog?metadata=1",{cache:"no-store"})
      .then(async r=>r.ok?r.json():null).then(data=>{
        const entry=(data?.page?.content?.items??[]).find((item:{slug?:string;published?:boolean;archived?:boolean})=>item.slug===selectedSector.slug&&item.published!==false&&!item.archived);
        setSectorPricedAddons(Array.isArray(entry?.pricedAddons)?entry.pricedAddons:[]);
      }).catch(()=>setSectorPricedAddons([]));
    let active=true;
    const params=new URLSearchParams({slug:selectedSector.slug});
    if(sectorAddonCodes.length)params.set("addons",sectorAddonCodes.join(","));
    params.set("quantities",JSON.stringify(sectorAddonQuantities));
    fetch(`/api/sector-price?${params}`,{cache:"no-store"})
      .then(async r=>{if(!r.ok)throw Error("Sector pricing unavailable");return r.json();})
      .then(data=>{if(active)setSectorPrice(data);})
      .catch(()=>{if(active)setSectorPrice({subtotal:0,monthly:0,yearly:0,needsCustomQuote:true,items:[]});});
    return()=>{active=false;};
  },[selectedSector,sectorAddonCodes,sectorAddonQuantities]);
  useEffect(()=>{
    let active=true;
    let retryTimer:ReturnType<typeof setTimeout>|undefined;
    let checking=false;
    let failures=0;
    const checkSession=async()=>{
      if(!active||checking)return;
      checking=true;
      try{
        const response=await fetch("/api/customer/auth/me",{credentials:"include",cache:"no-store"});
        if(!active)return;
        if(response.ok){
          const result=await response.json();
          if(!active||!result?.customer)return;
          failures=0;
          setCustomerSignedIn(true);
          setSignedInCustomerName(String(result.customer.name||"").trim());
          setCustomer(existing=>({...existing,name:existing.name||result.customer.name,email:result.customer.email}));
        }else if(response.status===401){
          failures=0;
          setCustomerSignedIn(false);
          setSignedInCustomerName("");
        }else{
          // 429/5xx/temporary proxy errors are not proof that the customer signed out.
          failures+=1;
          if(failures<=3)retryTimer=setTimeout(()=>{void checkSession();},Math.min(1000*2**failures,8000));
        }
      }catch{
        if(active&&++failures<=3)retryTimer=setTimeout(()=>{void checkSession();},Math.min(1000*2**failures,8000));
      }finally{checking=false;}
    };
    const onFocus=()=>{if(document.visibilityState==="visible"){failures=0;if(retryTimer)clearTimeout(retryTimer);void checkSession();}};
    void checkSession();
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onFocus);
    return()=>{active=false;if(retryTimer)clearTimeout(retryTimer);window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onFocus);};
  },[]);
  useEffect(()=>{
    const draftId=new URLSearchParams(window.location.search).get("draftId");
    if(!draftId||!/^[0-9a-f-]{36}$/i.test(draftId))return;
    let active=true;
    fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(draftId)}`,{credentials:"include",cache:"no-store"})
      .then(async response=>{if(!response.ok)throw Error("Draft unavailable");return response.json();})
      .then(result=>{
        if(!active)return;
        const draft=result.projectDraft?.draft;
        if(!draft)return;
        setSelectedProjectDraftId(draftId);
        // Resume the saved project at its add-ons, not the package-selection screen.
        setStep(3);
        setShowConfigurator(true);
        if(draft.sectorSlug&&draft.sectorName)setSelectedSector({slug:draft.sectorSlug,name:draft.sectorName});
        if(draft.packageId)setPackageId(draft.packageId);
        restoreAddonChoices(draft.options??[]);
        setSectorAddonCodes(Array.isArray(draft.sectorAddonCodes)?draft.sectorAddonCodes:[]);
        setSectorAddonQuantities(draft.sectorAddonQuantities??{});
        if(draft.domainName)setRequestedDomainName(draft.domainName);
        if(draft.businessName)setCustomer(old=>({...old,company:draft.businessName}));
      }).catch(()=>setRequestMessage(t("تعذر فتح مسودة المشروع المطلوبة. تحقق من ملكيتها وتسجيل الدخول.","Could not access the requested project draft. Verify your account and try again.")));
    return()=>{active=false};
  },[]);
  const localPackageFor = (backendId: string) => packages.find((item) => backendPackageIds[item.id] === backendId);
  const apiOverrides = apiCatalog.packages.map((backend) => {
    const local = localPackageFor(backend.id);
    return { id: local?.id ?? backend.id, name: localizePackage(local?.id ?? backend.id,backend.name,"name"), price: backend.is_custom_quote ? null : Number(backend.price), description: localizePackage(local?.id ?? backend.id,backend.description,"description") };
  });
  const visiblePackages = catalogStatus === "ready" ? apiCatalog.packages.map((backend) => {
    const local = localPackageFor(backend.id);
    return {
      id: local?.id ?? backend.id,
      name: localizePackage(local?.id ?? backend.id,backend.name,"name"),
      short: localizePackage(local?.id ?? backend.id,backend.tagline || local?.short || "ATSH AI","short"),
      description: localizePackage(local?.id ?? backend.id,backend.description,"description"),
      price: backend.is_custom_quote ? null : Number(backend.price),
      list_price:backend.list_price,discount_percent:backend.discount_percent,ownershipPrices:backend.ownershipPrices,
      includedPages: local?.includedPages ?? null,
      features: isEnglish ? (englishPackages[local?.id ?? backend.id]?.features ?? backend.features ?? local?.features ?? []) : (backend.features ?? local?.features ?? []),
      recommended: backend.is_featured || (local?.recommended ?? false)
    };
  }) : [];
  const selectedBackendPackageId = packageId ? backendPackageIds[packageId] ?? packageId : undefined;
  const selectedServerPackage = selectedBackendPackageId ? apiCatalog.packages.find((item) => item.id === selectedBackendPackageId) : undefined;
  const serverOptions = apiCatalog.options.filter((option) => option.package_id === selectedServerPackage?.id && option.visibility !== "systems");
  const hasOption=(code:string)=>catalogStatus==="ready"&&serverOptions.some(option=>option.code===code);
  const enabledIdentity=identity!=="provided"&&hasOption(identity)?identity:"provided";
  const enabledContent=content==="writing"&&hasOption("writing")?content:"provided";
  const enabledAddons=addons.filter(hasOption);
  const enabledBilingual=bilingual&&hasOption("language");
  const enabledHosting=hosting&&hasOption("hosting");
  const enabledMaintenance=maintenance&&hasOption("maintenance");
  const basePages=visiblePackages.find(item=>item.id===packageId)?.includedPages??1;
  const enabledPages=hasOption("extra_page")?pages:Math.min(pages,basePages);
  const customerSelectedOptionCodes = [
    ...(enabledBilingual ? ["language"] : []),
    ...(enabledIdentity === "provided" ? [] : [enabledIdentity]),
    ...(enabledContent === "writing" ? ["writing"] : []),
    ...(enabledPages > basePages ? ["extra_page"] : []),
    ...enabledAddons,
    ...(enabledHosting ? ["hosting"] : []),
    ...(enabledMaintenance ? ["maintenance"] : [])
  ];
  const selectedOptionCodes = [...new Set([...customerSelectedOptionCodes, ...serverOptions.filter((option) => option.is_required && !obsoleteIdentityOptionCodes.has(option.code)).map((option) => option.code)])];
  const selectedConfiguredOptions = selectedOptionCodes.map((code) => serverOptions.find((option) => option.code === code));
  const selectedExtraOptions = serverOptions.filter((option) => !builtInOptionCodes.has(option.code) && !obsoleteIdentityOptionCodes.has(option.code) && !["domain_com","domain_eg"].includes(option.code) && (option.is_required || selectedExtraOptionIds.includes(option.id)));
  const selectedServerOptions = Array.from(new Map([...serverOptions.filter((option) => option.is_required && !obsoleteIdentityOptionCodes.has(option.code)), ...selectedConfiguredOptions.filter((option): option is BackendOption => Boolean(option)), ...selectedExtraOptions].map((option) => [option.id, option])).values());
  const requiredOptionsNotIncludedInQuote = serverOptions.filter((option) => !obsoleteIdentityOptionCodes.has(option.code) && option.is_required && !customerSelectedOptionCodes.includes(option.code));
  const extraQuoteOptions = [...selectedExtraOptions, ...requiredOptionsNotIncludedInQuote.filter((option) => !selectedExtraOptions.some((selected) => selected.id === option.id))].filter(option=>option.code!=="extra_page").map((option) => ({ id: option.id, name: localizeOption(option.code,option.name), price: Number(option.price), pricingType: option.pricing_type, unitLabel: option.unit_label }));
  const apiConfigured = catalogStatus === "ready" && Boolean(selectedServerPackage) && selectedConfiguredOptions.every(Boolean);
  const selectedPackageOptions = serverOptions.map((option) => ({ code: option.code, name: localizeOption(option.code,option.name), price: Number(option.price), pricingType: option.pricing_type }));
  const quote = useMemo(() => calculateQuote({ packageId, identity:enabledIdentity, content:enabledContent, addons:enabledAddons, pages:enabledPages, bilingual:enabledBilingual, hosting:enabledHosting, maintenance:enabledMaintenance, domain }, apiOverrides, selectedPackageOptions, vatRate, extraQuoteOptions), [packageId, enabledIdentity, enabledContent, enabledAddons, enabledPages, enabledBilingual, enabledHosting, enabledMaintenance, domain, apiOverrides, selectedPackageOptions, vatRate, extraQuoteOptions]);
  const localizedQuoteItems=quote.items.map(item=>isEnglish?({...item,label:item.id==="package"?(englishPackages[packageId || ""]?.name || "Custom package"):(item.id==="extra_page" ? "Additional pages" : englishOptions[item.id==="identity"?identity:item.id==="content"?"writing":item.id]?.name) || item.label,period:item.period==="سنوي"?"annual":item.period==="شهري"?"monthly":undefined}):item);
  const sectorNeedsQuote=Boolean(selectedSector&&(!sectorPrice||sectorPrice.needsCustomQuote));
  const quoteSummary=combinedQuoteSummary({items:quote.items,needsCustomQuote:quote.needsCustomQuote},selectedSector?sectorPrice:null,vatRate);
  const sectorSubtotal=selectedSector&&sectorPrice&&!sectorPrice.needsCustomQuote?sectorPrice.subtotal:0;
  const quoteSubtotal=quoteSummary.initialSubtotal;
  const quoteTax=quoteSummary.initialTax;
  const quoteTotal=quoteSummary.initialTotal;
  const quoteRecurring=quoteSummary.yearly;
  const domainContractNote=t("تُحدد تفاصيله في العقد","Details to be specified in the contract");
  const selectedPackage = visiblePackages.find((item) => item.id === packageId);
  const includedPages = selectedPackage?.includedPages ?? 1;

  const begin = (id?: PackageId) => {
    if (!configuratorOnly) {
      const target=new URL(isEnglish?"/en/configure":"/configure",window.location.origin);
      if(id)target.searchParams.set("package",id);
      window.location.assign(target.toString());
      return;
    }
    if (id) {
      setPackageId(id);
      setPages(visiblePackages.find((item) => item.id === id)?.includedPages ?? 1);
      setSelectedExtraOptionIds([]);
    }
    setStep(1);
    setShowConfigurator(true);
    window.setTimeout(()=>document.getElementById("configurator")?.scrollIntoView({ behavior: "smooth", block: "start" }),0);
  };

  // Saving preferences is explicit and scoped to this authenticated project.
  // Server prices are NOT derived from the saved browser snapshot.
  const saveProjectChoices=async():Promise<boolean>=>{
    if(!selectedProjectDraftId){setRequestMessage(t("اختر مسودة المشروع أولًا من حسابك.","Select a saved project draft from your account first."));return false;}
    setRequestMessage(t("جارٍ حفظ الاختيارات في مسودة المشروع...","Saving your project selections…"));
    try{
      const endpoint=`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraftId)}`;
      const current=await fetch(endpoint,{credentials:"include",cache:"no-store"});
      const body=await current.json().catch(()=>({}));
      if(!current.ok||!body.projectDraft)throw Error(t("تعذر قراءة مسودة المشروع؛ تحقق من الجلسة.","Unable to access the project draft. Verify your sign-in."));
      const savedDraft=body.projectDraft.draft||{};
       const chosenSector=selectedSector?.slug||savedDraft.sectorSlug;
       const chosenPackage=packageId||savedDraft.packageId;
       const customRequirements=(customer.details||savedDraft.requirements||"").trim();
       if(!chosenSector&&!chosenPackage&&!(savedDraft.projectMode==="custom"&&customRequirements))throw Error(t("لم يتم تحديد نوع المشروع في المسودة. ارجع لاختيار باقة أو مشروع من النظام المخصص، ثم أكمل الإضافات.","No project type is selected in this draft. Choose a package or catalog project, then continue with add-ons."));
       const patch={draftInvoice:currentDraftInvoice(),...(selectedSector?{sectorSlug:selectedSector.slug,sectorName:selectedSector.name,sectorAddonCodes,sectorAddonQuantities,source:"catalog" as const}:{}),...(packageId?{packageId,source:"configurator" as const}:{}),options:[...new Set([...enabledAddons,...selectedExtraOptions.map(option=>option.id)])],...(requestedDomainName?{domainName:requestedDomainName}:{}),businessName:customer.company||savedDraft.businessName||"",requirements:customRequirements,
        pages:enabledPages,bilingual:enabledBilingual,identity:enabledIdentity,contentMode:enabledContent==="writing"?"writing" as const:"provided" as const,
        hosting:enabledHosting,domainChoice:domain,maintenance:enabledMaintenance,startWindow:startWindowLabel,contactWindow:contactWindowLabel,
        stylePreference,inspirationLinks:inspirationLinks.filter(Boolean).slice(0,20),
        compliance:customer.compliance,logoName,customerName:customer.name,customerEmail:customer.email,customerPhone:customer.phone,
        optionQuantities:Object.fromEntries(selectedServerOptions.filter((option):option is BackendOption=>Boolean(option)&&option.pricing_type==="per_page").map(option=>[option.id,option.code==="extra_page"?Math.max(1,enabledPages-includedPages):enabledPages]))};
      const response=await fetch(endpoint,{method:"PATCH",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:Number(body.projectDraft.revision),patch})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(isEnglish?"Unable to save the current project draft":result.error||"تعذر حفظ المسودة؛ راجع التعديلات الجديدة.");
      setRequestMessage(t("تم حفظ اختيارات النموذج وإضافاته في حسابك. يمكن استكمال معاينتها من لوحة العميل.","Your project choices are saved to your account. Continue from your client dashboard."));
      setRequestState("idle");
      return true;
    }catch(error){setRequestMessage(error instanceof Error?error.message:t("فشل حفظ الاختيارات","Unable to save selections"));setRequestState("error");return false;}
  };
  const finishSavedDraft=async()=>{
    if(!selectedProjectDraftId)return;
    await saveProjectChoices();
    // Stay in the customer account for explicit review and management submission.
    // A failed save must never be presented as a completed submission.
  };
  const toggleAddon = (id: AddonId) => setAddons((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleExtraOption = (id: string) => setSelectedExtraOptionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateCustomer = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer((current) => ({ ...current, [event.target.name]: event.target.value }));
  const addInspiration = () => setInspirationLinks((current) => [...current, ""]);
  const setInspiration = (index: number, value: string) => setInspirationLinks((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));

  const downloadSummary = () => {
    const summary = [
      t("طلب تقدير سعر — ATSH AI","Quotation request — ATSH AI"),
      `${t("الباقة","Package")}: ${selectedPackage?.name ?? copy("customQuoteLabel")}`,
      `${t("الصفحات المطلوبة","Requested pages")}: ${pages}`,
      ...(requestedDomainName?[`${t("الدومين المختار","Selected domain")}: ${requestedDomainName} — ${domainContractNote}`]:[]),
      `${t("اللغات","Languages")}: ${bilingual ? copy("languageBilingual") : copy("languageArabic")}`,
      `${t("الهوية","Brand identity")}: ${localizeOption(identity,identityOptions.find((item) => item.id === identity)?.name ?? "شعار العميل")}`,
      `${t("المحتوى","Content")}: ${content === "writing" ? copy("requestWriting") : copy("provideContent")}`,
      ...localizedQuoteItems.map((item) => `${item.label}: ${money(item.amount)}${item.period ? ` / ${item.period}` : ""}`),
      ...(sectorPrice&&!sectorPrice.needsCustomQuote?sectorPrice.items.map(item=>`${item.name}: ${money(item.price)} / ${item.pricingType}`):[]),
      `${t("المجموع قبل الضريبة","Subtotal before tax")}: ${money(quoteSubtotal)}`,
      `${t("ضريبة القيمة المضافة","VAT")} (${vatRate}%): ${money(quoteTax)}`,
      `${t("إجمالي البنود المسعّرة","Total priced items")}: ${money(quoteTotal)}`,
      `${t("مبلغ شهري متكرر","Monthly recurring")}: ${money(quoteSummary.monthly)}`,
      `${t("مبلغ سنوي متكرر","Annual recurring")}: ${money(quoteSummary.yearly)}`,
      `${t("رسوم التأسيس/لمرة واحدة","Setup / one-time fees")}: ${money(quoteSummary.oneTime)}`,
      quote.needsCustomQuote ? t("يتطلب الطلب مراجعة بنود مخصصة قبل اعتماد السعر النهائي.","Custom items need review before a final price can be approved.") : "",
      `${copy("startDateLabel")}: ${startWindowLabel}`,
      customer.name ? `${t("الاسم","Name")}: ${customer.name}` : "",
      customer.company ? `${t("الشركة","Company")}: ${customer.company}` : "",
      customer.email ? `${t("البريد","Email")}: ${customer.email}` : "",
      customer.phone ? `${t("الهاتف","Phone")}: ${customer.phone}` : "",
      customer.details ? `${t("التفاصيل","Details")}: ${customer.details}` : "",
    ].filter(Boolean).join("\n");
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "atsh-ai-quote.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const validCustomerPhone = customer.phone.trim().replace(/[^0-9]/g,"").length >= 7;
  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(submitRequestInFlight.current||requestState==="sent")return;
    // Admin preview is read-only: never submit customer drafts or create real orders.
    if(readPagePreview("home",isEnglish?"en":"ar")){
      setRequestState("sent");
      setRequestMessage(t("هذه تجربة معاينة فقط؛ لم يتم إرسال طلب حقيقي.","Preview only — no real order was submitted."));
      return;
    }
    if (!validCustomerPhone || customer.name.trim().length < 2 || (customer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()))) {
      setRequestState("error");
      setRequestMessage(t("راجع بيانات التواصل: الاسم لا يقل عن حرفين، ورقم الهاتف لا يقل عن 7 أرقام، والبريد الإلكتروني يجب أن يكون صحيحًا.","Check your contact details: name must have at least 2 characters, phone at least 7 digits, and email must be valid."));
      return;
    }
    if (!privacyAccepted) {
      setRequestState("error");
      setRequestMessage(copy("privacyRequiredMessage"));
      return;
    }
    submitRequestInFlight.current=true;
    setRequestState("sending");
    setRequestMessage("");
    try {
      if(selectedProjectDraftId){
        const saved=await saveProjectChoices();
        if(!saved)return;
        const response=await fetch(`/api/customer/auth/project-drafts/${encodeURIComponent(selectedProjectDraftId)}/submit`,{method:"POST",credentials:"include"});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||t("تعذر إرسال الطلب للإدارة.","Could not submit request to management."));
        setRequestState("sent");
        setRequestMessage(t("تم إرسال طلبك للإدارة. تابع الرد من حسابك.","Your request was sent to management. Follow the response in your account."));
        return;
      }
      if (!selectedServerPackage || selectedServerOptions.some((option) => !option)) throw new Error(t("تعذر مطابقة اختياراتك مع نظام مخصص الخادم. أعد تحميل الصفحة أو تواصل معنا.","Some selected items are no longer in the live catalog. Refresh or contact us."));
      const resolvedOptions = selectedServerOptions.filter((option): option is BackendOption => Boolean(option));
      const optionQuantities = Object.fromEntries(resolvedOptions.filter((option) => option.pricing_type === "per_page").map((option) => [option.id, option.code==="extra_page"?Math.max(1,enabledPages-includedPages):enabledPages]));
      const notes = [
        `الشركة: ${customer.company || "غير محدد"}`,
        `عدد الصفحات: ${pages}`,
        `اللغات: ${bilingual ? "العربية والإنجليزية" : "العربية"}`,
        `الهوية: ${identityOptions.find((item) => item.id === identity)?.name ?? "الشعار الحالي"}`,
        `المحتوى: ${content === "writing" ? "كتابة المحتوى" : "محتوى يقدمه العميل"}`,
        `الميزات: ${addons.map((id) => addonOptions.find((item) => item.id === id)?.name).filter(Boolean).join("، ") || "لا توجد"}`,
        `الاستضافة: ${hosting ? "مُدارة" : "بواسطة العميل"}`,
        `النطاق: ${domain === "none" ? "لدى العميل" : `.${domain}`}`,
        requestedDomainName ? `دومين مطلوب للفحص عند الشراء: ${requestedDomainName} — غير محجوز` : "",
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
      const orderPayload = JSON.stringify({
          packageId: selectedServerPackage.id,
          optionIds: resolvedOptions.map((option) => option.id),
          optionQuantities,
          ...(selectedSector ? {sectorSlug:selectedSector.slug,sectorAddonCodes,sectorAddonQuantities} : {}),
          ...(selectedProjectDraftId ? {projectDraftId:selectedProjectDraftId} : {}),
          customerName: customer.name,
          email: customer.email,
          phone: customer.phone,
          notes
        });
      if (!orderSubmissionKey.current || orderSubmissionKey.current.payload !== orderPayload) {
        orderSubmissionKey.current = {key:crypto.randomUUID(),payload:orderPayload};
      }
      const response = await fetch("/api/orders", {
        method:"POST",
        headers:{"Content-Type":"application/json","Idempotency-Key":orderSubmissionKey.current.key},
        body:orderPayload
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error==="Invalid order details" ? t("بيانات الطلب غير مكتملة أو غير صحيحة. راجع بيانات التواصل واختيارات الباقة.","Some order details are invalid. Check your contact information and package selections.") : (isEnglish?"Unable to submit your request at the moment.":data.message || data.error || "تعذر تسجيل الطلب الآن."));
      orderSubmissionKey.current=null;
      setRequestState("sent");
      setRequestMessage(`${copy("orderSuccessPrefix")} ${data.order?.reference ?? copy("orderSuccessFallback")}`);
    } catch (error) {
      setRequestState("error");
      setRequestMessage(error instanceof Error ? error.message : t("تعذر تسجيل الطلب الآن.","Unable to submit the request."));
    } finally {
      submitRequestInFlight.current=false;
    }
  };

  const currentDraftInvoice = () => ({
    title:selectedPackage?.name||selectedSector?.name||t("طلب مشروع","Project request"),
    items:[...localizedQuoteItems.map(item=>({name:item.label,amount:item.amount,period:(item.period==="سنوي"||item.period==="annual"?"yearly":item.period==="شهري"||item.period==="monthly"?"monthly":"fixed") as "fixed"|"monthly"|"yearly"})),...(selectedSector&&sectorPrice&&!sectorPrice.needsCustomQuote?sectorPrice.items.map(item=>({name:item.name,amount:item.price,period:item.pricingType})):[])],
    subtotal:quoteSubtotal,vat:quoteTax,total:quoteTotal,fixed:quoteSummary.oneTime,monthly:quoteSummary.monthly,yearly:quoteSummary.yearly,currency:"EGP" as const,savedAt:new Date().toISOString()
  });
  const continueFromContact = () => {
    // Account creation is the next step. Validate contact details at final order submission,
    // not here: an incomplete phone number must not freeze account navigation.
    setRequestMessage("");
    saveGuestWorkspace({
      packageId:packageId??undefined,domainName:requestedDomainName,
      sectorSlug:selectedSector?.slug,sectorName:selectedSector?.name,
      sectorAddonCodes,sectorAddonQuantities,options:[...new Set([...enabledAddons,...selectedExtraOptions.map(option=>option.id)])],draftInvoice:currentDraftInvoice(),source:"configurator"
    });
    window.location.assign(isEnglish
      ?(customerSignedIn?"/en/account/dashboard":"/en/account/register")
      :(customerSignedIn?"/account/dashboard":"/account/register"));
  };

  const handleBuilderSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (step !== steps.length - 1) {
      event.preventDefault();
      return;
    }
    void submitRequest(event);
  };

  return (
    <main className="platform" lang={locale} dir={isEnglish?"ltr":"rtl"} style={{ "--navy": siteConfig.theme?.navy, "--navy-2": siteConfig.theme?.blue, "--blue": siteConfig.theme?.blue, "--gold": siteConfig.theme?.gold, "--page": siteConfig.theme?.page, "--site-font": siteConfig.theme?.fontFamily ? `\"${siteConfig.theme.fontFamily}\", system-ui, sans-serif` : undefined, "--card-radius": siteConfig.theme?.cardRadius === undefined ? undefined : `${siteConfig.theme.cardRadius}px`, backgroundImage: siteConfig.theme?.backgroundImageUrl ? `linear-gradient(rgba(250,249,245,.94), rgba(250,249,245,.94)), url(${JSON.stringify(siteConfig.theme.backgroundImageUrl)})` : undefined, backgroundSize: siteConfig.theme?.backgroundImageUrl ? "cover" : undefined, backgroundAttachment: siteConfig.theme?.backgroundImageUrl ? "fixed" : undefined } as CSSProperties}>
      {!configuratorOnly&&<header className="platform-header platform-header-with-contact">
        <a className="platform-header-contact" href="tel:+201007735321" lang="ar" dir="rtl">شارع النقطة القديمة منيل شيحة أبو النمرس الجيزة <bdi dir="ltr">01007735321</bdi></a>
        <a className="platform-brand" href="#top" aria-label={copy("homeAriaLabel")}>
          <img src={siteConfig.theme?.logoUrl || "/images/atsh-logo.jpg"} alt={copy("logoAlt")} />
          <span><strong>ATSH <b>AI</b></strong><small>{copy("brandTagline")}</small></span>
        </a>
        <nav className="platform-nav" aria-label={copy("mainNavigationLabel")}>
          {!customerSignedIn&&<><a href={isEnglish?"/en/account/register":"/account/register"}>{t("إنشاء حساب","Create account")}</a><a href={isEnglish?"/en/account/login":"/account/login"}>{t("تسجيل دخول","Sign in")}</a></>}<a href="#faq">{copy("navFaq")}</a>{pageLinks.filter(item=>!/(سجل\s*الأعمال|معرض\s*الأعمال|portfolio|our\s*work|case\s*studies)/i.test(`${item.title} ${item.slug}`)).map((item) => <a key={item.slug} href={`${isEnglish?"/en":""}/${item.slug}`}>{item.title}</a>)}
        </nav>
        <details className="atsh-mobile-nav"><summary aria-label={t("فتح القائمة","Open menu")}>☰ <span>{t("القائمة","Menu")}</span></summary>
          <nav aria-label={copy("mainNavigationLabel")}>
            {customerSignedIn?<a href={isEnglish?"/en/account/dashboard":"/account/dashboard"}>{t("حساب","Account")} {signedInCustomerName||t("العميل","customer")}</a>:<><a href={isEnglish?"/en/account/login":"/account/login"}>{t("تسجيل دخول","Sign in")}</a><a href={isEnglish?"/en/account/register":"/account/register"}>{t("إنشاء حساب","Create account")}</a></>}
          </nav>
        </details>
        <div className="platform-header-actions">{customerSignedIn&&<a className="atsh-signed-in-badge" href={isEnglish?"/en/account/dashboard":"/account/dashboard"} aria-label={t(`حساب ${signedInCustomerName||"العميل"}`,`Account ${signedInCustomerName||"customer"}`)}><span className="atsh-signed-in-badge-icon" aria-hidden="true">●</span><span>{t("حساب","Account")} {signedInCustomerName||t("العميل","customer")}</span></a>}<a className="language-pill header-language-switch" href={isEnglish?"/ar":"/en"} hrefLang={isEnglish?"ar":"en"} aria-label={isEnglish?"Switch to Arabic":"Switch to English"} onClick={(event) => { event.preventDefault(); window.location.assign(isEnglish ? "/ar" : "/en"); }}>🌐 {isEnglish?"العربية":"English"}</a><a className="button button-small" href={isEnglish?"/en#packages":"/#packages"}>{copy("navAction")} <span>←</span></a></div>
      </header>}

      {!configuratorOnly&&<><section className={`build-hero${!copy("heroDescription").trim() ? " build-hero-compact" : ""}`} id="top">
        <div className="build-hero-copy">

          <h1 style={{fontSize:"clamp(26px,3.4vw,48px)",lineHeight:1.35,color:"#203958",margin:"0 0 12px"}}>{copy("marketingHeroTitle")}</h1>
          <p style={{margin:"0 0 20px",fontSize:"clamp(14px,1.3vw,18px)",lineHeight:1.7}}>{copy("marketingHeroSubtitle")}</p>
          {copy("heroDescription").trim() && <p>{copy("heroDescription")}</p>}
          <div className="hero-actions">{[{key:"heroOrderHref",fallback:"#packages",label:copy("ctaText"),className:"button",arrow:true},{key:"heroSystemsHref",fallback:isEnglish?"/en/catalog":"/catalog",label:copy("heroSystemsLabel")||t("أنظمة مخصصة","Custom systems"),className:"button button-quiet",arrow:false}].map(item=>{const raw=copy(item.key).trim();const safe=raw&&!/[\\\u0000-\u0020]/.test(raw)&&(/^(?:\/(?!\/)|#)/.test(raw)||/^https?:\/\/[^/]+/i.test(raw));return <a key={item.key} className={item.className} href={safe?raw:item.fallback}>{item.label}{item.arrow&&<> <span>←</span></>}</a>})}</div>
          <div className="hero-trust">{cardsFromContent("heroTrustItems", [1,2,3].map((n) => ({ id: `hero-trust-${n}`, title: copy(`heroTrust${n}`) }))).map((item, index) => <span key={item.id ?? index}>✓ {item.title}</span>)}</div>
        </div>
        <div className="build-hero-art">
          <img src={siteConfig.theme?.heroImageUrl || "/images/atsh-hero.jpg"} alt={copy("heroImageAlt")} />
          <div className="hero-art-caption"><span>ATSH AI</span><span>{copy("heroBrandLine")}</span></div>
          {copy("heroEstimateVisible")!=="false"&&(()=>{const estimate=(key:string,fallback:number)=>{const raw=copy(key).trim();const n=Number(raw);return raw&&Number.isFinite(n)&&n>=0?n:fallback;};const packagePrice=estimate("heroEstimatePackagePrice",visiblePackages.find(item=>item.id==="multi")?.price??2500);const identityPrice=estimate("heroEstimateIdentityPrice",3500);const hostingOption=(apiCatalog.sharedOptions??apiCatalog.options).find(o=>o.code==="hosting"&&o.pricing_type==="yearly");if(!hostingOption||!visiblePackages.some(p=>p.id==="multi"&&p.price!==null))return null;const hostingPrice=Number(hostingOption.price);return <div className="hero-price-card">
            <div className="price-card-top"><span className="status-dot" /> {copy("heroPriceLabel")}</div>
            <div className="price-preview-line"><span>{copy("heroEstimatePackageName") || (visiblePackages.find((item) => item.id === "multi")?.name ?? copy("priceSummaryPackageFallback"))}</span><b>{money(packagePrice)}</b></div>
            <div className="price-preview-line"><span>{copy("heroIdentityLine")}</span><b>{money(identityPrice)}</b></div>
            <div className="price-preview-line"><span>{copy("heroHostingLine")}</span><AddonPrice item={hostingOption} locale={locale}/></div>
            <div className="price-preview-total"><span>{copy("heroTotalLabel")} {vatRate}%</span><strong>{money((packagePrice + identityPrice + hostingPrice) * (1 + vatRate / 100))}</strong></div>
            <small>{copy("heroPriceFootnote")}</small>
          </div>;})()}
        </div>
      </section>

      <section className="trust-strip" aria-label={copy("trustStripLabel")}>{trustItems.filter((item) => item.title).map((item, index) => <span key={item.id ?? index}>✓ {item.title}</span>)}</section>

      {activeCustomSections(contentData.sections).filter((section) => !isEnglish || !Array.isArray(arabicReference?.sections) || activeCustomSections(arabicReference.sections).some((reference) => reference.id === section.id)).map((section) => <CustomSection key={section.id} section={section} />)}

      <section className="packages-section" id="packages">
        <div className="section-heading"><div><span className="section-kicker">{copy("packagesKicker")}</span><h2>{copy("packagesTitle")}</h2></div><p>{copy("packagesDescription")}</p></div>
        <div className="package-grid">
          {!visiblePackages.length&&<p>{catalogStatus==="ready"?t("لا توجد باقات متاحة حاليًا.","No packages are currently available."):catalogStatus==="loading"?copy("loadingCatalogMessage"):copy("unavailableCatalogMessage")}</p>}{visiblePackages.map((item) => <article key={item.id} className={item.recommended ? "package-card package-recommended" : "package-card"}>
            {item.recommended && <span className="popular-badge">{copy("featuredBadge")}</span>}
            <span className="package-kicker">{item.short}</span><h3>{item.name}</h3><p>{item.description}</p>
            <ul>{item.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
            <div className="package-price">{item.price === null ? <><strong>{copy("customQuoteLabel")}</strong><small>{copy("customQuoteDescription")}</small></> : <><strong>{copy("packagePricePrefix")} <AddonPrice item={item.ownershipPrices?.rent??{price:item.price,list_price:item.list_price,discount_percent:item.discount_percent}} locale={locale}/></strong><small>{item.ownershipPrices?t("إيجار سنوي شامل الاستضافة الأساسية","Annual rental incl. standard hosting"):copy("packagePriceFootnote")}</small></>}</div>
            <a className={item.recommended ? "button package-cta" : "button button-outline package-cta"} href={`${isEnglish?"/en":""}/configure?package=${encodeURIComponent(item.id)}`} onClick={(event)=>{if(readPagePreview("home",locale)){event.preventDefault();setPackageId(item.id);setPages(item.includedPages??1);setShowConfigurator(true);setStep(1);window.location.hash="configurator";}}}>{t("تخصيص الباقة وحساب السعر","Customize package and calculate price")} ←</a>
          </article>)}
        </div>

      </section></>}

      {showConfigurator&&<section className="configurator-section" id="configurator">
        {configuratorOnly&&<div style={{marginBottom:20}}><a href={isEnglish?"/en#packages":"/#packages"} className="button button-outline">{t("← العودة للباقات","← Back to packages")}</a></div>}
        {selectedProjectDraftId&&<div role="group" aria-label={t("حفظ اختيارات المشروع","Save project selections")} style={{background:"#eaf8ee",color:"#166534",padding:12,borderRadius:10,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><span>{t("أنت تستكمل مسودة مشروع محفوظة في حسابك. سيتم ربط الطلب النهائي بهذه المسودة فقط.","You are editing a saved project draft in your account. The final request will be linked only to this draft.")}</span><button type="button" onClick={()=>void finishSavedDraft()} style={{background:"#203958",color:"white",border:0,borderRadius:9,padding:"10px 13px",cursor:"pointer"}}>{t("حفظ الإضافات","Save add-ons")}</button><a href={isEnglish?"/en/account/dashboard":"/account/dashboard"} style={{fontWeight:700,color:"#203958"}}>{t("مراجعة الطلب وإرساله للإدارة","Review and submit to management")}</a></div>}
        <div className="section-heading configurator-title"><div><span className="section-kicker">{copy("configuratorKicker")}</span><h2>{copy("configuratorTitle")}</h2></div><p>{copy("configuratorDescription")}</p></div>
        <div className="builder-layout">
          <div className="builder-main">
            {!groupedPricing&&<div className="stepper" aria-label={`${copy("stepCountLabel")} ${step+1} ${copy("stepCountOf")} ${steps.length}`}>
              {steps.map((label, index) => index===0?null:<button key={label} className={index === step ? "stepper-item current" : index < step ? "stepper-item done" : "stepper-item"} onClick={() => index <= step && setStep(index)} disabled={index > step} aria-current={index === step ? "step" : undefined}>
                <span className="stepper-number">{index < step ? "✓" : index + 1}</span><span>{label}</span>
              </button>)}
            </div>}
            <form className="builder-card" onSubmit={handleBuilderSubmit}>
              {!groupedPricing||step>=5?<div className="builder-step-heading"><span>{copy("stepCountLabel")} {step + 1} {copy("stepCountOf")} {steps.length}</span><h3>{steps[step]}</h3><p>{copy(`stepDesc${step}`)}</p></div>:<div className="builder-step-heading"><h3>{t("خصص إضافات الباقة","Customize package add-ons")}</h3><p>{t("اختر المواصفات وشاهد الفاتورة تتغير مباشرة.","Choose options and see your estimate update live.")}</p></div>}

              {step === 0 && <div className="option-grid package-option-grid">
                {visiblePackages.map((item) => <button type="button" key={item.id} className={packageId === item.id ? "select-card selected" : "select-card"} onClick={() => { setPackageId(item.id); setPages(item.includedPages ?? 5); setSelectedExtraOptionIds([]); }}>
                  <span className="select-mark">{packageId === item.id ? "✓" : "+"}</span><span className="select-card-copy"><strong>{item.name}</strong><small>{item.description}</small>{item.price===null?<b>{copy("packageReviewPrice")}</b>:<span>{copy("packageStartPrice")} <AddonPrice item={{price:item.price,list_price:item.list_price,discount_percent:item.discount_percent}} locale={locale}/></span>}</span><span className="included-chip">{copy("packageIncludedBenefits")}</span>
                </button>)}
              </div>}

              {groupedPricing&&step>0&&step<5&&<div className="form-stack">
                <section className="addon-category-panel"><div className="addon-category-heading"><span className="addon-category-index">◎</span><div><h3>{t("البحث الحي عن الدومين","Live domain availability search")}</h3><p>{t("ابدأ باختيار عنوان مشروعك؛ السعر والحجز بعد التأكيد.","Choose your project address; price and reservation are confirmed separately.")}</p></div></div><DomainLookup locale={locale} onDomainChange={value=>{setRequestedDomainName(value);const suffix=value.trim().toLowerCase();setDomain(suffix.endsWith(".com")?"com":suffix.endsWith(".eg")?"eg":"none");}}/></section>
                <AddonGroups locale={locale} isSelected={o=>o.code==="extra_page"?pages>includedPages||o.is_required:o.is_required||customerSelectedOptionCodes.includes(o.code)||selectedExtraOptionIds.includes(o.id)} addons={serverOptions.filter(o=>!obsoleteIdentityOptionCodes.has(o.code)&&!["domain","domain_com","domain_eg"].includes(o.code))} render={option=>{
                  const code=option.code;
                  if(code==="extra_page")return <div key={option.id} className={pages>includedPages?"select-card selected":"select-card"} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span className="select-card-copy"><strong>{localizeOption(code,option.name)}</strong><small>{t("حتى خمس صفحات فوق الباقة","Up to five pages beyond the package")}</small><AddonPrice item={option} locale={locale} prefix="+" suffix={t(" / صفحة"," / page")}/></span><span className="page-quantity" aria-label={t("عدد الصفحات الإضافية","Additional page count")}><button type="button" disabled={pages<=includedPages+(option.is_required?1:0)} onClick={()=>setPages(n=>Math.max(includedPages,n-1))} aria-label={t("تقليل الصفحات","Remove a page")}>−</button><output aria-live="polite">{Math.max(0,pages-includedPages)}</output><button type="button" disabled={pages-includedPages>=5} onClick={()=>setPages(n=>Math.max(includedPages,n)+1)} aria-label={t("زيادة الصفحات","Add a page")}>+</button></span></div>;
                  const selected=option.is_required||customerSelectedOptionCodes.includes(code)||selectedExtraOptionIds.includes(option.id);
                  const toggle=()=>{switch(code){case "language":setBilingual(v=>!v);break;case "logo":case "brand":setIdentity(v=>v===code?"provided":code);break;case "writing":setContent(v=>v==="writing"?"provided":"writing");break;case "hosting":setHosting(v=>!v);break;case "maintenance":setMaintenance(v=>!v);break;default:if(addonOptions.some(a=>a.id===code))toggleAddon(code as AddonId);else toggleExtraOption(option.id);}};
                  return <button type="button" key={option.id} disabled={option.is_required} aria-pressed={selected} className={selected?"select-card selected":"select-card"} onClick={toggle}><span className="select-mark">{selected?"✓":"+"}</span><span className="select-card-copy"><strong>{localizeOption(code,option.name)}{option.is_required?copy("requiredSuffix"):""}</strong><small>{localizeOption(code,option.description||copy("extraOptionFallback"),"description")}</small><AddonPrice item={option} locale={locale} prefix="+" suffix={option.pricing_type==="monthly"?` / ${copy("monthUnit")}`:option.pricing_type==="yearly"?` / ${copy("yearUnit")}`:option.pricing_type==="per_page"?` / ${copy("pageUnit")}`:""}/></span></button>;
                }}/>
                <section className="addon-category-panel form-stack"><h3 style={{margin:0}}>{t("تفاصيل المشروع والمواد المتاحة","Project details & available materials")}</h3>
                <p className="field-hint">{t("عدد الصفحات المشمولة في الباقة: ","Pages included in this package: ")}{includedPages}</p>
                {identity==="provided"&&<label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={event=>setLogoName(event.target.files?.[0]?.name??"")}/><span className="upload-icon">↑</span><strong>{logoName||copy("logoUploadLabel")}</strong><small>{copy("logoUploadFormats")}</small></label>}
                <label className="field-label">{copy("colorPreferenceLabel")}<textarea value={stylePreference} onChange={event=>setStylePreference(event.target.value)} placeholder={copy("colorPreferencePlaceholder")} rows={3}/></label>
                <div className="field-label">{copy("inspirationLabel")} <small>{copy("optionalLabel")}</small>{inspirationLinks.map((link,index)=><input key={index} value={link} onChange={event=>setInspiration(index,event.target.value)} placeholder={copy("inspirationPlaceholder")} type="url"/>)}<button type="button" className="inline-add" onClick={addInspiration}>{copy("addLink")}</button></div>
                <button type="button" className={showOtherDetails?"select-card selected":"select-card"} onClick={()=>setShowOtherDetails(v=>!v)}><span className="select-mark">{showOtherDetails?"✓":"+"}</span><span className="select-card-copy"><strong>{t("تفاصيل أو متطلبات أخرى","Other details or requirements")}</strong><small>{t("أضف أي متطلبات خاصة لمراجعتها قبل تأكيد السعر.","Describe special requirements for review before confirming the price.")}</small></span></button>{(showOtherDetails||customer.details)&&<label className="field-label">{t("تفاصيل إضافية","Additional details")}<textarea value={customer.details} onChange={event=>setCustomer(v=>({...v,details:event.target.value}))} rows={3}/></label>}</section>
              </div>}

              {(!groupedPricing&&step === 1) && <div className="form-stack">
                <div style={{padding:"14px",border:"1px solid #dbe4ee",borderRadius:12,background:"#fff"}}><h4 style={{margin:"0 0 10px"}}>{t("البحث الحي عن الدومين","Live domain availability search")}</h4><DomainLookup locale={locale} onDomainChange={value=>{setRequestedDomainName(value);const suffix=value.trim().toLowerCase();setDomain(suffix.endsWith(".com")?"com":suffix.endsWith(".eg")?"eg":"none");}}/></div>
                {(packageId==="multi"||packageId==="enterprise")&&<><label className="field-label">{copy("requestedPagesLabel")}<input type="number" min={packageId==="multi"?5:1} max={includedPages+(hasOption("extra_page")?5:0)} value={enabledPages} onChange={(event) => setPages(Math.max(packageId==="multi"?5:1,Math.min(includedPages+(hasOption("extra_page")?5:0),Number(event.target.value)||1)))} /></label><p className="field-hint">{packageId==="multi"?t("الباقة تشمل 5 صفحات؛ الصفحات الإضافية تُحسب منفصلة في الفاتورة.","The package includes 5 pages; additional pages are billed separately."):t("عدد الصفحات حسب متطلبات المشروع، والسعر يخضع للمراجعة.","Page count depends on your project requirements; pricing requires review.")}</p></>}{packageId!=="multi"&&packageId!=="enterprise"&&<p className="field-hint">{t("عدد الصفحات المشمولة في الباقة: ","Pages included in this package: ")}{includedPages||1}</p>}
                
                {hasOption("language")&&<div className="choice-row"><div><strong>{copy("languageChoiceTitle")}</strong><small>{copy("languageIncluded")}</small></div><div className="choice-toggle"><button type="button" className={!bilingual ? "selected" : ""} onClick={() => setBilingual(false)}>{copy("languageArabic")}</button><button type="button" className={bilingual ? "selected" : ""} onClick={() => setBilingual(true)}>{copy("languageBilingual")} <b>+{money(Number(serverOptions.find((option) => option.code === "language")?.price ?? 900))}</b></button></div></div>}
                <label className="field-label">{copy("colorPreferenceLabel")}<textarea value={stylePreference} onChange={(event) => setStylePreference(event.target.value)} placeholder={copy("colorPreferencePlaceholder")} rows={3} /></label>
                <div className="field-label">{copy("inspirationLabel")} <small>{copy("optionalLabel")}</small>{inspirationLinks.map((link, index) => <input key={index} value={link} onChange={(event) => setInspiration(index, event.target.value)} placeholder={copy("inspirationPlaceholder")} type="url" />)}<button type="button" className="inline-add" onClick={addInspiration}>{copy("addLink")}</button></div>
              </div>}

              {(!groupedPricing&&step === 2) && <div className="option-grid">
                {identityOptions.filter(item=>item.id==="provided"||hasOption(item.id)).map((item) => { const configured = serverOptions.find((option) => option.code === item.id); const itemName=localizeOption(item.id,configured?.name ?? item.name); const itemDescription=localizeOption(item.id,configured?.description || item.description,"description"); const itemPrice = configured ? Number(configured.price) : item.price; return <button type="button" key={item.id} className={identity === item.id ? "select-card selected" : "select-card"} onClick={() => setIdentity(item.id)}><span className="select-mark">{identity === item.id ? "✓" : "+"}</span><span className="select-card-copy"><strong>{itemName}</strong><small>{itemDescription}</small><b>{itemPrice ? `+${money(itemPrice)}`  : copy("includedInPackage")}</b></span></button>; })}
                {identity === "provided" && <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={(event) => setLogoName(event.target.files?.[0]?.name ?? "")} /><span className="upload-icon">↑</span><strong>{logoName || copy("logoUploadLabel")}</strong><small>{copy("logoUploadFormats")}</small></label>}
              </div>}

              {(!groupedPricing&&step === 3) && <div className="form-stack">
                {hasOption("writing")&&<div className="choice-row"><div><strong>{copy("contentWritingTitle")}</strong><small>{copy("contentIncluded")}</small></div><div className="choice-toggle"><button type="button" className={content === "provided" ? "selected" : ""} onClick={() => setContent("provided")}>{copy("provideContent")}</button><button type="button" className={content === "writing" ? "selected" : ""} onClick={() => setContent("writing")}>{copy("requestWriting")} <b>+{money(Number(serverOptions.find(option=>option.code==="writing")?.price??250))} {copy("perPageSuffix")}</b></button></div></div>}
                <h4 className="subsection-title">{copy("addonsTitle")}</h4>
                <div className="option-grid addon-grid">{addonOptions.filter(item=>hasOption(item.id)).map((item) => { const configured = serverOptions.find((option) => option.code === item.id); return <button type="button" key={item.id} className={addons.includes(item.id) ? "select-card selected" : "select-card"} onClick={() => toggleAddon(item.id)}><span className="select-mark">{addons.includes(item.id) ? "✓" : "+"}</span><span className="select-card-copy"><strong>{localizeOption(item.id,configured?.name ?? item.name)}</strong><small>{localizeOption(item.id,configured?.description || item.description,"description")}</small><b>+{money(Number(configured?.price ?? item.price))}</b></span></button>; })}
                  {packageId&&hasOption("extra_page")&&<div className={pages>includedPages?"select-card selected":"select-card"} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                    <span className="select-card-copy"><strong>{t("صفحات إضافية","Additional pages")}</strong><small>{t("حتى خمس صفحات فوق الباقة","Up to five pages beyond the package")}</small><b>+{money(Number(serverOptions.find(option=>option.code==="extra_page")?.price??1000))} {t("/ صفحة","/ page")}</b></span>
                    <span className="page-quantity" aria-label={t("عدد الصفحات الإضافية","Additional page count")}><button type="button" disabled={pages<=includedPages} onClick={()=>setPages(current=>Math.max(includedPages,current-1))} aria-label={t("تقليل الصفحات","Remove a page")}>−</button><output aria-live="polite">{Math.max(0,pages-includedPages)}</output><button type="button" disabled={pages-includedPages>=5} onClick={()=>setPages(current=>Math.max(includedPages,current)+1)} aria-label={t("زيادة الصفحات","Add a page")}>+</button></span>
                  </div>}
                  <button type="button" className={showOtherDetails?"select-card selected":"select-card"} onClick={()=>setShowOtherDetails(value=>!value)}><span className="select-mark">{showOtherDetails?"✓":"+"}</span><span className="select-card-copy"><strong>{t("تفاصيل أو متطلبات أخرى","Other details or requirements")}</strong><small>{t("أضف أي متطلبات خاصة لمراجعتها قبل تأكيد السعر.","Describe any special requirements for review before confirming the price.")}</small><b>{t("بعد مراجعة المتطلبات","Subject to review")}</b></span></button>
                </div>
                {showOtherDetails&&<label className="field-label">{t("تفاصيل إضافية","Additional details")}<textarea value={customer.details} onChange={event=>setCustomer(current=>({...current,details:event.target.value}))} placeholder={t("اكتب متطلباتك هنا","Describe your requirements here")} rows={3}/></label>}
                {serverOptions.some((option) => !builtInOptionCodes.has(option.code) && !obsoleteIdentityOptionCodes.has(option.code) && !["domain_com","domain_eg"].includes(option.code)) && <><h4 className="subsection-title">{copy("extraOptionsTitle")}</h4><div className="option-grid addon-grid">{serverOptions.filter((option) => !builtInOptionCodes.has(option.code) && !obsoleteIdentityOptionCodes.has(option.code) && !["domain_com","domain_eg"].includes(option.code)).map((option) => { const selected = option.is_required || selectedExtraOptionIds.includes(option.id); return <button type="button" key={option.id} disabled={option.is_required} className={selected ? "select-card selected" : "select-card"} onClick={() => toggleExtraOption(option.id)}><span className="select-mark">{selected ? "✓" : "+"}</span><span className="select-card-copy"><strong>{localizeOption(option.code,option.name)}{option.is_required ? copy("requiredSuffix") : ""}</strong><small>{localizeOption(option.code,option.description || copy("extraOptionFallback"),"description")}</small><AddonPrice item={option} locale={locale} prefix="+" suffix={option.pricing_type==="monthly"?` / ${copy("monthUnit")}`:option.pricing_type==="yearly"?` / ${copy("yearUnit")}`:option.pricing_type==="per_page"?` / ${copy("pageUnit")}`:""}/></span></button>; })}</div></>}
              </div>}

              {(!groupedPricing&&step === 4) && <div className="form-stack">
                <div className="hosting-callout"><span className="hosting-icon">✓</span><div><strong>{copy("hostingCalloutTitle")}</strong><p>{copy("hostingCalloutText")}</p></div></div>
                {hasOption("hosting")&&<button type="button" className={hosting ? "select-card selected" : "select-card"} onClick={() => setHosting((value) => !value)}><span className="select-mark">{hosting ? "✓" : "+"}</span><span className="select-card-copy"><strong>{serverOptions.find((option) => option.code === "hosting")?.name ?? copy("hostingOptionTitle")}</strong><small>{serverOptions.find((option) => option.code === "hosting")?.description || copy("hostingOptionDescription")}</small>{serverOptions.filter(o=>o.code==="hosting").map(o=><AddonPrice key={o.id} item={o} locale={locale} prefix="+"/>)}</span></button>}
                {hasOption("maintenance")&&<button type="button" className={maintenance ? "select-card selected" : "select-card"} onClick={() => setMaintenance((value) => !value)}><span className="select-mark">{maintenance ? "✓" : "+"}</span><span className="select-card-copy"><strong>{serverOptions.find((option) => option.code === "maintenance")?.name ?? copy("maintenanceTitle")}</strong><small>{serverOptions.find((option) => option.code === "maintenance")?.description || copy("maintenanceDescription")}</small><b>+{money(Number(serverOptions.find((option) => option.code === "maintenance")?.price ?? 3600))} / {copy("yearUnit")}</b></span></button>}
              </div>}

              {step === 5 && <div className="form-stack customer-fields">
                <label className="field-label">{copy("fullNameLabel")}<input name="name" required autoComplete="name" value={customer.name} onChange={updateCustomer} placeholder={copy("fullNamePlaceholder")} /></label>
                <label className="field-label">{copy("companyNameLabel")}<input name="company" autoComplete="organization" value={customer.company} onChange={updateCustomer} placeholder={copy("companyPlaceholder")} /></label>
                <label className="field-label">{copy("customerEmailLabel")}<input type="email" name="email" required autoComplete="email" value={customer.email} onChange={updateCustomer} placeholder={copy("emailPlaceholder")} /></label>
                <label className="field-label">{copy("customerPhoneLabel")}<input type="tel" name="phone" required minLength={7} autoComplete="tel" value={customer.phone} onChange={updateCustomer} placeholder={copy("customerPhonePlaceholder")} /></label>
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
                <div className="review-section"><h4>{copy("reviewInfoTitle")}</h4><div className="review-detail"><span>{copy("reviewPackageLabel")}</span><b>{selectedPackage?.name ?? copy("customQuoteLabel")}</b></div><div className="review-detail"><span>{copy("reviewPagesLabel")}</span><b>{pages} {copy(pages === 1 ? "pageSingular" : "pagePlural")}</b></div><div className="review-detail"><span>{copy("reviewLanguageLabel")}</span><b>{bilingual ? copy("languageBilingual") : copy("languageArabic")}</b></div><div className="review-detail"><span>{copy("reviewIdentityLabel")}</span><b>{localizeOption(identity,identityOptions.find(item=>item.id===identity)?.name || "")}</b></div><div className="review-detail"><span>{copy("reviewStartLabel")}</span><b>{startWindowLabel}</b></div></div>
                {sectorNeedsQuote&&<p className="api-notice">{t("تكلفة القطاع غير معتمدة، لا يمكن تسجيل شراء بهذه القيمة الجزئية.","This sector needs a formal quote; a partial estimate cannot be used for checkout.")}</p>}
                <div className="review-section"><h4>{copy("reviewPriceTitle")}</h4>{requestedDomainName&&<div className="review-detail"><span>{t("الدومين المختار","Selected domain")} · {domainContractNote}</span><b dir="ltr">{requestedDomainName}</b></div>}{sectorPrice&&!sectorPrice.needsCustomQuote&&sectorPrice.items.map(item=><div key={item.code} className="review-detail"><span>{item.name} · {item.pricingType==="yearly"?t("سنوي","annual"):item.pricingType==="monthly"?t("شهري","monthly"):t("مرة واحدة","one time")}</span><b>{money(item.price)}</b></div>)}{localizedQuoteItems.map((item) => <div key={item.id} className="review-detail"><span>{item.label}{item.period ? ` · ${item.period}` : ""}</span><b>{money(item.amount)}</b></div>)}<div className="review-detail review-subtotal"><span>{copy("reviewSubtotal")}</span><b>{money(quoteSubtotal)}</b></div><div className="review-detail"><span>{copy("reviewTax")} {vatRate}%</span><b>{money(quoteTax)}</b></div><div className="review-total"><span>{copy("reviewTotal")}</span><strong>{money(quoteTotal)}</strong></div><div className="review-detail recurring-row"><span>{t("رسوم شهرية","Monthly charges")}</span><b>{money(quoteSummary.monthly)}</b></div><div className="review-detail recurring-row"><span>{t("رسوم سنوية","Annual charges")}</span><b>{money(quoteRecurring)}</b></div></div>
                <div className="review-section"><h4>{copy("reviewContactTitle")}</h4><div className="review-detail"><span>{copy("fullNameLabel")}</span><b>{customer.name || "—"}</b></div><div className="review-detail"><span>{copy("customerEmailLabel")}</span><b>{customer.email || "—"}</b></div><div className="review-detail"><span>{copy("customerPhoneLabel")}</span><b>{customer.phone || "—"}</b></div></div>
                {!customerSignedIn&&<p className="api-notice">{t("لإكمال رحلة المعاينة الشخصية والعقد وتسليم المشروع، ","To manage previews, contracts and project delivery, ")}<a href={isEnglish?"/en/account/login":"/account/login"} style={{textDecoration:"underline",fontWeight:700}}>{t("سجّل الدخول","Sign in")}</a> أو <a href={isEnglish?"/en/account/register":"/account/register"} style={{textDecoration:"underline",fontWeight:700}}>{t("افتح حسابًا","Create an account")}</a>{t(". اختياراتك مؤقتة في هذه الجلسة فقط، وتُمسح عند تحديث الصفحة ما لم تُحفظ في حسابك.",". Your selections are temporary in this session and reset on refresh unless saved to your account.")}</p>}
                <div className="review-actions"><button type="button" className="button button-outline" onClick={downloadSummary}>{copy("downloadSummaryButton")}</button><button className="button" type="submit" disabled={(!selectedProjectDraftId && (!apiConfigured || sectorNeedsQuote)) || requestState === "sending" || !customer.name.trim() || !customer.email.trim() || !validCustomerPhone || !privacyAccepted}>{requestState === "sending" ? copy("sendingRequest") : copy("submitRequestButton")}<span>←</span></button></div>
                {!apiConfigured && !selectedProjectDraftId && <p className="api-notice">{catalogStatus === "loading" ? copy("loadingCatalogMessage") : catalogStatus === "unavailable" ? copy("unavailableCatalogMessage") : copy("catalogMismatchMessage")}</p>}
                {requestMessage && <p className={requestState === "sent" ? "success-message" : "error-message"} role="status">{requestMessage}</p>}
              </div>}

              {groupedPricing&&step<5?<div className="builder-controls"><button type="button" className="button button-outline" onClick={()=>window.location.assign(isEnglish?"/en#packages":"/#packages")}>{t("تغيير الباقة","Change package")}</button><button type="button" className="button" onClick={()=>setStep(5)}>{t("متابعة الطلب","Continue request")} ←</button></div>:<div className="builder-controls"><button type="button" className="button button-outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step <= 1}>{copy("previousStep")}</button><span>{step + 1} / {steps.length}</span>{step < steps.length - 1 ? <button type="button" className="button" onClick={() => { if(step===0&&packageId&&!readPagePreview("home",locale)){window.location.assign((isEnglish?"/en":"")+"/packages/"+encodeURIComponent(packageId)+"/pricing");return;} if(step===5){continueFromContact();return;} setStep((current) => Math.min(steps.length - 1, current + 1)); }}>{copy("nextStep")} <span>←</span></button> : <button type="button" className="button button-outline" onClick={() => setStep(1)}>{copy("editChoices")}</button>}</div>}
            </form>
          </div>
        <aside className="quote-sidebar">
            <div className="quote-summary-card">
              <div className="summary-heading"><div><span className="section-kicker">{copy("quoteSummaryKicker")}</span><h3>{copy("quoteSummaryTitle")}</h3></div><span className="summary-status">{packageId ? copy("quoteConfiguring") : copy("quoteStartSelecting")}</span></div>
              <div className="included-banner">{t("✦ 3 تصاميم و5 اتجاهات لونية مشمولة","✦ 3 design concepts and 5 color directions included")}</div>
              {!packageId ? <p className="empty-summary">{copy("quoteEmpty")}</p> : <>
                <div className="summary-lines">{sectorPrice&&!sectorPrice.needsCustomQuote&&sectorPrice.items.map(item=><div className="summary-line" key={item.code}><span>{item.name}<small>{item.pricingType==="yearly"?t("سنوي","annual"):item.pricingType==="monthly"?t("شهري","monthly"):t("مرة واحدة","one time")}</small></span><b>{money(item.price)}</b></div>)}{localizedQuoteItems.map((item) => <div className="summary-line" key={item.id}><span>{item.label}{item.period ? <small>{item.period}</small> : null}</span><b>{money(item.amount)}</b></div>)}</div>
                <div className="summary-math">{requestedDomainName&&<div><span>{t("الدومين المختار","Selected domain")} · {domainContractNote}</span><b dir="ltr">{requestedDomainName}</b></div>}<div><span>{copy("reviewSubtotal")}</span><b>{money(quoteSubtotal)}</b></div><div><span>{copy("reviewTax")} ({vatRate}%)</span><b>{money(quoteTax)}</b></div><div className="summary-grand"><span>{copy("reviewTotal")}</span><strong>{money(quoteTotal)}</strong></div></div>
                <div className="summary-annual"><span>{t("رسوم لمرة واحدة","One-time charges")}</span><b>{money(quoteSummary.oneTime)}</b></div>
                <div className="summary-annual"><span>{t("رسوم شهرية متكررة","Monthly recurring charges")}</span><b>{money(quoteSummary.monthly)}</b></div>
                <div className="summary-annual"><span>{t("رسوم سنوية متكررة","Annual recurring charges")}</span><b>{money(quoteSummary.yearly)}</b></div>
                {(quote.needsCustomQuote||sectorNeedsQuote) && <p className="custom-quote-note">{copy("quoteCustomNote")}</p>}
              </>}
              <p className="summary-footnote">{copy("quoteFootnote")}</p>
            </div>
            <div className="support-card"><span className="support-mark">?</span><div><strong>{copy("supportTitle")}</strong><p>{copy("supportDescription")}</p></div><a href="mailto:support@atsh-ai.com">{copy("supportEmail")} <span>↗</span></a><a href="#faq">{copy("supportFaq")} <span>←</span></a></div>
          </aside>
        </div>
      </section>}

      {!configuratorOnly&&!pricingOnly&&(()=>{const config=isEnglish?arabicReference:contentData;const ids=Array.isArray(config?.featuredSystemSlugs)?config.featuredSystemSlugs as string[]:null;const chosen=ids?ids.map(id=>featuredSystems.find(x=>x.slug===id)).filter((x):x is HomeCatalogItem=>!!x):featuredSystems.slice(0,4);const items=chosen.slice(0,4);const files=config?.featuredSystemHtml as Record<string,{assetId?:string;available?:boolean}>|undefined;const base=isEnglish?"/en":"";return <section className="packages-section" id="featured-systems"><div className="section-heading"><div>{copy("featuredSystemsHeading").trim()&&<h2>{copy("featuredSystemsHeading")}</h2>}</div><a className="button button-outline" href={base+"/catalog"}>{t("عرض جميع الأنظمة","View all systems")} ←</a></div><div className="package-grid">{items.map(item=><article className="package-card" key={item.slug}><FeaturedLiveDemo item={item} base={base} assetId={files?.[item.slug]?.assetId}/><h3>{item.name}</h3><p>{item.description}</p><div style={{marginTop:"auto",paddingTop:12,borderTop:"1px solid #dce4ef",display:"grid",gap:5}}><strong style={{color:"#203958",fontSize:18}}>{item.ownershipPrices?t("إيجار سنوي من: ","Annual rental from: ")+item.ownershipPrices.rent.price.toLocaleString(isEnglish?"en-EG":"ar-EG")+t(" ج.م"," EGP"):typeof item.basePrice==="number"&&Number.isFinite(item.basePrice)&&item.basePrice>=0?t("السعر الأساسي: ","Base price: ")+item.basePrice.toLocaleString(isEnglish?"en-EG":"ar-EG")+t(" ج.م"," EGP"):t("السعر حسب العرض","Price on request")}</strong><small>{t("قبل الضرائب والإضافات","Before taxes and add-ons")}</small></div><a className="button button-outline" href={base+"/catalog/"+encodeURIComponent(item.slug)+"?fullscreen=1&featuredHome=1"}>{t("معاينة تفاعلية","Interactive demo")} ←</a><a className="button button-primary package-cta" onClick={()=>{const prior=loadGuestWorkspace();saveGuestWorkspace({sectorSlug:item.slug,sectorName:item.name,sectorAddonCodes:prior.sectorSlug===item.slug?prior.sectorAddonCodes??[]:[],source:"catalog"});}} href={base+"/catalog/"+encodeURIComponent(item.slug)+"/pricing"}>{t("خصص نظامك واحسب السعر","Customize & calculate price")} ←</a></article>)}</div></section>;})()}
      {!configuratorOnly&&<><section className="faq-section" id="faq"><div className="section-heading"><div><span className="section-kicker">{copy("faqKicker")}</span><h2>{copy("faqTitle")}</h2></div><p>{copy("faqDescription")}</p></div><div className="faq-list">{faqItems.map((item, index) => <article key={item.id ?? index} className={openFaq === index ? "faq-item open" : "faq-item"}><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span className="faq-num">0{index + 1}</span><strong>{item.title}</strong><span className="faq-toggle">{openFaq === index ? "−" : "+"}</span></button>{openFaq === index && <p>{item.description}</p>}</article>)}</div></section>

      <section className="final-cta"><div><span className="section-kicker">{copy("finalKicker")}</span><h2>{copy("finalTitle")}</h2><p>{copy("finalDescription")}</p></div><button className="button" onClick={() => begin()}>{copy("finalCta")} <span>←</span></button></section>
      {customerSignedIn&&<div className="atsh-home-end-session"><button type="button" disabled={sessionEnding} onClick={async()=>{setSessionEnding(true);setSessionEndError("");try{const response=await fetch("/api/customer/auth/logout",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:"{}"});if(!response.ok)throw Error("Logout failed");window.location.assign(isEnglish?"/en/account/login":"/account/login");}catch{setSessionEndError(t("تعذر إنهاء الجلسة، حاول مرة أخرى.","Could not end the session. Please retry."));setSessionEnding(false);}}}>{sessionEnding?t("جارٍ إنهاء الجلسة…","Ending session…"):t("إنهاء الجلسة","End session")}</button>{sessionEndError&&<span role="alert">{sessionEndError}</span>}</div>}
      <footer className="platform-footer"><a className="platform-brand" href="#top"><img src={siteConfig.theme?.logoUrl || "/images/atsh-logo.jpg"} alt="" /><span><strong>ATSH <b>AI</b></strong><small>{copy("footerTagline")}</small></span></a>{pageLinks.map((item) => <a key={item.slug} href={`${isEnglish?"/en":""}/${item.slug}`}>{item.title}</a>)}<a href={`mailto:${copy("footerInfoEmail")}`}>{copy("footerInfoLabel")}</a><a href={`mailto:${copy("footerSalesEmail")}`}>{copy("footerSalesLabel")}</a><a href={`mailto:${copy("footerSupportEmail")}`}>{copy("footerSupportLabel")}</a><span>{copy("copyrightPrefix")} {new Date().getFullYear()} ATSH AI</span><a href="/admin">{copy("footerAdminLabel")}</a><a href="#top">{copy("footerTopLabel")}</a></footer>
      </>}
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
