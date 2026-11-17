// Optional Namecheap domain availability adapter. This DOES NOT register or price a domain.
// API access requires a whitelisted static IPv4 address and separate test/production accounts.
// Docs: https://www.namecheap.com/support/api/methods/domains/check/
export function validateDomainName(input) {
 if(typeof input!=="string")return null;
 const domain=input.trim().toLowerCase();
 if(domain.length<4||domain.length>253||!domain.includes(".")||!/^[a-z0-9.-]+$/.test(domain))return null;
 const labels=domain.split(".");
 if(labels.some(x=>x.length<1||x.length>63||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x)))return null;
 if(labels.at(-1).length<2)return null;
 return domain;
}
export function namecheapConfig(env=process.env){
 const username=env.NAMECHEAP_API_USER,key=env.NAMECHEAP_API_KEY,clientIp=env.NAMECHEAP_CLIENT_IP;
 if(!username||!key||!clientIp||!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(clientIp)||clientIp.split(".").some(o=>Number(o)>255))return null;
 const sandbox=env.NAMECHEAP_API_SANDBOX==="true";
 return {username,key,clientIp,endpoint:sandbox?"https://api.sandbox.namecheap.com/xml.response":"https://api.namecheap.com/xml.response",sandbox};
}
function attributes(raw) {
 const entries=[...raw.matchAll(/([A-Za-z][A-Za-z0-9]*)="([^"<>&]*)"/g)];
 return Object.fromEntries(entries.map(x=>[x[1],x[2]]));
}
export function parseDomainCheck(xml,domain){
 if(typeof xml!=="string"||xml.length>100_000||!xml.includes("<ApiResponse"))throw Error("Unexpected registrar response");
 const api=xml.match(/<ApiResponse\b([^>]*)>/);
 if(!api||attributes(api[1]).Status!=="OK")throw Error("Registrar declined the availability lookup");
 const rows=[...xml.matchAll(/<DomainCheckResult\b([^>]*)\/?\s*>/g)];
 const row=rows.map(x=>attributes(x[1])).find(x=>x.Domain?.toLowerCase()===domain);
 if(!row||!["true","false"].includes(row.Available))throw Error("Registrar response omitted availability");
 return {domain,available:row.Available==="true",premium:row.IsPremiumName==="true",checkedAt:new Date().toISOString(),
   registrationPrice:null,renewalPrice:null,currency:null,source:"namecheap",
   note:"التحقق لحظي وغير ملزم. سعر الشراء والتجديد يتطلب عرضًا مستقلًا وإعادة تحقق عند الدفع."};
}
export async function checkDomainAvailability(domain,{env=process.env,fetchFn=fetch}={}){
 const valid=validateDomainName(domain),config=namecheapConfig(env);
 if(!valid)throw Error("Invalid domain name");
 if(!config)throw Error("Domain registrar not configured");
 const url=new URL(config.endpoint);
 for(const [key,value] of Object.entries({ApiUser:config.username,ApiKey:config.key,UserName:config.username,ClientIp:config.clientIp,
  Command:"namecheap.domains.check",DomainList:valid}))url.searchParams.set(key,value);
 const response=await fetchFn(url,{method:"GET",redirect:"error",signal:AbortSignal.timeout(12000),headers:{Accept:"application/xml"}});
 if(!response.ok)throw Error("Registrar availability request failed");
 return parseDomainCheck(await response.text(),valid);
}
