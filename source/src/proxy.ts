import { NextRequest, NextResponse } from "next/server";
import {privatePath} from "./lib/seo";
import {LOCALE_COOKIE,LOCALE_DEVICE_COOKIE,selectBrowserLocale} from "./lib/browser-locale";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // The administration UI has one canonical route, not localized copies.
  // Do not let the global locale switch send administrators to a public slug
  // or a missing nested page. Preserve the query string.
  if (pathname === "/en/admin" || pathname.startsWith("/en/admin/")) {
    const target = request.nextUrl.clone();
    target.pathname = pathname.slice(3);
    return NextResponse.redirect(target);
  }

  // Negotiate only the neutral entry URL; explicit language routes stay stable.
  if (pathname === "/") {
    const locale=selectBrowserLocale(request.cookies.get(LOCALE_COOKIE)?.value,request.headers.get("accept-language"),request.cookies.get(LOCALE_DEVICE_COOKIE)?.value);
    const response=NextResponse.redirect(new URL("/"+locale+request.nextUrl.search,request.url));
    response.headers.set("Vary","Accept-Language, Cookie");
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  if (pathname === "/ar" || pathname === "/ar/") {
    requestHeaders.set("x-atsh-locale", "ar");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  requestHeaders.set("x-atsh-locale", pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ar");
  const response=NextResponse.next({ request: { headers: requestHeaders } });
  if(privatePath(pathname)) response.headers.set("X-Robots-Tag","noindex, follow");
  return response;
}

export const config = { matcher: ["/((?!_next|api|favicon.ico|images).*)"] };
