import test from "node:test";
import assert from "node:assert/strict";
import {prepareWHMAccount,provisionWHMAccount,whmHostingConfig} from "../src/whm-hosting.js";
const env={ATSH_WHM_HOST:"whm.example.com",ATSH_WHM_USER:"reseller",ATSH_WHM_API_TOKEN:"test-token-do-not-use",
  ATSH_WHM_ALLOWED_PLANS:"basic,plus",ATSH_WHM_PROVISIONING_ENABLED:"true"};
test("WHM provisioning refuses missing authorization and unapproved plans",async()=>{
 assert.equal(whmHostingConfig({}),null);
 assert.throws(()=>prepareWHMAccount({domain:"client.com",username:"clientx",plan:"unlisted",contactEmail:"client@example.com"},env),/not allowed/);
 await assert.rejects(()=>provisionWHMAccount({domain:"client.com",username:"clientx",plan:"basic",contactEmail:"client@example.com"},{env,paymentVerified:false,adminApproved:true}),/verified payment/);
 await assert.rejects(()=>provisionWHMAccount({domain:"client.com",username:"clientx",plan:"basic",contactEmail:"client@example.com"},{env,paymentVerified:true,adminApproved:false}),/administrative approval/);
});
test("WHM payload disables forced DNS, shell and password disclosure",()=>{
 const result=prepareWHMAccount({domain:"client.com",username:"clientx",plan:"basic",contactEmail:"client@example.com"},env);
 assert.equal(result.url.hostname,"whm.example.com");
 for(const [key,value] of [["forcedns","0"],["hasshell","0"],["showpass","n"],["api.version","1"],["plan","basic"]])assert.equal(result.url.searchParams.get(key),value);
 assert.equal(result.url.searchParams.has("password"),false);
});
test("WHM creation returns safe metadata only after two independent gates",async()=>{
 let calls=0;
 const fetchFn=async (_url,options)=>{
  calls++;assert.match(options.headers.Authorization,/^whm reseller:/);
  return {ok:true,json:async()=>({metadata:{result:1},data:{nameserver:"ns1.example.com",nameserver2:"ns2.example.com"}})};
 };
 const result=await provisionWHMAccount({domain:"client.com",username:"clientx",plan:"basic",contactEmail:"client@example.com"},{env,fetchFn,paymentVerified:true,adminApproved:true});
 assert.equal(result.provisioned,true);assert.equal(calls,1);
 assert.deepEqual(result.nameservers,["ns1.example.com","ns2.example.com"]);
 assert.ok(!JSON.stringify(result).includes("test-token"));
});
