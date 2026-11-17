import {NextResponse} from 'next/server';
export const runtime='nodejs';
async function proxy(req:Request,ctx:{params:Promise<{path:string[]}>}){
 const base=process.env.ATSH_API_BASE_URL;if(!base)return NextResponse.json({error:'API unavailable'},{status:503});
 const {path}=await ctx.params;const url=new URL('/api/customer/auth/'+path.map(encodeURIComponent).join('/'),base);
 const headers=new Headers();for(const key of ['content-type','cookie','origin']){const value=req.headers.get(key);if(value)headers.set(key,value);}
 const response=await fetch(url,{method:req.method,headers,body:req.method==='GET'?undefined:await req.text(),cache:'no-store',redirect:'manual'});
 const out=new NextResponse(response.body,{status:response.status});const contentType=response.headers.get('content-type');if(contentType)out.headers.set('content-type',contentType);
 const cookies=response.headers.getSetCookie();for(const c of cookies)out.headers.append('set-cookie',c);return out;
}
export {proxy as GET,proxy as POST};
