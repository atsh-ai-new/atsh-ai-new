import { NextResponse } from "next/server";
import { withDemoStorage } from "@/lib/sector-catalog";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

function apiOrigin() {
  const base = process.env.ATSH_API_BASE_URL?.trim();
  if (!base) return null;
  try {
    const origin = new URL(base);
    const internalApi = origin.protocol === "http:" && (origin.hostname === "atsh-website-api" || origin.hostname === "atsh-website-api-internal");
    if (origin.protocol !== "https:" && process.env.NODE_ENV === "production" && !internalApi) return null;
    return origin;
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: RouteContext) {
  const origin = apiOrigin();
  if (!origin) return NextResponse.json({ message: "واجهة ATSH API غير مهيأة." }, { status: 503 });

  const { slug } = await context.params;
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return NextResponse.json({ message: "اسم الصفحة غير صالح." }, { status: 400 });

  const target = new URL(`/api/site-content/${encodeURIComponent(slug)}`, origin);
  const query = new URL(request.url).searchParams;
  const locale = query.get("locale");
  const demo = query.get("demo");
  const thumbnail = query.get("thumbnail");
  if (thumbnail) {
    if(slug!=="catalog"||! /^[a-f0-9]{64}$/.test(thumbnail))return NextResponse.json({message:"Invalid thumbnail"},{status:400});
    target.pathname="/api/site-content/demo-thumbnail/"+thumbnail;
  } else if (demo) {
    if (!["home","catalog"].includes(slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(demo)) return NextResponse.json({message:"Invalid demo"},{status:400});
    target.pathname += "/demo/"+encodeURIComponent(demo);
  } else if (query.get("metadata")==="1") target.searchParams.set("metadata","1");
  if (locale) target.searchParams.set("locale", locale);
  try {
    const upstream = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(["home","catalog"].includes(slug)?120000:12000) });
    if(demo && query.get("document")==="1" && upstream.ok){
      const payload=await upstream.json();
      if(typeof payload.html!=="string" || Buffer.byteLength(payload.html,"utf8")>10*1024*1024)return new Response("Invalid demo",{status:400});
      const policy="sandbox allow-scripts allow-modals; default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com; img-src https: data: blob:; font-src https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com data:; media-src https: data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; object-src 'none'; frame-ancestors 'self'";
      return new Response(withDemoStorage(payload.html),{headers:{"content-type":"text/html; charset=utf-8","content-security-policy":policy,"cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": thumbnail ? (upstream.headers.get("cache-control") ?? "no-store") : "no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "تعذر الاتصال بإعدادات محتوى ATSH AI." }, { status: 502 });
  }
}
