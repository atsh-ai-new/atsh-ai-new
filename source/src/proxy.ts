import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // English is the public default; retain Arabic at /ar.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/en" + request.nextUrl.search, request.url));
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
