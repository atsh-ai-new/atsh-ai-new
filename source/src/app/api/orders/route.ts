import { NextResponse } from "next/server";

export const runtime = "nodejs";

function ordersUrl() {
  const base = process.env.ATSH_API_BASE_URL?.trim();
  if (!base) return null;
  try {
    const origin = new URL(base);
    const internalApi = origin.protocol === "http:" && (origin.hostname === "atsh-website-api" || origin.hostname === "atsh-website-api-internal");
    if (origin.protocol !== "https:" && process.env.NODE_ENV === "production" && !internalApi) return null;
    return new URL("/api/orders", origin).toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const destination = ordersUrl();
  if (!destination) {
    return NextResponse.json({ message: "واجهة ATSH API غير مهيأة بعد. لم يتم إرسال أو حفظ بيانات الطلب." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "بيانات الطلب غير صالحة." }, { status: 400 });
  }

  const input = body as { packageId?: string; customerName?: string; email?: string; phone?: string };
  if (!input.packageId || !input.customerName?.trim() || !input.phone?.trim()) {
    return NextResponse.json({ message: "الاسم والبريد والهاتف مطلوبة." }, { status: 400 });
  }

  try {
    const upstream = await fetch(destination, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(request.headers.get("cookie") ? { Cookie: request.headers.get("cookie")! } : {}), ...(request.headers.get("origin") ? { Origin: request.headers.get("origin")! } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });
    const payload = await upstream.json().catch(() => ({}));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "تعذر الوصول إلى خادم الطلبات. لم يتم تسجيل الطلب." }, { status: 502 });
  }
}
