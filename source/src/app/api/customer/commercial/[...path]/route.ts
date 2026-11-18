import {NextResponse} from "next/server";
export const runtime = "nodejs";
type Context = {params:Promise<{path:string[]}>};
const MAX_BODY = 64 * 1024;
async function proxy(request:Request, context:Context){
 const base=process.env.ATSH_API_BASE_URL?.trim();
 if(!base)return NextResponse.json({error:"API unavailable"},{status:503});
 let url:URL;
 try{
  const origin=new URL(base);
  const internal=origin.protocol==="http:" && ["atsh-website-api","atsh-website-api-internal"].includes(origin.hostname);
  if(!["http:","https:"].includes(origin.protocol)||(process.env.NODE_ENV==="production"&&origin.protocol!=="https:"&&!internal))throw Error();
  const {path}=await context.params;
  if(!path.length||path.some(x=>!/^[a-zA-Z0-9_-]+$/.test(x)))return NextResponse.json({error:"Invalid path"},{status:400});
  url=new URL("/api/customer/commercial/"+path.map(encodeURIComponent).join("/"),origin);
 }catch{return NextResponse.json({error:"Invalid API configuration"},{status:503});}
 const method=request.method.toUpperCase();
 const headers=new Headers({accept:"application/json"});
 for(const key of ["cookie","content-type","origin","x-csrf-token"]){const value=request.headers.get(key);if(value)headers.set(key,value);}
 let body:ArrayBuffer|undefined;
 if(method!=="GET"&&method!=="HEAD"){
  const declared=Number(request.headers.get("content-length")||0);
  if(declared>MAX_BODY)return NextResponse.json({error:"Request too large"},{status:413});
  body=await request.arrayBuffer();
  if(body.byteLength>MAX_BODY)return NextResponse.json({error:"Request too large"},{status:413});
 }
 try{
  const upstream=await fetch(url,{method,headers,body,cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(12000)});
  const out=new NextResponse(await upstream.arrayBuffer(),{status:upstream.status});
  out.headers.set("cache-control","no-store");
  const ct=upstream.headers.get("content-type");if(ct)out.headers.set("content-type",ct);
  return out;
 }catch{return NextResponse.json({error:"Backend unavailable"},{status:502});}
}
export {proxy as GET,proxy as POST,proxy as PATCH};
