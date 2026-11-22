import {NextResponse} from "next/server";
import {lookupRegistry, normalizeDomain} from "@/lib/live-domain-rdap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, {count: number; resetAt: number}>();
let backendRateLimitedUntil = 0;
const NO_STORE = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"};

function allowFallback(request: Request): boolean {
 const ip = request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
 const now=Date.now();
 const previous=attempts.get(ip);
 if(attempts.size>2000)attempts.clear();
 if(!previous||previous.resetAt<now) {
  attempts.set(ip,{count:1,resetAt:now+60_000});
  return true;
 }
 if(previous.count>=60)return false;
 previous.count++;
 return true;
}

function backendUrl(): URL | null {
 try {
  const base=new URL(process.env.ATSH_API_BASE_URL??"");
  const internal=base.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(base.hostname);
  if(!["http:","https:"].includes(base.protocol)||
     (process.env.NODE_ENV==="production"&&base.protocol!=="https:"&&!internal))return null;
  return base;
 }catch{return null;}
}

export async function GET(request: Request) {
 const domain=normalizeDomain(new URL(request.url).searchParams.get("domain")??"");
 if(!domain)return NextResponse.json({error:"Invalid domain"},{status:400,headers:NO_STORE});

 // Prefer the existing API to retain registrar-confirmed Namecheap availability.
 // A missing/old/unreachable backend must not disable public registry lookup.
 const base=backendUrl();
 if(base && Date.now() >= backendRateLimitedUntil){
  const target=new URL("/api/domains/check",base);
  target.searchParams.set("domain",domain);
  try{
   const upstream=await fetch(target,{cache:"no-store",signal:AbortSignal.timeout(4000),redirect:"error"});
   if(upstream.status===429){
    // Registrar/backend throttling must not block the independent registry fallback.
    backendRateLimitedUntil=Date.now()+60_000;
   }
   if(upstream.ok){
    const data=await upstream.json().catch(()=>null);
    if(data&&data.domain===domain&&["namecheap","rdap"].includes(data.provider))
     return NextResponse.json(data,{status:200,headers:NO_STORE});
   }
  }catch{
   // Fall back to IANA RDAP on this Next server, without any registrar credentials.
  }
 }
 if(!allowFallback(request))
  return NextResponse.json({error:"Rate limit exceeded"},{status:429,headers:NO_STORE});
 try{
  const checked=await lookupRegistry(domain);
  return NextResponse.json(checked,{status:200,headers:NO_STORE});
 }catch{
  return NextResponse.json({error:"Live registry temporarily unavailable"},{status:502,headers:NO_STORE});
 }
}
