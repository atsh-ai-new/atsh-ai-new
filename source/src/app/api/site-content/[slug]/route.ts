import { NextResponse } from "next/server";

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
  const locale = new URL(request.url).searchParams.get("locale");
  if (locale) target.searchParams.set("locale", locale);
  try {
    const upstream = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    const payload = await upstream.arrayBuffer();
    return new Response(payload, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "تعذر الاتصال بإعدادات محتوى ATSH AI." }, { status: 502 });
  }
}
