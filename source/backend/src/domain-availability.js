import {domainToASCII} from "node:url";
// Namecheap API reference: https://www.namecheap.com/support/api/methods/domains/check/
// Lookup only. A successful check NEVER reserves, registers or prices an ordinary domain.
export function canonicalDomain(value){
 if(typeof value!=="string"||value.length>253)return null;
 const canonical=domainToASCII(value.trim().toLowerCase()).replace(/\.$/,"");
 if(canonical.length<4||canonical.length>253||!canonical.includes(".")||canonical.includes(".."))return null;
 const parts=canonical.split(".");
 if(parts.some(label=>label.length<1||label.length>63||! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)))return null;
 if(parts.at(-1).length<2||!/^[a-z]{2,63}$/.test(parts.at(-1)))return null;
 return canonical;
}
function namecheapConfig(env){
 const required=["NAMECHEAP_API_KEY","NAMECHEAP_API_USER","NAMECHEAP_USERNAME","NAMECHEAP_CLIENT_IP"];
 if(required.some(key=>!env[key]))return null;
 const clientIp=env.NAMECHEAP_CLIENT_IP;
 if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(clientIp)||clientIp.split(".").some(x=>Number(x)>255))return null;
 const sandbox=env.NAMECHEAP_ENV!=="production";
 return {sandbox,key:env.NAMECHEAP_API_KEY,apiUser:env.NAMECHEAP_API_USER,username:env.NAMECHEAP_USERNAME,clientIp};
}
function attrs(tag){
 const out={};
 for(const match of tag.matchAll(/([A-Za-z][A-Za-z0-9]*)="([^"]*)"/g))out[match[1]]=match[2];
 return out;
}
export function parseNamecheapCheck(xml,domain){
 if(typeof xml!=="string"||xml.length>100000)throw Error("Invalid domain lookup response");
 const root=xml.match(/<ApiResponse\b[^>]*>/i);
 if(!root||attrs(root[0]).Status!=="OK")throw Error("Domain provider error");
 const tag=xml.match(/<DomainCheckResult\b[^>]*\/?\s*>/i);
 if(!tag)throw Error("Domain status missing");
 const a=attrs(tag[0]);
 if(a.Domain?.toLowerCase()!==domain||!["true","false"].includes(a.Available)||a.ErrorNo!=="0")throw Error("Domain lookup not confirmed");
 const premium=a.IsPremiumName==="true";
 const premiumAmount=Number(a.PremiumRegistrationPrice);
 return {domain,available:a.Available==="true",premium,
  premiumRegistrationPriceUsd:premium&&Number.isFinite(premiumAmount)&&premiumAmount>0?premiumAmount:null};
}
export async function checkDomainWithNamecheap(domain,{env=process.env,fetchFn=fetch}={}){
 const canonical=canonicalDomain(domain);
 if(!canonical)throw Error("Invalid domain");
 const config=namecheapConfig(env);
 if(!config)return {configured:false,domain:canonical,available:null,reservation:false};
 const url=new URL(config.sandbox?"https://api.sandbox.namecheap.com/xml.response":"https://api.namecheap.com/xml.response");
 for(const [key,value] of Object.entries({ApiUser:config.apiUser,ApiKey:config.key,UserName:config.username,Command:"namecheap.domains.check",ClientIp:config.clientIp,DomainList:canonical}))url.searchParams.set(key,value);
 let response;
 try{response=await fetchFn(url,{method:"GET",redirect:"error",signal:AbortSignal.timeout(10000)});}catch{throw Error("Domain provider unavailable");}
 if(!response.ok)throw Error("Domain provider unavailable");
 const parsed=parseNamecheapCheck(await response.text(),canonical);
 return {...parsed,configured:true,provider:"namecheap",environment:config.sandbox?"sandbox":"production",checkedAt:new Date().toISOString(),reservation:false,regularPriceVerified:false};
}
