import {reviewAgentManifest} from './agent-manifest-gate.js';
import {applyReviewedManifest} from './forgejo-manifest.js';

const allowedModels=/^[a-zA-Z0-9._:-]{1,100}$/;
export function agentConfig(env=process.env){
 const url=new URL(env.CODE_AGENT_ENDPOINT||'');
 if(url.protocol!=='https:' && !(env.CODE_AGENT_ALLOW_LOCAL_HTTP==='true'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Agent endpoint must use HTTPS');
 if(url.username||url.password||url.hash)throw Error('Invalid agent endpoint');
 if(!env.CODE_AGENT_API_KEY||!allowedModels.test(env.CODE_AGENT_MODEL||''))throw Error('Missing agent credentials/model');
 return {url,apiKey:env.CODE_AGENT_API_KEY,model:env.CODE_AGENT_MODEL};
}
export async function generateProjectManifest(config,{repo,specification}, {fetchImpl=fetch}={}){
 if(typeof specification!=='string'||specification.length<20||specification.length>30000)throw Error('Invalid specification');
 if(!/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/.test(repo))throw Error('Invalid repo');
 const response=await fetchImpl(config.url,{method:'POST',headers:{'authorization':`Bearer ${config.apiKey}`,'content-type':'application/json'},body:JSON.stringify({model:config.model,temperature:0,messages:[{role:'system',content:'Generate an original minimal working web application from the user specification. Return ONLY JSON with schema {"repo":"slug","files":[{"path":"relative/path","content":"file text"}]}. Never output credentials, executable deployment commands, or .env files. Do not copy third-party proprietary code.'},{role:'user',content:JSON.stringify({repo,specification})}],response_format:{type:'json_object'}}),signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error(`Agent HTTP ${response.status}`);
 const data=await response.json();
 const content=data?.choices?.[0]?.message?.content;
 if(typeof content!=='string'||content.length>7_000_000)throw Error('Invalid agent response');
 let manifest;try{manifest=JSON.parse(content);}catch{throw Error('Agent returned invalid JSON');}
 if(manifest.repo!==repo)throw Error('Agent changed repository name');
 const result=reviewAgentManifest(manifest);
 if(!result.approved){const e=Error('Generated files rejected by safety gate');e.findings=result.findings;throw e;}
 return result.manifest;
}
export async function prepareGeneratedProject(agent,forgejo,request,{fetchImpl=fetch}={}){
 const manifest=await generateProjectManifest(agent,request,{fetchImpl});
 // The generated manifest must be approved by an authorized human before publishing.
 return {status:'awaiting_review',manifest,files:manifest.files.length};
}
export async function publishApprovedProject(forgejo,manifest,{approvedBy,fetchImpl=fetch}={}){
 if(typeof approvedBy!=='string'||!approvedBy.trim())throw Error('Explicit reviewer identity required');
 return applyReviewedManifest(forgejo,manifest,{fetchImpl});
}
