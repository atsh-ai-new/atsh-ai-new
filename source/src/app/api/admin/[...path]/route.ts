import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };
const DEFAULT_ADMIN_BODY_BYTES = 5 * 1024 * 1024;
const DEMO_CONTENT_BODY_BYTES = 68 * 1024 * 1024;
const CONTENT_STUDIO_BODY_BYTES = 12 * 1024 * 1024;
const PRIVATE_DELIVERY_BYTES = 512 * 1024 * 1024;

async function readLimitedBody(request: Request, maxBytes: number): Promise<{ body?: ArrayBuffer; tooLarge: boolean }> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    await request.body?.cancel().catch(() => undefined);
    return { tooLarge: true };
  }
  const reader = request.body?.getReader();
  if (!reader) return { tooLarge: false };

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const body = new ArrayBuffer(total);
  const output = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body, tooLarge: false };
}

async function proxy(request: Request, context: RouteContext) {
  const base = process.env.ATSH_API_BASE_URL?.trim();
  if (!base) return NextResponse.json({ message: "واجهة ATSH API غير مهيأة." }, { status: 503 });
  let destination: URL;
  try {
    destination = new URL(base);
    const internalApi = destination.protocol === "http:" && (destination.hostname === "atsh-website-api" || destination.hostname === "atsh-website-api-internal");
    if (destination.protocol !== "https:" && process.env.NODE_ENV === "production" && !internalApi) throw new Error("HTTPS required");
  } catch {
    return NextResponse.json({ message: "عنوان ATSH API غير صالح." }, { status: 503 });
  }

  const { path } = await context.params;
  if (!path.length || path.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    return NextResponse.json({ message: "مسار الإدارة غير صالح." }, { status: 400 });
  }
  const safePath = path.map((part) => encodeURIComponent(part)).join("/");
  const target = new URL(`/api/admin/${safePath}`, destination);
  target.search = new URL(request.url).search;
  const headers = new Headers({ Accept: request.headers.get("accept") ?? "application/json" });
  for (const name of ["content-type", "authorization", "cookie", "origin", "x-csrf-token", "idempotency-key", "x-file-name", "x-analysis-consent", "x-manager-notes-base64"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const method = request.method.toUpperCase();
  let body: ArrayBuffer | ReadableStream<Uint8Array> | undefined;
  const isPrivateUpload = method === "PUT" && path[0] === "deliverables" && path[2] === "file";
  if (method !== "GET" && method !== "HEAD") {
    const isContentStudioFile = path[0] === "content-studio" && path[1] === "analyze";
    const isContentStudioRequest = path[0] === "content-studio";
    const isPrivateFile = path[0] === "deliverables" && path[2] === "file";
    if (isPrivateUpload) {
      const length = request.headers.get("content-length");
      if (length && (!/^\d+$/.test(length) || Number(length) > PRIVATE_DELIVERY_BYTES)) return NextResponse.json({message:"الملف أكبر من 512 ميجابايت"},{status:413});
      body = request.body ?? undefined;
    } else {
      const isChatFile = (path[0] === "internal-chat" || path[0] === "internal-groups" || path[0] === "live-support") && path[2] === "files";
      const isDemoContent = path[0] === "demo-assets" || path[0] === "home-featured" || (path[0] === "pages" && ["catalog","home"].includes(path[1])) || (path[0] === "page-drafts" && path[1] === "home");
      const limited = await readLimitedBody(request, path[0] === "demo-assets" ? 10 * 1024 * 1024 : isDemoContent ? DEMO_CONTENT_BODY_BYTES : path[0] === "video-upload" ? 25 * 1024 * 1024 : isChatFile ? 20 * 1024 * 1024 : isContentStudioFile || isContentStudioRequest ? CONTENT_STUDIO_BODY_BYTES : DEFAULT_ADMIN_BODY_BYTES);
      if (limited.tooLarge) return NextResponse.json({ message: "حجم الطلب أكبر من الحد المسموح." }, { status: 413 });
      body = limited.body;
    }
  }

  try {
    const isDemoContent = path[0] === "demo-assets" || path[0] === "home-featured" || (path[0] === "pages" && ["catalog","home"].includes(path[1])) || (path[0] === "page-drafts" && path[1] === "home");
    const isProductionRequest = path[0] === "content-studio" && path[2] === "produce";
    const isAnalysisRequest = path[0] === "content-studio" && path[1] === "analyze";
    const upstream = await fetch(target, { method, headers, body, ...(isPrivateUpload ? {duplex:"half" as const} : {}), cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(isProductionRequest ? 250000 : isAnalysisRequest ? 125000 : isPrivateUpload ? 600000 : path[0] === "video-upload" ? 120000 : isDemoContent || (path[0] === "pages" && path.length === 1) ? 120000 : 12000) });
    const payload = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    for (const name of ["content-disposition","x-content-type-options"]) { const value=upstream.headers.get(name); if(value) responseHeaders.set(name,value); }
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) responseHeaders.set("cache-control", cacheControl);
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
    return new Response(payload, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ message: "تعذر الاتصال بخادم ATSH API." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;

export const DELETE = proxy;
