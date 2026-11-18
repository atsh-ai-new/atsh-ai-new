import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(request: Request, {params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:"Invalid id"},{status:400});
 const base=process.env.ATSH_API_BASE_URL;
 if(!base)return NextResponse.json({error:"API not configured"},{status:503});
 const target=new URL(`/api/customer/journey/${id}`,base);
 if(target.protocol!=="https:"&&!(target.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal","localhost","127.0.0.1"].includes(target.hostname)))return NextResponse.json({error:"Invalid API URL"},{status:503});
 try {const upstream=await fetch(target,{headers:{authorization:request.headers.get("authorization")||""},cache:"no-store",signal:AbortSignal.timeout(30000)});return new Response(await upstream.text(),{status:upstream.status,headers:{"content-type":"application/json","cache-control":"no-store"}});}catch{return NextResponse.json({error:"API unavailable"},{status:502});}
}
