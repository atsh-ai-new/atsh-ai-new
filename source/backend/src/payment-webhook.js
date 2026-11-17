import {createHmac,timingSafeEqual} from "node:crypto";
// Internal adapter boundary. The upstream connector MUST independently verify the real gateway's signature/status.
export function verifyInternalPaymentSignature({raw,secret,timestamp,signature,now=Date.now()}){
 if(!Buffer.isBuffer(raw)||!raw.length||raw.length>16384||typeof secret!=="string"||secret.length<32)return false;
 if(!/^[0-9]{10,13}$/.test(String(timestamp||""))||!/^sha256=[a-f0-9]{64}$/i.test(String(signature||"")))return false;
 const n=Number(timestamp),milliseconds=n>1e12?n:n*1000;
 if(Math.abs(now-milliseconds)>300000)return false;
 const expected=createHmac("sha256",secret).update(String(timestamp)).update(".").update(raw).digest();
 const actual=Buffer.from(signature.slice(7),"hex");
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function signInternalPaymentEvent({raw,secret,timestamp}){
 return "sha256="+createHmac("sha256",secret).update(String(timestamp)).update(".").update(raw).digest("hex");
}
