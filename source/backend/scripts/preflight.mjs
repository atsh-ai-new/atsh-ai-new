// Run locally or in staging: npm run preflight
// Never prints secret values. --strict only passes when all required provider integrations are configured.
const env=process.env;
const present=v=>typeof v==="string"&&v.trim().length>0&&!/[<>]/.test(v)&&!v.includes("example")&&!v.includes("change-me");
const nonplaceholder=v=>present(v)&&v.length>=8;
const urls=v=>{try{const u=new URL(v);return u.protocol==="https:"&&!/(?:\\.example|\\.test|\\.invalid)$/i.test(u.hostname)&&!u.hostname.includes("your-");}catch{return false;}};
const checks=[
 {id:"database",critical:true,ok:typeof env.DATABASE_URL==="string"&&env.DATABASE_URL.startsWith("postgres")},
 {id:"admin-password",critical:true,ok:typeof env.ADMIN_PASSWORD_HASH==="string"&&/^\$2[aby]\$/.test(env.ADMIN_PASSWORD_HASH)},
 {id:"jwt-secret",critical:true,ok:nonplaceholder(env.JWT_SECRET)&&env.JWT_SECRET.length>=32},
 {id:"public-url",critical:true,ok:urls(env.PUBLIC_SITE_URL)},
 {id:"allowed-origins",critical:true,ok:typeof env.ALLOWED_ORIGINS==="string"&&env.ALLOWED_ORIGINS.split(",").every(x=>urls(x.trim()))},
 {id:"secure-cookies",critical:true,ok:env.COOKIE_SECURE!=="false"},
 {id:"gpt-assistant",critical:false,ok:nonplaceholder(env.OPENAI_API_KEY)&&present(env.OPENAI_MODEL)},
 {id:"email",critical:false,ok:nonplaceholder(env.BREVO_API_KEY)&&typeof env.BREVO_SENDER_EMAIL==="string"},
 {id:"namecheap",critical:false,ok:nonplaceholder(env.NAMECHEAP_API_KEY)&&["NAMECHEAP_API_USER","NAMECHEAP_USERNAME","NAMECHEAP_CLIENT_IP"].every(x=>present(env[x]))&&env.NAMECHEAP_ENV==="production"},
 {id:"whm-hosting",critical:false,ok:nonplaceholder(env.ATSH_WHM_API_TOKEN)&&["ATSH_WHM_HOST","ATSH_WHM_USER","ATSH_WHM_ALLOWED_PLANS"].every(x=>present(env[x]))&&env.ATSH_WHM_PROVISIONING_ENABLED==="true"},
 {id:"n8n-events",critical:false,ok:urls(env.ATSH_N8N_EVENT_URL)&&nonplaceholder(env.ATSH_N8N_EVENT_TOKEN)},
 {id:"real-gateway",critical:false,ok:false,reason:"requires independent provider signature verification and verified adapter activation"},
 {id:"preview-deploy",critical:false,ok:urls(env.PREVIEW_DEPLOY_WEBHOOK)&&nonplaceholder(env.PREVIEW_DEPLOY_SECRET)}
];
console.log(JSON.stringify({environment:env.NODE_ENV||"unknown",checks:checks.map(x=>({id:x.id,critical:x.critical,status:x.ok?"configured":"missing",...(x.reason?{reason:x.reason}:{})}))},null,2));
const fail=checks.some(x=>!x.ok&&(x.critical||process.argv.includes("--strict")));
if(fail)process.exitCode=1;
