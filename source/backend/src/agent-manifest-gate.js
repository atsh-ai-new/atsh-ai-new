import {validateManifest} from './forgejo-manifest.js';

// Fail closed before publishing agent-produced source. Human approval is still required.
const forbiddenNames=new Set(['.env','.env.local','.env.production','id_rsa','id_ed25519','credentials.json','service-account.json']);
const forbiddenPatterns=[/-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY-----/,/\b(?:sk-proj-|sk_live_|ghp_|github_pat_)\w{12,}/];
const textExtensions=new Set(['.js','.jsx','.ts','.tsx','.json','.md','.css','.html','.yaml','.yml','.txt','.sql','.svg','.gitignore','.dockerignore']);
export function reviewAgentManifest(input){
 const manifest=validateManifest(input);
 const findings=[];
 for(const file of manifest.files){
  const name=file.path.split('/').at(-1).toLowerCase();
  const extension=name.includes('.')?name.slice(name.lastIndexOf('.')):'';
  if(forbiddenNames.has(name)||name.startsWith('.env.'))findings.push({path:file.path,code:'SECRET_FILE'});
  if(!textExtensions.has(extension)&&!['Dockerfile','Makefile'].includes(name))findings.push({path:file.path,code:'UNREVIEWED_FILE_TYPE'});
  if(forbiddenPatterns.some(pattern=>pattern.test(file.content)))findings.push({path:file.path,code:'POSSIBLE_SECRET'});
  if(file.content.includes('\0'))findings.push({path:file.path,code:'BINARY_CONTENT'});
 }
 return {approved:findings.length===0,manifest,findings};
}
export function requireApprovedManifest(input){
 const result=reviewAgentManifest(input);
 if(!result.approved){const error=new Error('Agent manifest failed safety review');error.findings=result.findings;throw error;}
 return result.manifest;
}
