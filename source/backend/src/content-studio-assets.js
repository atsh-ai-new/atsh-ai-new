import {z} from "zod";
import {voiceIdSchema} from "./studio-voices.js";

// Canonical WebP, encoded in-browser with bounded size and resolution.
export function validWebp(s){
 if(typeof s!=="string"||s.length>245760)return false;
 const b=Buffer.from(s,"base64");
 if(b.length<30||b.toString("base64")!==s||b.toString("ascii",0,4)!=="RIFF"||b.readUInt32LE(4)!==b.length-8||b.toString("ascii",8,12)!=="WEBP")return false;
 let w=0,h=0;
 const type=b.toString("ascii",12,16);
 if(type==="VP8X"){if(b[20]&2)return false;w=1+b.readUIntLE(24,3);h=1+b.readUIntLE(27,3);}
 else if(type==="VP8L"&&b[20]===0x2f){const n=b.readUInt32LE(21);w=(n&0x3fff)+1;h=((n>>>14)&0x3fff)+1;}
 else if(type==="VP8 "&&b[23]===0x9d&&b[24]===1&&b[25]===0x2a){w=b.readUInt16LE(26)&0x3fff;h=b.readUInt16LE(28)&0x3fff;}
 return w>0&&h>0&&w<=1920&&h<=1920&&w*h<=2073600;
}
export const artImage=z.string().max(245760).refine(validWebp,"صورة WebP غير صالحة أو أكبر من الحد المسموح");
const pose=z.enum(["stand","walk-a","walk-b","talk-open","sit","enter","exit","eat","wave","point","explain","think","tablet","closed","open"]);
export const heroImage=z.object({pose,image:artImage}).strict();
export const imagesSchema=z.array(heroImage).min(1).max(15).refine(x=>new Set(x.map(p=>p.pose)).size===x.length,"لا تكرر وضعية الصورة");
const rigParts=["torso","head","left-arm","right-arm","left-leg","right-leg","mouth-open","eyes-closed"];
export const rigSchema=z.array(z.object({part:z.enum(rigParts),image:artImage,pivotX:z.number().min(0).max(1),pivotY:z.number().min(0).max(1)}).strict()).min(7).max(8).refine(v=>new Set(v.map(x=>x.part)).size===v.length&&rigParts.slice(0,7).every(k=>v.some(x=>x.part===k)),"أضف طبقات الجسم والرأس والذراعين والساقين والفم دون تكرار");
export const outfitSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(40),images:imagesSchema,rig:rigSchema.optional()}).strict();
export const outfitsSchema=z.array(outfitSchema).max(3).refine(x=>new Set(x.map(o=>o.id)).size===x.length);
const voice=z.object({voiceId:voiceIdSchema.optional(),pitch:z.number().min(-3).max(3),speed:z.number().min(.8).max(1.2),intonation:z.number().min(.8).max(1.2)}).strict();
export const audioData=z.string().max(1400000).refine(s=>{const b=Buffer.from(s,"base64");return b.length>=12&&b.toString("base64")===s&&((b.toString("ascii",0,4)==="RIFF"&&b.toString("ascii",8,12)==="WAVE")||b.toString("ascii",0,3)==="ID3"||(b[0]===255&&(b[1]&224)===224));},"اختر صوت WAV أو MP3 صالحًا");
export const assetSchema=z.discriminatedUnion("kind",[
 z.object({kind:z.literal("hero"),name:z.string().trim().min(1).max(80),category:z.enum(["human","animal"]).optional(),images:imagesSchema,voice,rig:rigSchema.optional(),outfits:outfitsSchema.optional()}).strict(),
 z.object({kind:z.enum(["background","prop"]),name:z.string().trim().min(1).max(80),category:z.enum(["background","vehicle","door","object"]).optional(),locationType:z.enum(["restaurant","school","clinic","shop","office","home","street","workshop","hospital","other"]).optional(),images:z.array(heroImage).min(1).max(3).refine(v=>new Set(v.map(x=>x.pose)).size===v.length)}).strict()
,
 z.object({kind:z.literal("music"),name:z.string().trim().min(1).max(80),category:z.enum(["music","effect"]),images:z.array(heroImage).length(0),audio:audioData}).strict()
]).superRefine((asset,ctx)=>{if(asset.kind==="music")return;if(asset.kind!=="hero"){if(asset.kind!=="background"&&asset.locationType)ctx.addIssue({code:"custom",message:"تصنيف المكان للخلفيات فقط"});if(!asset.images.some(i=>i.pose==="stand"))ctx.addIssue({code:"custom",message:"أضف الصورة الأساسية"});if(asset.kind==="background"&&asset.images.length!==1)ctx.addIssue({code:"custom",message:"الخلفية صورة واحدة"});}else{const size=[asset,...(asset.outfits||[])].reduce((n,a)=>n+a.images.reduce((m,i)=>m+i.image.length,0)+(a.rig||[]).reduce((m,i)=>m+i.image.length,0),0);if(size>3400000)ctx.addIssue({code:"custom",message:"حجم أصل الشخصية أكبر من الحد المسموح"});}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerStudioAssetRoutes(app,{pool,requireAdmin,requirePermission,requireRole,roles,route}){
 const auth=[requireAdmin,requirePermission("assistant"),requireRole(...roles)],path="/api/admin/content-studio/assets";
 app.get(path,...auth,route(async(req,res)=>{
  const q=await pool.query("SELECT id,kind,name,archived,revision,updated_at,payload->>'category' AS category,payload->>'locationType' AS \"locationType\" FROM content_studio_assets ORDER BY archived,updated_at DESC LIMIT 200");
  res.json({assets:q.rows});
 }));
 app.get(path+"/:id/thumbnail",...auth,route(async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(404).end();
  const q=await pool.query("SELECT payload->'images'->0->>'image' AS image FROM content_studio_assets WHERE id=$1",[req.params.id]);
  const image=q.rows[0]?.image;
  if(!validWebp(image))return res.status(404).end();
  res.set("Cache-Control","private, max-age=300").type("image/webp").send(Buffer.from(image,"base64"));
 }));
 app.get(path+"/:id",...auth,route(async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(404).end();
  const q=await pool.query("SELECT id,kind,name,payload,archived,revision FROM content_studio_assets WHERE id=$1",[req.params.id]);
  if(!q.rowCount)return res.status(404).end();res.json({asset:q.rows[0]});
 }));
 app.post(path,...auth,route(async(req,res)=>{
  const p=assetSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"راجع اسم الأصل والصور والوضعيات."});
  const c=await pool.connect();try{await c.query("BEGIN");await c.query("LOCK TABLE content_studio_assets IN SHARE ROW EXCLUSIVE MODE");
   const count=await c.query("SELECT count(*)::int AS n FROM content_studio_assets");if(count.rows[0].n>=200){await c.query("ROLLBACK");return res.status(409).json({error:"المكتبة ممتلئة. احذف أصلًا غير مستخدم."});}
   const r=await c.query("INSERT INTO content_studio_assets(kind,name,payload) VALUES($1,$2,$3::jsonb) RETURNING id,kind,name,archived,revision",[p.data.kind,p.data.name,JSON.stringify(p.data)]);await c.query("COMMIT");res.status(201).json({asset:r.rows[0]});
  }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
 }));
 app.patch(path+"/:id",...auth,route(async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(404).end();
  const p=assetSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"راجع بيانات الأصل."});
  const r=await pool.query("UPDATE content_studio_assets SET name=$2,payload=$3::jsonb,revision=revision+1,updated_at=now() WHERE id=$1 AND kind=$4 RETURNING id,kind,name,archived,revision",[req.params.id,p.data.name,JSON.stringify(p.data),p.data.kind]);if(!r.rowCount)return res.status(404).end();res.json({asset:r.rows[0]});
 }));
 app.post(path+"/:id/archive",...auth,route(async(req,res)=>{
  if(!uuid.test(req.params.id)||typeof req.body?.archived!=="boolean")return res.status(400).end();
  const r=await pool.query("UPDATE content_studio_assets SET archived=$2,updated_at=now() WHERE id=$1 RETURNING id",[req.params.id,req.body.archived]);if(!r.rowCount)return res.status(404).end();res.json({ok:true});
 }));
 app.delete(path+"/:id",...auth,route(async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(404).end();
  const r=await pool.query("DELETE FROM content_studio_assets WHERE id=$1 RETURNING id",[req.params.id]);if(!r.rowCount)return res.status(404).end();res.json({ok:true});
 }));
}

