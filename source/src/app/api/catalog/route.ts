import { NextResponse } from "next/server";

export const runtime = "nodejs";

function catalogUrl() {
  const base = process.env.ATSH_API_BASE_URL?.trim();
  if (!base) return null;
  try {
    const origin = new URL(base);
    const internalApi = origin.protocol === "http:" && (origin.hostname === "atsh-website-api" || origin.hostname === "atsh-website-api-internal");
    if (origin.protocol !== "https:" && process.env.NODE_ENV === "production" && !internalApi) return null;
    return new URL("/api/catalog", origin).toString();
  } catch {
    return null;
  }
}

export async function GET() {
  const destination = catalogUrl();
  if (!destination) return NextResponse.json({ message: "واجهة ATSH API غير مهيأة." }, { status: 503 });

  try {
    const upstream = await fetch(destination, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    const payload = await upstream.arrayBuffer();
    return new Response(payload, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" }
    });
  } catch {
    return NextResponse.json({ message: "تعذر الاتصال بكتالوج ATSH AI." }, { status: 502 });
  }
}
