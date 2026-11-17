import { createHmac } from 'node:crypto';
export function validateDispatchConfig(env=process.env){
 const secret=env.BUILDER_DISPATCH_SECRET;
 if(!secret||secret.length<32)throw Error('BUILDER_DISPATCH_SECRET must be at least 32 characters');
 const endpoint=new URL(env.BUILDER_DISPATCH_WEBHOOK||'');
 if(endpoint.username||endpoint.password||endpoint.hash||!['https:','http:'].includes(endpoint.protocol))throw Error('Invalid webhook');
 if(endpoint.protocol!=='https:'&&!(env.BUILDER_ALLOW_INTERNAL_HTTP==='true'&&['localhost','127.0.0.1','n8n'].includes(endpoint.hostname)))throw Error('Webhook must use HTTPS');
 return {endpoint,secret};
}
export function signedDispatch(job,secret){
 const body=JSON.stringify({schemaVersion:1,jobId:job.id,kind:job.kind,sourceId:job.source_id,payload:job.payload});
 return {body,signature:createHmac('sha256',secret).update(body).digest('hex')};
}
