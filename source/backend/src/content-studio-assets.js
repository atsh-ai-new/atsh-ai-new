import {z} from "zod";

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
const pose=z.enum(["stand","walk-a","walk-b","talk-open","sit","enter","exit"]);
export const heroImage=z.object({pose,image:artImage}).strict();
const images=z.array(heroImage).min(1).max(3).refine(x=>new Set(x.map(p=>p.pose)).size===x.length,"لا تكرر وضعية الصورة");
const voice=z.object({pitch:z.number().min(-3).max(3),speed:z.number().min(.8).max(1.2),intonation:z.number().min(.8).max(1.2)}).strict();
export const assetSchema=z.discriminatedUnion("kind",[
 z.object({kind:z.literal("hero"),name:z.string().trim().min(1).max(80),images,voice}).strict(),
 z.object({kind:z.enum(["background","prop"]),name:z.string().trim().min(1).max(80),images:z.array(z.object({pose:z.literal("stand"),image:artImage}).strict()).length(1)}).strict()
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerStudioAssetRoutes(app,{pool,requireAdmin,requirePermission,requireRole,roles,route}){
 const auth=[requireAdmin,requirePermission("assistant"),requireRole(...roles)],path="/api/admin/content-studio/assets";
 app.get(path,...auth,route(async(req,res)=>{
  const q=await pool.query("SELECT id,kind,name,archived,revision,updated_at FROM content_studio_assets ORDER BY archived,updated_at DESC LIMIT 200");
  res.json({assets:q.rows});
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
