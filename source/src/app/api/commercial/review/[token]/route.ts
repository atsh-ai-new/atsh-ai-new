import {NextResponse} from "next/server";
export const runtime="nodejs";
function destination(token:string,action=""){
 const base=process.env.ATSH_API_BASE_URL?.trim();if(!base||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 try{const u=new URL(base);const internal=u.protocol==="http:"&&["atsh-website-api","atsh-website-api-internal"].includes(u.hostname);
 if(u.protocol!=="https:"&&process.env.NODE_ENV==="production"&&!internal)return null;
 return new URL(`/api/commercial/review/${token}${action}`,u).toString();}catch{return null;}
}
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;const url=destination(token);if(!url)return NextResponse.json({error:"Unavailable"},{status:503});
 try{const r=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(12000)});return NextResponse.json(await r.json(),{status:r.status,headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Backend unavailable"},{status:502})}
}
export async function POST(request:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;const url=destination(token,"/accept-and-sign");if(!url)return NextResponse.json({error:"Unavailable"},{status:503});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(12000)});return NextResponse.json(await r.json(),{status:r.status,headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Backend unavailable"},{status:502})}
}
