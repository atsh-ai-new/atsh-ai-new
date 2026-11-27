export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{action:string}>}){
  const {action}=await context.params;
  if(!["claim","heartbeat"].includes(action))return new Response(null,{status:404});
  const authorization=request.headers.get("authorization")||"";
  if(!/^Bearer [a-f0-9]{64}$/.test(authorization))return new Response(null,{status:401});
  if(!(request.headers.get("content-type")||"").startsWith("application/json"))return new Response(null,{status:415});
  try{
    const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}
    const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
    const base=new URL(process.env.ATSH_API_BASE_URL||"");
    if(base.username||base.password||base.hash||!["http:","https:"].includes(base.protocol))return new Response(null,{status:503});
    if(process.env.NODE_ENV==="production"&&base.protocol!=="https:"&&!(base.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(base.hostname)))return new Response(null,{status:503});
    const upstream=await fetch(new URL("/api/integrations/portrait-worker/"+action,base),{method:"POST",headers:{authorization,"content-type":"application/json"},body,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(45000)});
    return new Response(upstream.status===204?null:await upstream.arrayBuffer(),{status:upstream.status,headers:{"content-type":"application/json","cache-control":"no-store"}});
  }catch{return new Response(null,{status:502});}
}
