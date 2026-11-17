import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(){
 const base=process.env.ATSH_API_BASE_URL?.trim();
 if(!base)return NextResponse.json({error:"Backend not configured"},{status:503});
 try{
  const u=new URL(base);
  const internal=u.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(u.hostname);
  if(process.env.NODE_ENV==="production"&&u.protocol!=="https:"&&!internal)throw Error("Insecure backend URL");
  const upstream=await fetch(new URL("/api/templates",u),{cache:"no-store",signal:AbortSignal.timeout(12000)});
  return new Response(await upstream.arrayBuffer(),{status:upstream.status,headers:{"content-type":upstream.headers.get("content-type")||"application/json","cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Template service unavailable"},{status:502});}
}
