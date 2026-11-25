import { NextRequest, NextResponse } from "next/server";
import {LOCALE_COOKIE,selectBrowserLocale} from "./lib/browser-locale";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Negotiate only the neutral entry URL; explicit language routes stay stable.
  if (pathname === "/") {
    const locale=selectBrowserLocale(request.cookies.get(LOCALE_COOKIE)?.value,request.headers.get("accept-language"));
    const response=NextResponse.redirect(new URL("/"+locale+request.nextUrl.search,request.url));
    response.headers.set("Vary","Accept-Language, Cookie");
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  if (pathname === "/ar" || pathname === "/ar/") {
    requestHeaders.set("x-atsh-locale", "ar");
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  requestHeaders.set("x-atsh-locale", pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ar");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/((?!_next|api|favicon.ico|images).*)"] };
