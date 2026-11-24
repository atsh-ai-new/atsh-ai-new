"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { readPagePreview } from "@/lib/page-preview";

type ContentRecord = Record<string, unknown>;
type PagePayload = { page: { slug: string; content: ContentRecord } | null; theme?: { navy?: string; blue?: string; gold?: string; page?: string; logoUrl?: string; backgroundImageUrl?: string; fontFamily?: string; cardRadius?: number } | null };
type PageLink = { slug: string; title: string };
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asRecord = (value: unknown): ContentRecord => value && typeof value === "object" && !Array.isArray(value) ? value as ContentRecord : {};
const publicUrl = (value: string) => {
  if (/^\/(?!\/)[A-Za-z0-9/_?&=#.%:+-]*$/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
};

export default function ManagedPage({locale="ar"}:{locale?:"ar"|"en"}) { const en=locale==="en"; const home=en?"/en":"/";
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [payload, setPayload] = useState<PagePayload | null>(null);
  const [links, setLinks] = useState<PageLink[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const preview=readPagePreview(slug,locale);
    Promise.all([
      fetch(`/api/site-content/${encodeURIComponent(slug)}?locale=${locale}`, { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as PagePayload : null),
      fetch(`/api/site-pages?locale=${locale}`, { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as { pages?: PageLink[] } : { pages: [] })
    ]).then(([page, pageLinks]) => { if (active) { setPayload(preview?{...(page??{}),page:{slug,content:preview.content}}:page); setLinks((pageLinks.pages ?? []).filter((item) => item.slug !== "home")); } })
      .catch(() => { if (active) setPayload(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug,locale]);

  if (loading) return <main className="managed-page" lang={locale} dir={en?"ltr":"rtl"}><p className="managed-loading">{en?"Loading page…":"جارٍ تحميل الصفحة…"}</p></main>;
  if (!payload?.page) return <main className="managed-page" lang={locale} dir={en?"ltr":"rtl"}><section className="managed-missing"><span className="section-kicker">ATSH AI</span><h1>{en?"Page unavailable":"الصفحة غير متاحة"}</h1><p>{en?"This page has no published English version yet, or the link is incorrect.":"قد تكون الصفحة غير منشورة أو أن الرابط غير صحيح."}</p><a className="button" href={home}>{en?"Back to home →":"العودة للرئيسية ←"}</a></section></main>;

  const content = asRecord(payload.page.content);
  const theme = payload.theme ?? {};
  const safeBackground = publicUrl(asString(theme.backgroundImageUrl));
  const style = { "--navy": theme.navy, "--navy-2": theme.blue, "--blue": theme.blue, "--gold": theme.gold, "--page": theme.page, "--site-font": theme.fontFamily ? `\"${theme.fontFamily}\", system-ui, sans-serif` : undefined, "--card-radius": theme.cardRadius === undefined ? undefined : `${theme.cardRadius}px`, backgroundImage: safeBackground ? `linear-gradient(rgba(250,249,245,.94), rgba(250,249,245,.94)), url(${JSON.stringify(safeBackground)})` : undefined, backgroundSize: safeBackground ? "cover" : undefined, backgroundAttachment: safeBackground ? "fixed" : undefined } as CSSProperties;
  const title = asString(content.title, payload.page.slug === "works" ? (en?"Our work":"سجل الأعمال") : payload.page.slug);
  const description = asString(content.description);
  const isWorks = payload.page.slug === "works";
  const sections = (Array.isArray(content.sections) ? content.sections : []).map((value, index) => {
    const item = asRecord(value);
    const cards = Array.isArray(item.cards) ? item.cards.map((card) => asRecord(card)) : [];
    return { id: asString(item.id, `section-${index}`), eyebrow: asString(item.eyebrow), title: asString(item.title), body: asString(item.body), layout: item.layout === "cards" ? "cards" : "text", color: typeof item.backgroundColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.backgroundColor) ? item.backgroundColor : "#ffffff", textColor: typeof item.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.textColor) ? item.textColor : "#26313f", columns: [2,3,4].includes(Number(item.columns)) ? Number(item.columns) : 3, align: item.align === "center" ? "center" as const : "right" as const, visible: item.isVisible !== false, cards };
  }).filter((section) => section.visible);

  return <main className="managed-page" lang={locale} dir={en?"ltr":"rtl"} style={style}>
    <header className="managed-header"><a className="managed-brand" href={home}><img src={publicUrl(asString(theme.logoUrl)) || "/images/atsh-logo.jpg"} alt="ATSH AI" /><strong>ATSH <b>AI</b></strong></a><nav>{links.map((item) => <a key={item.slug} href={`${en?"/en":""}/${item.slug}`}>{item.title}</a>)}<a href={home}>{en?"Home":"الرئيسية"}</a></nav><a className="language-pill" href={en?`/${slug}`:`/en/${slug}`}>{en?"العربية":"English"}</a></header>
    <section className="managed-hero"><span className="section-kicker">ATSH AI</span><h1>{title}</h1>{!isWorks && description && <p>{description}</p>}</section>
    {isWorks ? <section className="managed-sections"><article className="managed-content-section" style={{textAlign:"center",maxWidth:900,margin:"0 auto",padding:"clamp(20px,5vw,48px)"}}><div className="managed-section-copy"><h2>{en?"Our clients’ privacy comes first":"خصوصية عملائنا أولويتنا"}</h2><p>{en?"We apologize for not displaying the actual websites and systems of our past and current clients, out of respect for their wishes, privacy and satisfaction.":"نعتذر عن عدم عرض سابقة أعمالنا من المواقع والأنظمة الفعلية لعملائنا، وذلك احترامًا لرغبات عملائنا السابقين والحاليين، وحفاظًا على خصوصيتهم ورضاهم."}</p><p>{en?"Instead, we offer a variety of similar interactive systems for different market needs. Explore them to find the right solution for your business, then add your own requirements and specifications to the selected system.":"ولكننا نقدم مجموعة متنوعة من الأنظمة التفاعلية المشابهة التي تلبي احتياجات الأسواق المختلفة، ويمكنك تصفحها للوصول إلى النظام المناسب لنشاطك، مع إمكانية إضافة متطلباتك ومواصفاتك الخاصة لتنفيذها ضمن النظام الذي تختاره."}</p><a className="button button-primary" style={{display:"inline-flex",marginTop:20}} href={en?"/en/catalog":"/catalog"}>{en?"Explore custom systems →":"تصفح الأنظمة المخصصة ←"}</a></div></article></section> : <section className="managed-sections">{sections.map((section) => <article className="managed-content-section" key={section.id} style={{ backgroundColor: section.color, color: section.textColor, textAlign: section.align }}><div className="managed-section-copy">{section.eyebrow && <span className="section-kicker">{section.eyebrow}</span>}{section.title && <h2>{section.title}</h2>}{section.body && <p>{section.body}</p>}</div>{section.layout === "cards" && <div className="managed-card-grid" style={{ gridTemplateColumns: `repeat(${section.columns},minmax(0,1fr))` }}>{section.cards.map((card, index) => { const image = publicUrl(asString(card.imageUrl)); const href = publicUrl(asString(card.href)); const cardTitle = asString(card.title); return <article className="managed-card" key={asString(card.id, `card-${index}`)}>{image && <img src={image} alt="" />}{cardTitle && <h3>{cardTitle}</h3>}{asString(card.description) && <p>{asString(card.description)}</p>}{href && asString(card.linkLabel) && <a href={href}>{asString(card.linkLabel)} ←</a>}</article>; })}</div>}</article>)}</section>}
    <footer className="managed-footer"><span>© {new Date().getFullYear()} ATSH AI</span><a href="mailto:info@atsh-ai.com">{en?"Contact us":"تواصل معنا"}</a><a href={home}>{en?"Home":"الرئيسية"}</a></footer>
  </main>;
}
