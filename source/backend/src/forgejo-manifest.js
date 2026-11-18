import {requireApprovedManifest} from './agent-manifest-gate.js';
import {validateRepoName,validateProjectPath,upsertProjectFile,ensureProjectRepository} from './forgejo-client.js';

// Apply only reviewed text files to a private repository. No shell commands or user-supplied URLs.
export function validateManifest(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid manifest');
 const repo=validateRepoName(input.repo);
 if(!Array.isArray(input.files)||input.files.length<1||input.files.length>100)throw Error('Invalid file count');
 const paths=new Set();let bytes=0;
 const files=input.files.map(item=>{
  if(!item||typeof item!=='object')throw Error('Invalid file');
  const path=item.path;validateProjectPath(path);
  if(paths.has(path))throw Error('Duplicate path');paths.add(path);
  if(typeof item.content!=='string')throw Error('Invalid content');
  const size=Buffer.byteLength(item.content,'utf8');bytes+=size;
  if(size>1024*1024||bytes>5*1024*1024)throw Error('Manifest size exceeded');
  if(item.expectedSha!==undefined&&!/^[0-9a-f]{40,64}$/.test(item.expectedSha))throw Error('Invalid expected SHA');
  return {path,content:item.content,...(item.expectedSha?{expectedSha:item.expectedSha}:{})};
 });
 return {repo,files};
}
export async function applyReviewedManifest(config,input,{fetchImpl=fetch}={}){
 const manifest=requireApprovedManifest(input);
 const provision=await ensureProjectRepository(config,{name:manifest.repo,fetchImpl});
 const results=[];
 for(const file of manifest.files){
  try{
   const response=await upsertProjectFile(config,{repo:manifest.repo,...file,branch:'main',message:'ATSH reviewed project delivery',fetchImpl});
   results.push({path:file.path,ok:true,sha:response?.content?.sha??null});
  }catch(e){
   results.push({path:file.path,ok:false,error:String(e.message).slice(0,160)});
   // Stop on first failure: never claim a partially written project was completed.
   break;
  }
 }
 return {repository:manifest.repo,created:provision.created,completed:results.length===manifest.files.length&&results.every(x=>x.ok),results};
}
