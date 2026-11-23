import {NextResponse} from 'next/server';
export const runtime='nodejs';
async function proxy(req:Request,ctx:{params:Promise<{path:string[]}>}){
 const base=process.env.ATSH_API_BASE_URL;if(!base)return NextResponse.json({error:'API unavailable'},{status:503});
 const {path}=await ctx.params;const url=new URL('/api/customer/auth/'+path.map(encodeURIComponent).join('/'),base);
 const headers=new Headers();for(const key of ['content-type','cookie','origin']){const value=req.headers.get(key);if(value)headers.set(key,value);}
 const isLogo=path.join('/')==='workspace/logo'||/^project-drafts\/[0-9a-f-]{36}\/logo$/i.test(path.join('/'));
 const length=Number(req.headers.get('content-length')||0);
 if(isLogo&&req.method==='POST'&&length>2097152)return NextResponse.json({error:'Image too large'},{status:413});
 let body:undefined|string|ArrayBuffer;
 if(req.method!=='GET'){
   if(isLogo&&req.method==='POST'){body=await req.arrayBuffer();if(body.byteLength>2097152)return NextResponse.json({error:'Image too large'},{status:413});}
   else{body=await req.text();if(body.length>32000)return NextResponse.json({error:'Request too large'},{status:413});}
 }
 let response:Response;
 try{response=await fetch(url,{method:req.method,headers,body,cache:'no-store',redirect:'manual'});}
 catch{return NextResponse.json({error:"Customer API temporarily unavailable",code:"CUSTOMER_API_UNREACHABLE"},{status:502});}
 const out=new NextResponse(response.body,{status:response.status});const contentType=response.headers.get('content-type');if(contentType)out.headers.set('content-type',contentType);
 // Preserve upstream throttling evidence so a 429 can be attributed without exposing credentials.
 if(response.status===429){out.headers.set('X-ATSH-429-Source','customer-api-upstream');const retryAfter=response.headers.get('retry-after');if(retryAfter)out.headers.set('Retry-After',retryAfter);}
 out.headers.set('Cache-Control','private, no-store');
 const cookies=response.headers.getSetCookie();for(const c of cookies)out.headers.append('set-cookie',c);return out;
}
export {proxy as GET,proxy as POST,proxy as PATCH,proxy as PUT,proxy as DELETE};
