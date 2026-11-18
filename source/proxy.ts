import { NextRequest,NextResponse } from "next/server";
export function proxy(request:NextRequest){
 const headers=new Headers(request.headers);
 headers.set("x-atsh-locale",request.nextUrl.pathname==="/en"||request.nextUrl.pathname.startsWith("/en/")?"en":"ar");
 return NextResponse.next({request:{headers}});
}
export const config={matcher:["/((?!_next|api|favicon.ico|images).*)"]};
