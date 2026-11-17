import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(request:Request){
 const domain=new URL(request.url).searchParams.get("domain")??"";
 if(domain.length<4||domain.length>253||/[\s/?&#]/.test(domain))return NextResponse.json({error:"Invalid domain"},{status:400});
 let base:URL;
 try{
  base=new URL(process.env.ATSH_API_BASE_URL??"");
  const internal=base.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(base.hostname);
  if(!["http:","https:"].includes(base.protocol)||(process.env.NODE_ENV==="production"&&base.protocol!=="https:"&&!internal))throw Error();
 }catch{return NextResponse.json({error:"API unavailable"},{status:503});}
 const url=new URL("/api/domains/check",base);url.searchParams.set("domain",domain);
 try{
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(12000),redirect:"manual"});
  return new Response(await response.arrayBuffer(),{status:response.status,headers:{"content-type":"application/json","cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Domain provider unavailable"},{status:502});}
}
