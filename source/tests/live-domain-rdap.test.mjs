import test from "node:test";
import assert from "node:assert/strict";
import {normalizeDomain, lookupRegistry, findAuthoritativeRdapBase} from "../src/lib/live-domain-rdap.ts";

const services=[
 [["com"],["https://rdap.verisign.com/com/v1/"]],
 [["org"],["https://rdap.publicinterestregistry.org/rdap/"]],
 [["uk"],["https://rdap.uk.example/"]],
 [["co.uk"],["https://rdap.co.uk.example/"]]
];

test("normalizes input and rejects domain-less/unsafe names",()=>{
 assert.equal(normalizeDomain("ATSH.COM"),"atsh.com");
 assert.equal(normalizeDomain(" atsh.com. "),"atsh.com");
 for(const name of ["atsh","a", "http://atsh.com", "-bad.com", "atsh.com/path","127.0.0.1","foo@atsh.com"]){
  assert.equal(normalizeDomain(name),null,name);
 }
});

test("IANA bootstrap chooses longest matching suffix and rejects unsafe bases",()=>{
 assert.equal(findAuthoritativeRdapBase("hello.co.uk",services).hostname,"rdap.co.uk.example");
 assert.equal(findAuthoritativeRdapBase("atsh.com",services).href,"https://rdap.verisign.com/com/v1/");
 assert.equal(findAuthoritativeRdapBase("atsh.eg",services),null);
 assert.equal(findAuthoritativeRdapBase("atsh.com",[[["com"],["https://127.0.0.1/"]]]),null);
});

test("confirmed registry record is marked registered and not available",async()=>{
 const found=await lookupRegistry("atsh.com",{services,fetchFn:async url=>{
  assert.equal(url.toString(),"https://rdap.verisign.com/com/v1/domain/atsh.com");
  return {status:200,json:async()=>({objectClassName:"domain",ldhName:"ATSH.COM"})};
 }});
 assert.equal(found.status,"registered");
 assert.equal(found.available,false);
 assert.equal(found.verifiedRegistration,true);
 assert.equal(found.reservation,false);
});

test("404 is not registered, not guaranteed available to buy",async()=>{
 const found=await lookupRegistry("newbrand.com",{services,fetchFn:async()=>({status:404})});
 assert.equal(found.status,"not_registered");
 assert.equal(found.available,null);
 assert.equal(found.regularPriceVerified,false);
});

test("unsupported extension is inconclusive",async()=>{
 const found=await lookupRegistry("atsh.eg",{services,fetchFn:async()=>{throw Error("Should not fetch");}});
 assert.equal(found.status,"unsupported");
 assert.equal(found.available,null);
 assert.equal(found.verifiedRegistration,false);
});

test("registry errors do not falsely report availability",async()=>{
 await assert.rejects(()=>lookupRegistry("atsh.com",{services,fetchFn:async()=>({status:429})}),/RDAP unavailable/);
 await assert.rejects(()=>lookupRegistry("atsh.com",{services,fetchFn:async()=>({status:200,json:async()=>({objectClassName:"domain",ldhName:"wrong.com"})})}),/Unexpected RDAP/);
});
