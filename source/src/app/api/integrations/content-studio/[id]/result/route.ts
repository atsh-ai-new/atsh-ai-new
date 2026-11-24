export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:404});
 const authorization=request.headers.get("authorization")||"";
 if(!/^Bearer [a-f0-9]{64}$/.test(authorization))return new Response(null,{status:401});
 const type=(request.headers.get("content-type")||"").split(";")[0];
 if(!["video/mp4","application/octet-stream","application/json"].includes(type))return new Response(null,{status:415});
 const limit=type==="application/json"?32768:25*1024*1024;
 if(Number(request.headers.get("content-length")||0)>limit)return new Response(null,{status:413});
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
 const chunks:Uint8Array[]=[];let size=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}
  const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  const base=new URL(process.env.ATSH_API_BASE_URL||"");
  if(process.env.NODE_ENV==="production"&&base.protocol!=="https:"&&!(base.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(base.hostname)))return new Response(null,{status:503});
  const upstream=await fetch(new URL("/api/integrations/content-studio/"+id+"/result",base),{method:"POST",headers:{authorization,"content-type":type},body,redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(30000)});
  return new Response(await upstream.arrayBuffer(),{status:upstream.status,headers:{"content-type":upstream.headers.get("content-type")||"application/json","cache-control":"no-store"}});
 }catch{return new Response(null,{status:502});}
}
