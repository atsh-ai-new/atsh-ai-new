import {createHmac,timingSafeEqual} from 'node:crypto';
export function previewConfig(env=process.env){
 const endpoint=new URL(env.PREVIEW_DEPLOY_WEBHOOK||'');
 if(endpoint.protocol!=='https:')throw Error('Preview webhook must use HTTPS');
 if(endpoint.username||endpoint.password||endpoint.hash)throw Error('Invalid preview endpoint');
 if(!env.PREVIEW_DEPLOY_SECRET||env.PREVIEW_DEPLOY_SECRET.length<32)throw Error('Preview secret must have 32+ characters');
 return {endpoint,secret:env.PREVIEW_DEPLOY_SECRET};
}
export function signPreview(body,secret){return createHmac('sha256',secret).update(body).digest('hex');}
export function verifyPreview(body,signature,secret){if(!/^[0-9a-f]{64}$/.test(signature||''))return false;return timingSafeEqual(Buffer.from(signPreview(body,secret),'hex'),Buffer.from(signature,'hex'));}
export async function requestPreview(config,{repo,commit,jobId}, {fetchImpl=fetch}={}){
 if(!/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/.test(repo)||!/^[0-9a-f]{40}$/.test(commit)||!jobId)throw Error('Invalid preview request');
 const body=JSON.stringify({repo,commit,jobId});
 const response=await fetchImpl(config.endpoint,{method:'POST',headers:{'content-type':'application/json','x-atsh-signature':signPreview(body,config.secret)},body,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`Preview dispatch HTTP ${response.status}`);
 return {status:'requested',jobId}; // URL is only trusted after signed callback and URL allowlist verification.
}
export function validatePreviewResult(value,env=process.env){
 const url=new URL(value);const domain=env.PREVIEW_ALLOWED_HOST_SUFFIX;
 if(!domain||url.protocol!=='https:'||url.username||url.password||url.port||url.hostname!==domain&& !url.hostname.endsWith('.'+domain))throw Error('Untrusted preview URL');
 return url.toString();
}
