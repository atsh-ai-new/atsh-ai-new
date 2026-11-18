import {canonicalDomain} from "./domain-availability.js";
// Official WHM API 1: https://api.docs.cpanel.net/specifications/whm.openapi/account-creation/accounts-createacct.md
// This module is NOT attached to a public endpoint. Only a verified paid + admin-approved worker may call it.
export function whmHostingConfig(env=process.env){
 const host=String(env.ATSH_WHM_HOST||"").trim().toLowerCase();
 const user=String(env.ATSH_WHM_USER||"").trim(),token=String(env.ATSH_WHM_API_TOKEN||"");
 const plans=String(env.ATSH_WHM_ALLOWED_PLANS||"").split(",").map(v=>v.trim()).filter(Boolean);
 if(!host||!user||!token||!plans.length||!/^[a-z0-9.-]+$/.test(host)||!canonicalDomain(host)||!/^[-_a-zA-Z0-9]{1,32}$/.test(user))return null;
 return {host,user,token,plans,enabled:env.ATSH_WHM_PROVISIONING_ENABLED==="true"};
}
export function prepareWHMAccount({domain,username,plan,contactEmail},env=process.env){
 const config=whmHostingConfig(env);
 if(!config)throw Error("WHM hosting provider is not configured");
 const safeDomain=canonicalDomain(domain);
 if(!safeDomain)throw Error("Invalid hosting domain");
 if(!/^[a-z][a-z0-9]{2,15}$/.test(username)||username.startsWith("test"))throw Error("Invalid cPanel username");
 if(!config.plans.includes(plan))throw Error("Hosting package not allowed");
 if(typeof contactEmail!=="string"||contactEmail.length>254||!/^\S+@\S+\.\S+$/.test(contactEmail))throw Error("Invalid contact email");
 const url=new URL(`https://${config.host}:2087/json-api/createacct`);
 for(const [key,value] of Object.entries({
  "api.version":"1",username,domain:safeDomain,plan,contactemail:contactEmail,
  reseller:"0",hasshell:"0",forcedns:"0",showpass:"n"
 }))url.searchParams.set(key,value);
 return {url,config,domain:safeDomain,username,plan};
}
export async function provisionWHMAccount(input,{env=process.env,fetchFn=fetch,paymentVerified=false,adminApproved=false}={}){
 if(!paymentVerified||!adminApproved)throw Error("Hosting creation requires independently verified payment and administrative approval");
 const plan=prepareWHMAccount(input,env);
 if(!plan.config.enabled)throw Error("WHM provisioning is disabled");
 let response;
 try{
  response=await fetchFn(plan.url,{method:"GET",headers:{"Authorization":`whm ${plan.config.user}:${plan.config.token}`,"Accept":"application/json"},redirect:"error",signal:AbortSignal.timeout(30000)});
 }catch{throw Error("WHM connection failed");}
 if(!response.ok)throw Error("WHM rejected provisioning");
 let data;
 try{data=await response.json();}catch{throw Error("Invalid WHM response");}
 if(Number(data?.metadata?.result)!==1)throw Error("WHM account creation failed");
 return {provisioned:true,domain:plan.domain,username:plan.username,hostingPlan:plan.plan,host:plan.config.host,
  nameservers:[data?.data?.nameserver,data?.data?.nameserver2].filter(v=>typeof v==="string"&&v.length)};
}
