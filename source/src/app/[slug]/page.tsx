"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";

type ContentRecord = Record<string, unknown>;
type Project = { id: string; title: string; client: string; category: string; description: string; imageUrl: string; projectUrl: string; isPublished: boolean; sortOrder: number };
type PagePayload = { page: { slug: string; content: ContentRecord } | null; theme?: { navy?: string; blue?: string; gold?: string; page?: string; logoUrl?: string; backgroundImageUrl?: string; fontFamily?: string; cardRadius?: number } | null };
type PageLink = { slug: string; title: string };
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asRecord = (value: unknown): ContentRecord => value && typeof value === "object" && !Array.isArray(value) ? value as ContentRecord : {};
const publicUrl = (value: string) => {
  if (/^\/(?!\/)[A-Za-z0-9/_?&=#.%:+-]*$/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
};

export default function ManagedPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [payload, setPayload] = useState<PagePayload | null>(null);
  const [links, setLinks] = useState<PageLink[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/site-content/${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as PagePayload : null),
      fetch("/api/site-pages", { cache: "no-store" }).then(async (response) => response.ok ? await response.json() as { pages?: PageLink[] } : { pages: [] })
    ]).then(([page, pageLinks]) => { if (active) { setPayload(page); setLinks((pageLinks.pages ?? []).filter((item) => item.slug !== "home")); } })
      .catch(() => { if (active) setPayload(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  if (loading) return <main className="managed-page" dir="rtl"><p className="managed-loading">جارٍ تحميل الصفحة…</p></main>;
  if (!payload?.page) return <main className="managed-page" dir="rtl"><section className="managed-missing"><span className="section-kicker">ATSH AI</span><h1>الصفحة غير متاحة</h1><p>قد تكون الصفحة غير منشورة أو أن الرابط غير صحيح.</p><a className="button" href="/">العودة للرئيسية ←</a></section></main>;

  const content = asRecord(payload.page.content);
  const theme = payload.theme ?? {};
  const safeBackground = publicUrl(asString(theme.backgroundImageUrl));
  const style = { "--navy": theme.navy, "--navy-2": theme.blue, "--blue": theme.blue, "--gold": theme.gold, "--page": theme.page, "--site-font": theme.fontFamily ? `\"${theme.fontFamily}\", system-ui, sans-serif` : undefined, "--card-radius": theme.cardRadius === undefined ? undefined : `${theme.cardRadius}px`, backgroundImage: safeBackground ? `linear-gradient(rgba(250,249,245,.94), rgba(250,249,245,.94)), url(${JSON.stringify(safeBackground)})` : undefined, backgroundSize: safeBackground ? "cover" : undefined, backgroundAttachment: safeBackground ? "fixed" : undefined } as CSSProperties;
  const title = asString(content.title, payload.page.slug === "works" ? "سجل الأعمال" : payload.page.slug);
  const description = asString(content.description);
  const isWorks = payload.page.slug === "works";
  const projects: Project[] = (Array.isArray(content.projects) ? content.projects : []).map((value, index) => {
    const item = asRecord(value);
    return { id: asString(item.id, `work-${index}`), title: asString(item.title), client: asString(item.client), category: asString(item.category), description: asString(item.description), imageUrl: asString(item.imageUrl), projectUrl: asString(item.projectUrl), isPublished: item.isPublished !== false, sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index };
  }).filter((project) => project.isPublished && project.title).sort((a, b) => a.sortOrder - b.sortOrder);
  const sections = (Array.isArray(content.sections) ? content.sections : []).map((value, index) => {
    const item = asRecord(value);
    const cards = Array.isArray(item.cards) ? item.cards.map((card) => asRecord(card)) : [];
    return { id: asString(item.id, `section-${index}`), eyebrow: asString(item.eyebrow), title: asString(item.title), body: asString(item.body), layout: item.layout === "cards" ? "cards" : "text", color: typeof item.backgroundColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.backgroundColor) ? item.backgroundColor : "#ffffff", textColor: typeof item.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(item.textColor) ? item.textColor : "#26313f", columns: [2,3,4].includes(Number(item.columns)) ? Number(item.columns) : 3, align: item.align === "center" ? "center" as const : "right" as const, visible: item.isVisible !== false, cards };
  }).filter((section) => section.visible);

  return <main className="managed-page" dir="rtl" style={style}>
    <header className="managed-header"><a className="managed-brand" href="/"><img src={publicUrl(asString(theme.logoUrl)) || "/images/atsh-logo.jpg"} alt="ATSH AI" /><strong>ATSH <b>AI</b></strong></a><nav>{links.map((item) => <a key={item.slug} href={`/${item.slug}`}>{item.title}</a>)}<a href="/">الرئيسية</a></nav><a className="button button-small" href="/admin">لوحة الإدارة</a></header>
    <section className="managed-hero"><span className="section-kicker">ATSH AI</span><h1>{title}</h1>{description && <p>{description}</p>}</section>
    {isWorks ? <section className="managed-projects">{projects.length ? projects.map((project) => {
      const image = publicUrl(project.imageUrl), href = publicUrl(project.projectUrl);
      return <article className="managed-project-card" key={project.id}>{image ? <img src={image} alt={project.title} /> : <div className="managed-project-placeholder">ATSH AI</div>}<div className="managed-project-copy">{project.category && <span className="section-kicker">{project.category}</span>}<h2>{project.title}</h2>{project.client && <small>{project.client}</small>}{project.description && <p>{project.description}</p>}{href && <a href={href} target="_blank" rel="noreferrer">عرض المشروع ↗</a>}</div></article>;
    }) : <div className="managed-empty"><span>✦</span><h2>{asString(content.emptyTitle, "قريبًا نضيف أعمالنا هنا")}</h2><p>{asString(content.emptyDescription, "يتم تجهيز نماذج من المشروعات السابقة لعرضها في هذا القسم.")}</p></div>}</section> : <section className="managed-sections">{sections.map((section) => <article className="managed-content-section" key={section.id} style={{ backgroundColor: section.color, color: section.textColor, textAlign: section.align }}><div className="managed-section-copy">{section.eyebrow && <span className="section-kicker">{section.eyebrow}</span>}{section.title && <h2>{section.title}</h2>}{section.body && <p>{section.body}</p>}</div>{section.layout === "cards" && <div className="managed-card-grid" style={{ gridTemplateColumns: `repeat(${section.columns},minmax(0,1fr))` }}>{section.cards.map((card, index) => { const image = publicUrl(asString(card.imageUrl)); const href = publicUrl(asString(card.href)); const cardTitle = asString(card.title); return <article className="managed-card" key={asString(card.id, `card-${index}`)}>{image && <img src={image} alt="" />}{cardTitle && <h3>{cardTitle}</h3>}{asString(card.description) && <p>{asString(card.description)}</p>}{href && asString(card.linkLabel) && <a href={href}>{asString(card.linkLabel)} ←</a>}</article>; })}</div>}</article>)}</section>}
    <footer className="managed-footer"><span>© {new Date().getFullYear()} ATSH AI</span><a href="mailto:info@atsh-ai.com">تواصل معنا</a><a href="/">الرئيسية</a></footer>
  </main>;
}
