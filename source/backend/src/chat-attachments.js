import {basename} from "node:path";
const allowed = new Map([
["pdf","application/pdf"],["docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],["xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],["zip","application/zip"],["png","image/png"],["jpg","image/jpeg"],["jpeg","image/jpeg"],["webp","image/webp"],["mp4","video/mp4"],["mp3","audio/mpeg"],["ogg","audio/ogg"]]);
export const MAX_ATTACHMENT_BYTES=10*1024*1024;
export function validateAttachment(name,encoded){
 if(typeof name!=="string"||typeof encoded!=="string"||name.length>180||/[\x00-\x1f\x7f/\\]/.test(name))throw new Error("Invalid attachment");
 const safe=basename(name),ext=safe.split(".").pop().toLowerCase(),mime=allowed.get(ext);
 if(!mime||encoded.length>Math.ceil(MAX_ATTACHMENT_BYTES/3)*4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw new Error("Unsupported attachment");
 const bytes=Buffer.from(encoded,"base64");
 if(!bytes.length||bytes.length>MAX_ATTACHMENT_BYTES)throw new Error("Invalid attachment size");
 const hex=bytes.subarray(0,12).toString("hex");
 const valid=ext==="pdf"?bytes.subarray(0,5).toString()==="%PDF-":ext==="png"?hex.startsWith("89504e470d0a1a0a"):["jpg","jpeg"].includes(ext)?hex.startsWith("ffd8ff"):["zip","docx","xlsx"].includes(ext)?hex.startsWith("504b0304"):ext==="webp"?hex.startsWith("52494646")&&bytes.subarray(8,12).toString()==="WEBP":ext==="mp4"?bytes.subarray(4,8).toString()==="ftyp":ext==="ogg"?bytes.subarray(0,4).toString()==="OggS":hex.startsWith("494433")||((bytes[0]===255)&&(bytes[1]&224)===224);
 if(!valid)throw new Error("Attachment signature mismatch");
 return {name:safe,mime,bytes};
}
