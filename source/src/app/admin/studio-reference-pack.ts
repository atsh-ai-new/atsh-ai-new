// Imports references only; no execution of embedded code or remote URL fetch.
export const angles={
 front:"أمام", "front-left":"أمام مائل يسارًا",left:"جانب يسار",
 "rear-left":"خلف مائل يسارًا",back:"خلف","rear-right":"خلف مائل يمينًا",
 right:"جانب يمين","front-right":"أمام مائل يمينًا",
} as const;
export type ViewAngle=keyof typeof angles;
export type AngleImage={angle:ViewAngle;image:string};
export type Accessory={id:string;name:string;image:string};
export type WardrobeReference={id:string;name:string;images:[];referenceAngles:AngleImage[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plain=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const image=(s:unknown):s is string=>typeof s==="string"&&s.length>=40&&s.length<=245760&&s.startsWith("UklGR")&&/^[A-Za-z0-9+/]+={0,2}$/.test(s);
export function parseReferencePack(value:unknown):{name:string;referenceAngles:AngleImage[];accessories:Accessory[];outfits?:WardrobeReference[]} {
 const fail=()=>{throw Error("ملف حزمة الزوايا غير صالح.");};
 if(!plain(value)||value.format!=="atsh-character-references-v1"||typeof value.name!=="string"||!value.name.trim()||value.name.trim().length>80)throw Error("ملف حزمة الزوايا غير صالح.");
 if(!Array.isArray(value.referenceAngles)||!value.referenceAngles.length||value.referenceAngles.length>8||!Array.isArray(value.accessories)||value.accessories.length>12)return fail();
 const readAngles=(raw:unknown[]):AngleImage[]=>{
 if(raw.length<1||raw.length>8)throw Error("عدد الزوايا غير صالح.");
 const values:AngleImage[]=raw.map(v=>{
  if(!plain(v)||typeof v.angle!=="string"||!Object.hasOwn(angles,v.angle)||!image(v.image))throw Error("زاوية شخصية أو صورة غير صالحة.");
  return {angle:v.angle as ViewAngle,image:v.image};
 });
 if(new Set(values.map(v=>v.angle)).size!==values.length)throw Error("زاوية مكررة.");
 return values;
 };
 const referenceAngles=readAngles(value.referenceAngles);
 const accessories:Accessory[]=value.accessories.map(v=>{
  if(!plain(v)||typeof v.id!=="string"||!uuid.test(v.id)||typeof v.name!=="string"||!v.name.trim()||v.name.trim().length>40||!image(v.image))throw Error("بيانات إكسسوار غير صالحة.");
  return {id:v.id,name:v.name.trim(),image:v.image};
 });
 if(new Set(referenceAngles.map(x=>x.angle)).size!==referenceAngles.length||new Set(accessories.map(x=>x.id)).size!==accessories.length)return fail();
  const outfits:WardrobeReference[]|undefined=value.outfits===undefined?undefined:(()=>{
  if(!Array.isArray(value.outfits)||value.outfits.length>3)throw Error("عدد الأطقم غير صالح.");
  const entries:WardrobeReference[]=value.outfits.map(v=>{
   if(!plain(v)||typeof v.id!=="string"||!uuid.test(v.id)||typeof v.name!=="string"||!v.name.trim()||v.name.trim().length>40||!Array.isArray(v.referenceAngles))throw Error("بيانات الطقم غير صالحة.");
   return {id:v.id,name:v.name.trim(),images:[],referenceAngles:readAngles(v.referenceAngles)};
  });
  if(new Set(entries.map(v=>v.id)).size!==entries.length)throw Error("الطقم مكرر.");
  return entries;
 })();
 return {name:value.name.trim(),referenceAngles,accessories,...(outfits?{outfits}:{})};
}
