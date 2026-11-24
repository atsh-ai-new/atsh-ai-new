import { NextResponse } from "next/server";
export const runtime = "nodejs";
const MAX_BYTES=12*1024;
async function proxy(request:Request,context:{params:Promise<{action:string}>}) {
 const {action}=await context.params; if(!["start","messages"].includes(action)||(action==="start"&&request.method!=="POST"))return new Response(null,{status:404});
  const originHeader=request.headers.get("origin");
  // Traefik may forward the request to Next.js over internal HTTP; request.url
  // is therefore not a reliable public-site origin in production.
  let allowedOrigin=false;
  try{
    const expectedOrigin=process.env.NODE_ENV==="production"
      ? new URL(process.env.ATSH_SITE_ORIGIN??"https://atsh-ai.com").origin
      : new URL(request.url).origin;
    // Mobile browsers may open the site via www while desktop uses the apex.
    // Accept only the canonical site and its www alias; forward the canonical
    // origin upstream because the API allowlist may contain only the apex.
    const requestedOrigin=originHeader===null?null:new URL(originHeader);
    const canonical=new URL(expectedOrigin);
    allowedOrigin=requestedOrigin!==null && requestedOrigin.protocol===canonical.protocol &&
      (requestedOrigin.host===canonical.host ||
       (canonical.hostname.startsWith("www.")
         ? requestedOrigin.host===canonical.host.slice(4)
         : requestedOrigin.host===`www.${canonical.host}`));
  }catch{/* Reject missing or malformed origins. */}
  if(request.method!=="GET"&&(!allowedOrigin||!originHeader))return NextResponse.json({error:"Origin not allowed"},{status:403});
  const raw=await request.text();
  if(Buffer.byteLength(raw,"utf8")>MAX_BYTES)return NextResponse.json({error:"Request too large"},{status:413});
  let base:URL;
  try{
    base=new URL(process.env.ATSH_API_BASE_URL??"");
    const internal=base.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(base.hostname);
    if(base.protocol!=="https:"&&!(process.env.NODE_ENV==="production"&&internal)&&process.env.NODE_ENV==="production")throw Error("Invalid origin");
    if(!["http:","https:"].includes(base.protocol))throw Error("Invalid scheme");
  }catch{return NextResponse.json({error:"API unavailable"},{status:503});}
  try{
    const upstream=await fetch(new URL("/api/visitor/live-support/"+action,base),{
      method:request.method,headers:{"Content-Type":"application/json","x-support-token":request.headers.get("x-support-token")||"","Origin":process.env.NODE_ENV==="production" ? new URL(process.env.ATSH_SITE_ORIGIN??"https://atsh-ai.com").origin : (originHeader||new URL(request.url).origin)},body:request.method==="GET"?undefined:raw,
      cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(30000)
    });
    const contentType=upstream.headers.get("content-type");
    return new Response(await upstream.arrayBuffer(),{
      status:upstream.status,
      headers:{"content-type":contentType?.includes("application/json")?"application/json":"application/json","cache-control":"no-store"}
    });
  }catch{return NextResponse.json({error:"GPT connection unavailable"},{status:502});}
}

export const GET=proxy; export const POST=proxy;
