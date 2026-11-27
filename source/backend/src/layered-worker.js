import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
import {voiceAvailable,synthesizeStudioVoice} from "./studio-voices.js";
import {contentVideoTimeoutMinutes} from "./content-video-timeout.js";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=/^[a-f0-9]{64}$/;
const digest=t=>createHash("sha256").update(t).digest("hex");
export function layeredConfigured(){return key.test(process.env.LAYERED_WORKER_TOKEN||"")&&Boolean(process.env.CHARACTER_SERVICE_URL&&process.env.CHARACTER_SERVICE_TOKEN);}
export function layeredAuthorized(header,secret=process.env.LAYERED_WORKER_TOKEN){
 return typeof secret==="string"&&key.test(secret)&&typeof header==="string"&&/^Bearer [a-f0-9]{64}$/.test(header)&&timingSafeEqual(Buffer.from(header.slice(7)),Buffer.from(secret));
}
export function layeredInput(plan){
 const a=plan?.animation;
 if(!a||a.renderer!=="layers-v1"||!["9:16","16:9"].includes(plan.campaign.format))throw Error("اختر محرك الأنيميشن 2.5D ومقاس الشاشة.");
 for(const shot of a.shots){
  if(shot.dialogue.some(l=>!voiceAvailable(a.cast.find(c=>c.id===l.speakerId)?.voice.voiceId)))throw Error("أحد أصوات الشخصيات غير مجهز.");
  if(shot.dialogue.some(l=>l.text.length>90||(l.pronunciation||"").length>90))throw Error("اختصر كل جملة إلى 90 حرفًا.");
  if(shot.props?.some(p=>["open","close"].includes(p.motion)&&!p.stateImage))throw Error("حركة الباب تتطلب صورة الحالة الأخرى.");
  if(shot.artwork?.mode==="full")continue;
  for(const p of shot.placements){
   const c=a.cast.find(c=>c.id===p.characterId);
   const art=p.outfitId?c?.artwork?.outfits?.find(o=>o.id===p.outfitId):c?.artwork;
   if(!art?.images.some(i=>i.pose==="stand"))throw Error("أضف صورة وقوف لكل بطل من المكتبة.");
   if(!art.rig&&p.gesture!=="idle"&&!art.images.some(i=>i.pose===p.gesture))throw Error("حركة اليدين تحتاج بطلًا مجهزًا بطبقات التحريك أو اختر استماع.");
   const action=p.action||p.pose||"stand";
   const poses=new Set(art.images.map(i=>i.pose));
   if(action.startsWith("stairs")||action==="walk"){if(!art.rig&&!(poses.has("walk-a")&&poses.has("walk-b")))throw Error("المشي يحتاج طبقات التحريك أو صورتين للخطوات.");}
   if(["sit","enter","exit","eat"].includes(action)&&!poses.has(action)&&!(art.rig&&action==="sit"))throw Error("أضف صورة الوضعية المطلوبة.");
   if(shot.dialogue.some(l=>l.speakerId===c.id)&&!art.rig&&!poses.has("talk-open"))throw Error("أضف وضعية الفم المفتوح للبطل المتكلم أو جهزه بطبقات التحريك.");
  }
 }
 return plan;
}
export const layeredCancelSQL="UPDATE content_studio_drafts SET status='reviewed',updated_at=now(),production_plan=(production_plan-'_jobToken'-'_jobProgress'-'_rendererJobId'-'_cancelRequested')||jsonb_build_object('_productionError','character_cancelled') WHERE id=$1 AND status='generating' AND production_plan->>'_jobProgress' IN ('layered_queued','layered_running','layered_voices','layered_rendering') RETURNING id";
export function registerLayeredRoutes(app,{pool,auth,route,rateLimit,auditChange}){
 let lastSeen=0;
 const base="/api/admin/content-studio",api="/api/integrations/layered-worker";
 const limit=()=>rateLimit({windowMs:60000,limit:40,standardHeaders:"draft-8",legacyHeaders:false});
 const authenticate=(req,res,next)=>{if(!layeredConfigured()||!layeredAuthorized(req.get("authorization")))return res.status(401).end();lastSeen=Date.now();next();};
 app.get(base+"/layered/status",...auth,route(async(_req,res)=>res.set("Cache-Control","no-store").json({configured:layeredConfigured(),online:layeredConfigured()&&Date.now()-lastSeen<90000})));
 app.post(base+"/:id/layered",...auth,limit(),route(async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(404).end();
  if(!layeredConfigured())return res.status(503).json({error:"محرك الأنيميشن على السيرفر غير مهيأ."});
  const c=await pool.connect();
  try{
   await c.query("BEGIN");
   const q=await c.query("SELECT status,production_plan FROM content_studio_drafts WHERE id=$1 FOR UPDATE",[req.params.id]);
   if(!q.rowCount||q.rows[0].status!=="reviewed"){await c.query("ROLLBACK");return res.status(409).json({error:"احفظ واعتمد المشروع أولًا."});}
   try{layeredInput(q.rows[0].production_plan);}catch(e){await c.query("ROLLBACK");return res.status(400).json({error:e.message});}
   await c.query("UPDATE content_studio_drafts SET status='generating',updated_at=now(),updated_by=$2,production_plan=(production_plan-'_jobToken'-'_jobProgress'-'_rendererJobId'-'_cancelRequested'-'_productionError')||jsonb_build_object('_jobProgress','layered_queued') WHERE id=$1",[req.params.id,req.admin.email]);
   await auditChange(c,req.admin.email,"content_studio.layered_queued","content_studio_draft",req.params.id,{status:"reviewed"},{status:"generating"});
   await c.query("COMMIT");res.status(202).json({status:"generating",progress:"layered_queued"});
  }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
 }));
 app.post(api+"/claim",limit(),authenticate,route(async(_req,res)=>{
  const token=randomBytes(32).toString("hex");
  const q=await pool.query(`WITH pending AS (SELECT id FROM content_studio_drafts WHERE status='generating' AND production_plan->>'_jobProgress'='layered_queued' AND updated_at>=now()-make_interval(mins => $2::integer) ORDER BY updated_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
  UPDATE content_studio_drafts d SET updated_at=now(),production_plan=d.production_plan||jsonb_build_object('_jobProgress','layered_running','_jobToken',$1::text) FROM pending WHERE d.id=pending.id RETURNING d.id,d.production_plan`,[digest(token),contentVideoTimeoutMinutes()]);
  res.set("Cache-Control","no-store");if(!q.rowCount)return res.status(204).end();
  const { _jobToken,_jobProgress,...plan}=q.rows[0].production_plan;
  res.json({id:q.rows[0].id,jobToken:token,plan});
 }));
 app.post(api+"/heartbeat",limit(),authenticate,route(async(req,res)=>{
  const {id,jobToken,stage}=req.body||{};
  if(typeof id!=="string"||!uuid.test(id)||!key.test(jobToken||"")||!["layered_running","layered_voices","layered_rendering"].includes(stage))return res.status(400).end();
  const q=await pool.query("UPDATE content_studio_drafts SET updated_at=now(),production_plan=production_plan||jsonb_build_object('_jobProgress',$3::text) WHERE id=$1 AND status='generating' AND production_plan->>'_jobProgress' IN ('layered_running','layered_voices','layered_rendering') AND production_plan->>'_jobToken'=$2 RETURNING id",[id,digest(jobToken),stage]);
  res.status(q.rowCount?204:409).end();
 }));
 // Synthesise only a line in the claimed saved project (no arbitrary TTS proxy).
 app.post(api+"/voice",limit(),authenticate,route(async(req,res)=>{
  const {id,jobToken,lineId}=req.body||{};
  if(typeof id!=="string"||!uuid.test(id)||!key.test(jobToken||"")||typeof lineId!=="string")return res.status(400).end();
  const q=await pool.query("SELECT production_plan FROM content_studio_drafts WHERE id=$1 AND status='generating' AND production_plan->>'_jobToken'=$2 AND production_plan->>'_jobProgress' IN ('layered_running','layered_voices','layered_rendering')",[id,digest(jobToken)]);
  if(!q.rowCount)return res.status(409).end();
  const a=q.rows[0].production_plan.animation,line=a.shots.flatMap(s=>s.dialogue).find(l=>l.id===lineId),c=a.cast.find(c=>c.id===line?.speakerId);
  if(!line||!c)return res.status(404).end();
  try{
   const {pitch,speed,intonation,voiceId}=c.voice;
   const audio=await synthesizeStudioVoice({text:line.text,pronunciation:line.pronunciation||"",pitch,speed,intonation,voiceId});
   res.type("audio/wav").set("Cache-Control","no-store").send(audio);
  }catch{return res.status(502).end();}
 }));
}
