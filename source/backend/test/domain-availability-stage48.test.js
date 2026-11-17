import test from "node:test";
import assert from "node:assert/strict";
import {canonicalDomain,parseNamecheapCheck,checkDomainWithNamecheap} from "../src/domain-availability.js";
const OK='<ApiResponse Status="OK"><CommandResponse Type="namecheap.domains.check"><DomainCheckResult Domain="example.com" Available="true" ErrorNo="0" IsPremiumName="false" PremiumRegistrationPrice="0" /></CommandResponse></ApiResponse>';
test("domain validation denies path, wildcard, invalid labels and IP",()=>{
 assert.equal(canonicalDomain(" Example.COM "),"example.com");
 for(const invalid of ["bad/path.com","*.example.com","-domain.com","example","example..com","127.0.0.1",""])assert.equal(canonicalDomain(invalid),null,invalid);
});
test("parse Namecheap availability without inventing standard registration price",()=>{
 const out=parseNamecheapCheck(OK,"example.com");
 assert.equal(out.available,true);assert.equal(out.premiumRegistrationPriceUsd,null);
 assert.throws(()=>parseNamecheapCheck(OK,"another.com"));
 assert.throws(()=>parseNamecheapCheck(OK.replace('Status="OK"','Status="ERROR"'),"example.com"));
});
test("sandbox vs production configuration and no registration",async()=>{
 const env={NAMECHEAP_API_KEY:"sample",NAMECHEAP_API_USER:"test",NAMECHEAP_USERNAME:"test",NAMECHEAP_CLIENT_IP:"127.0.0.1"};
 let called="";
 const fetchFn=async url=>{called=url.toString();return {ok:true,text:async()=>OK};};
 const result=await checkDomainWithNamecheap("example.com",{env,fetchFn});
 assert.equal(result.available,true);assert.equal(result.reservation,false);assert.equal(result.environment,"sandbox");
 assert.ok(called.startsWith("https://api.sandbox.namecheap.com/xml.response?"));
 assert.equal(new URL(called).searchParams.get("DomainList"),"example.com");
 const unavailable=await checkDomainWithNamecheap("example.com",{env:{},fetchFn});
 assert.equal(unavailable.configured,false);assert.equal(unavailable.available,null);
});
