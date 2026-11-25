import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const base = process.env.ATSH_API_BASE_URL?.trim();
  if (!base) return NextResponse.json({ message: "واجهة ATSH API غير مهيأة." }, { status: 503 });
  let origin: URL;
  try {
    origin = new URL(base);
    const internalApi = origin.protocol === "http:" && (origin.hostname === "atsh-website-api" || origin.hostname === "atsh-website-api-internal");
    if (origin.protocol !== "https:" && process.env.NODE_ENV === "production" && !internalApi) throw new Error("HTTPS required");
  } catch {
    return NextResponse.json({ message: "عنوان ATSH API غير صالح." }, { status: 503 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const upstream = await fetch(new URL(`/api/site-video/${encodeURIComponent(id)}`, origin), { cache: "no-store", headers: request.headers.get("range") ? {range:request.headers.get("range")!} : {}, signal: AbortSignal.timeout(120000) });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
        ...(upstream.headers.get("content-length") ? {"content-length":upstream.headers.get("content-length")!}:{}),
        ...(upstream.headers.get("content-range") ? {"content-range":upstream.headers.get("content-range")!}:{}),
        "accept-ranges":"bytes",
        "cache-control": upstream.headers.get("cache-control") ?? "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ message: "تعذر تحميل الفيديو." }, { status: 502 });
  }
}
