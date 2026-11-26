import type { Metadata } from "next";

export const SITE_URL = "https://atsh-ai.com";
export type Locale = "ar" | "en";
export const absolute = (path: string) => new URL(path, SITE_URL).href;
export const homePath = (locale: Locale) => "/" + locale;
export const localPath = (locale: Locale, path: string) => locale === "en" ? "/en" + path : path;
export const privatePath = (path: string) => /^\/(?:en\/|ar\/)?(?:admin|account|customer-portal|commercial|configure|packages|api|demos|assistant-knowledge)(?:\/|$)/.test(path) || /^\/(?:en\/)?catalog\/[^/]+\/pricing(?:\/|$)/.test(path);
export const validPublicSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100 &&
  !new Set(["home","ar","en","catalog","templates","start","admin","account","api","configure","customer-portal","commercial","packages","demos","images","assistant-knowledge"]).has(slug);

export function cleanText(value: unknown, max = 160): string {
  if (typeof value !== "string") return "";
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max-1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.65 ? cut.slice(0,space) : cut) + "…";
}
export function pageMetadata(locale: Locale, path: string, title: string, description: string, alternate?: string, image = "/images/atsh-logo.jpg"): Metadata {
  const canonical = absolute(path);
  const languages: Record<string,string> = { [locale]: canonical };
  if (alternate) { languages[locale === "ar" ? "en" : "ar"] = absolute(alternate); languages["x-default"] = absolute(locale === "en" ? path : alternate); }
  const fullTitle = cleanText(title, 85) + " | ATSH AI";
  const summary = cleanText(description);
  return { title:fullTitle, description:summary, alternates:{canonical,languages},
    robots:{index:true,follow:true}, openGraph:{title:fullTitle,description:summary,url:canonical,siteName:"ATSH AI",type:"website",locale:locale==="en"?"en_US":"ar_EG",images:[{url:absolute(image),alt:title}]},
    twitter:{card:"summary",title:fullTitle,description:summary,images:[absolute(image)]} };
}
export function homeMetadata(locale: Locale) {
  return pageMetadata(locale,homePath(locale),locale==="ar"?"شركة تصميم مواقع وتطبيقات وأنظمة إدارية":"Web, App & Business Software Development",
    locale==="ar"?"ATSH AI لتطوير المواقع والتطبيقات والأنظمة الإدارية وحلول الذكاء الاصطناعي. استكشف الأنظمة التفاعلية وباقات البرمجة والأسعار في مصر.":"ATSH AI builds websites, mobile apps, business management systems and AI solutions. Explore interactive demos and transparent software pricing in Egypt.",homePath(locale==="ar"?"en":"ar"));
}
export function catalogMetadata(locale: Locale) {
  return pageMetadata(locale,localPath(locale,"/catalog"),locale==="ar"?"أنظمة إدارة الأعمال والبرامج الجاهزة":"Business Management Software & Interactive Demos",
    locale==="ar"?"استكشف أنظمة ATSH AI للعيادات والصيدليات والمدارس والحضانات والمتاجر والإدارة. جرّب النظام واحسب سعر الإيجار أو شراء النسخة أو ملكية الكود.":"Explore ATSH AI software for clinics, pharmacies, schools, nurseries, retail and business operations. Try interactive demos and compare licensing options.",localPath(locale==="ar"?"en":"ar","/catalog"));
}
export const noIndex: Metadata = { robots:{index:false,follow:true} };
