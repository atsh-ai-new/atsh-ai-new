import { NextResponse } from "next/server";
export const runtime="nodejs";
export async function GET(request:Request){
 let base:URL;
 try{
   base=new URL(process.env.ATSH_API_BASE_URL??"");
   const internal=base.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(base.hostname);
   if(!["http:","https:"].includes(base.protocol)||(process.env.NODE_ENV==="production"&&base.protocol!=="https:"&&!internal))throw Error();
 }catch{return NextResponse.json({error:"API unavailable"},{status:503});}
 const requestUrl=new URL(request.url);
 const slug=requestUrl.searchParams.get("slug")??"";
 const addons=requestUrl.searchParams.get("addons")??"";
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||addons.length>2000)return NextResponse.json({error:"Invalid sector selection"},{status:400});
 const destination=new URL("/api/sector-price",base);
 destination.searchParams.set("slug",slug);
 if(addons)destination.searchParams.set("addons",addons);
 try{
   const upstream=await fetch(destination,{cache:"no-store",signal:AbortSignal.timeout(10000)});
   return new Response(await upstream.arrayBuffer(),{status:upstream.status,headers:{"content-type":"application/json","cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Sector price unavailable"},{status:502});}
}
