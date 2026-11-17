import {spawn} from 'node:child_process';
import {realpath,stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';

// Only run on a dedicated Docker host with a locked-down daemon. Never mount docker.sock into the test container.
export function buildDockerArgs({image='node:22-alpine',network=false}={}){
 if(!/^node:(?:20|22|24)-alpine$/.test(image))throw Error('Unapproved test image');
 return ['run','--rm','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit=128','--memory=512m','--cpus=1','--network',network?'bridge':'none','--user','1000:1000','--tmpfs','/tmp:rw,nosuid,nodev,size=128m'];
}
export async function runIsolatedProjectTests({workspace,allowedRoot,image,timeoutMs=120000,spawnImpl=spawn}={}){
 if(!allowedRoot||!workspace)throw Error('Workspace and allowed root required');
 const [root,dir]=await Promise.all([realpath(allowedRoot),realpath(workspace)]);
 if(!dir.startsWith(root+sep))throw Error('Workspace outside approved root');
 if(!(await stat(dir)).isDirectory())throw Error('Invalid workspace');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000)throw Error('Invalid timeout');
 const args=[...buildDockerArgs({image}),'-v',`${dir}:/workspace:ro`,'-w','/workspace',image||'node:22-alpine','sh','-c','node --version && if [ -f package.json ]; then npm test; else echo "No package.json"; exit 2; fi'];
 return await new Promise((resolveResult,reject)=>{
  const child=spawnImpl('docker',args,{stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH||'/usr/bin:/bin'}});
  let output='',ended=false;
  const timer=setTimeout(()=>{child.kill('SIGKILL');},timeoutMs);
  const collect=chunk=>{output=(output+chunk.toString()).slice(-20000);};
  child.stdout.on('data',collect);child.stderr.on('data',collect);
  child.on('error',e=>{if(!ended){ended=true;clearTimeout(timer);reject(e);}});
  child.on('close',(code,signal)=>{if(!ended){ended=true;clearTimeout(timer);resolveResult({passed:code===0,exitCode:code,signal,output});}});
 });
}
