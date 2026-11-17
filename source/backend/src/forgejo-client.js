// Minimal Forgejo provisioning adapter. Never accepts an arbitrary URL or token from a job payload.
const SLUG=/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/;
export function validateRepoName(value){
 if(typeof value!=='string'||!SLUG.test(value)||value.includes('--'))throw new Error('Invalid repository name');
 return value;
}
export function forgejoConfig(env=process.env){
 const base=new URL(env.FORGEJO_URL||'');
 if(base.protocol!=='https:' && !(env.FORGEJO_ALLOW_INTERNAL_HTTP==='true' && ['forgejo','localhost','127.0.0.1'].includes(base.hostname)))throw new Error('Forgejo requires HTTPS');
 if(base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new Error('Invalid Forgejo URL');
 const token=env.FORGEJO_TOKEN;
 const owner=env.FORGEJO_OWNER;
 if(!token||!owner||!/^[A-Za-z0-9_.-]{1,64}$/.test(owner))throw new Error('Missing Forgejo credentials/owner');
 return {base,token,owner};
}
export async function forgejoRequest(config,path,{method='GET',body,fetchImpl=fetch}={}){
 if(!path.startsWith('/api/v1/')||path.includes('..'))throw new Error('Invalid API path');
 const res=await fetchImpl(new URL(path,config.base),{
  method,headers:{authorization:`token ${config.token}`,accept:'application/json',...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)
 });
 const raw=await res.text();let data;
 try{data=raw?JSON.parse(raw):null;}catch{data=null;}
 if(!res.ok){const error=new Error(`Forgejo HTTP ${res.status}`);error.status=res.status;throw error;}
 return data;
}
export async function ensureProjectRepository(config,{name,description='',fetchImpl=fetch}){
 name=validateRepoName(name);
 const owner=encodeURIComponent(config.owner),repo=encodeURIComponent(name);
 try{return {repository:await forgejoRequest(config,`/api/v1/repos/${owner}/${repo}`,{fetchImpl}),created:false};}
 catch(e){if(e.status!==404)throw e;}
 // Repository is private by default. Never overwrite an existing repository.
 try{
  const repository=await forgejoRequest(config,`/api/v1/orgs/${owner}/repos`,{method:'POST',body:{name,description:String(description).slice(0,250),private:true,auto_init:true},fetchImpl});
  return {repository,created:true};
 }catch(e){
  // Another worker may have created it concurrently.
  if(e.status===409||e.status===422)return {repository:await forgejoRequest(config,`/api/v1/repos/${owner}/${repo}`,{fetchImpl}),created:false};
  throw e;
 }
}

// Safe contents API adapter: never accepts absolute paths, dot segments or hidden git metadata.
export function validateProjectPath(path){
 if(typeof path!=='string'||path.length>240||path.startsWith('/')||path.includes('\\')||path.includes('\0'))throw Error('Invalid project path');
 const parts=path.split('/');
 if(parts.some(p=>!p||p==='.'||p==='..'||p==='.git'||! /^[a-zA-Z0-9_.-]+$/.test(p)))throw Error('Invalid project path');
 return parts.map(encodeURIComponent).join('/');
}
export async function upsertProjectFile(config,{repo,path,content,message,branch='main',expectedSha,fetchImpl=fetch}){
 validateRepoName(repo);
 const safePath=validateProjectPath(path);
 if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>1024*1024)throw Error('Invalid file content');
 if(!/^[a-zA-Z0-9._/-]{1,100}$/.test(branch)||branch.includes('..'))throw Error('Invalid branch');
 if(expectedSha!==undefined&&!/^[0-9a-f]{40,64}$/.test(expectedSha))throw Error('Invalid expected SHA');
 const endpoint=`/api/v1/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(repo)}/contents/${safePath}`;
 // Only create a file, or update an explicitly version-checked file. Never silently overwrite.
 const payload={content:Buffer.from(content,'utf8').toString('base64'),message:String(message||'ATSH generated file').slice(0,120),branch,...(expectedSha?{sha:expectedSha}:{})};
 return forgejoRequest(config,endpoint,{method:expectedSha?'PUT':'POST',body:payload,fetchImpl});
}
