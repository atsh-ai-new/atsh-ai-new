import { existsSync } from 'node:fs';
const checks = [
  ['frontend manifest','package.json'],
  ['frontend lockfile','package-lock.json'],
  ['backend manifest','backend/package.json'],
  ['backend entry','backend/src/server.js'],
  ['database migrations','backend/db']
];
let failures=0;
for(const [label,path] of checks){const ok=existsSync(path);console.log((ok?'PASS':'FAIL')+' '+label+': '+path);if(!ok)failures++;}
for(const key of ['DATABASE_URL','BUILDER_DISPATCH_WEBHOOK','BUILDER_DISPATCH_SECRET','CODE_AGENT_ENDPOINT','CODE_AGENT_API_KEY','CODE_AGENT_MODEL'])console.log((process.env[key]?'CONFIGURED':'PENDING')+' '+key);
console.log('Preflight structural failures: '+failures+'. Runtime integrations not tested.');
process.exitCode=failures?1:0;
