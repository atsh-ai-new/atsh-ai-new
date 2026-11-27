import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
import {synthesizeStudioVoice} from "./studio-voices.js";
import {validWebp} from "./content-studio-assets.js";
import {contentVideoTimeoutMinutes} from "./content-video-timeout.js";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=/^[a-f0-9]{64}$/;
const digest=token=>createHash("sha256").update(token).digest("hex");
export function workerAuthorized(header,secret=process.env.PORTRAIT_WORKER_TOKEN){
  return typeof secret==="string"&&key.test(secret)&&typeof header==="string"&&
    /^Bearer [a-f0-9]{64}$/.test(header)&&timingSafeEqual(Buffer.from(header.slice(7)),Buffer.from(secret));
}
function configured(){
  return key.test(process.env.PORTRAIT_WORKER_TOKEN||"")&&Boolean(process.env.CHARACTER_SERVICE_URL&&process.env.CHARACTER_SERVICE_TOKEN);
}
// This initial AI mode deliberately does not silently discard custom scene layers.
export function portraitInput(plan){
  const a=plan?.animation,scene=plan?.scenes?.[0],shot=a?.shots?.[0],c=a?.cast?.[0],line=shot?.dialogue?.[0];
  const image=c?.artwork?.images?.find(i=>i.pose==="stand")?.image;
  if(plan?.scenes?.length!==1||a?.shots?.length!==1||a?.cast?.length!==1||shot?.placements?.length!==1||
    shot.sceneIndex!==0||shot?.dialogue?.length!==1||shot.placements[0].characterId!==c.id||line.speakerId!==c.id||
    !validWebp(image)||!Number.isFinite(scene.seconds)||scene.seconds<3||scene.seconds>8||
    !Number.isFinite(line.start)||line.start<0||line.start>=scene.seconds-.1||!line.text?.trim()||
    line.text.length>90||(line.pronunciation||"").length>90||/[A-Za-z]/.test(line.pronunciation||line.text)||
    shot.artwork||shot.props?.length||shot.screenTexts?.length||shot.effect||a.musicTrack||a.music||a.subtitles||shot.placements[0].outfitId||
    (shot.placements[0].action&&shot.placements[0].action!=="stand")||shot.placements[0].pose==="walk"||
    shot.placements[0].pose==="sit"||scene.caption||scene.motion!=="static"){
    throw Error("الصورة الناطقة تحتاج مشهدًا ثابتًا واحدًا (3–8 ثوانٍ)، صورة بطل واحد، وجملة عربية حتى 90 حرفًا دون إضافات المشهد أو الموسيقى أو الترجمة.");
  }
  const {pitch,speed,intonation,voiceId}=c.voice;
  return {image,seconds:scene.seconds,start:line.start,speechVolume:a.speechVolume,voice:{text:line.text,pronunciation:line.pronunciation||"",pitch,speed,intonation,...(voiceId?{voiceId}:{})}};
}
export const portraitCancelSQL="UPDATE content_studio_drafts SET status='reviewed',updated_at=now(),production_plan=(production_plan-'_jobToken'-'_jobProgress'-'_rendererJobId'-'_cancelRequested')||jsonb_build_object('_productionError','character_cancelled') WHERE id=$1 AND status='generating' AND production_plan->>'_jobProgress' IN ('portrait_queued','portrait_running') RETURNING id";
async function synthesize(input){return (await synthesizeStudioVoice(input.voice)).toString("base64");}
export function registerPortraitRoutes(app,{pool,auth,route,rateLimit,auditChange}){
  let lastSeen=0;
  const base="/api/admin/content-studio",integration="/api/integrations/portrait-worker";
  const limit=()=>rateLimit({windowMs:60000,limit:30,standardHeaders:"draft-8",legacyHeaders:false});
  const authenticate=(req,res,next)=>{if(!configured()||!workerAuthorized(req.get("authorization")))return res.status(401).end();lastSeen=Date.now();next();};
  app.get(base+"/portrait/status",...auth,route(async(_req,res)=>res.set("Cache-Control","no-store").json({configured:configured(),online:configured()&&Date.now()-lastSeen<90000})));
  app.post(base+"/:id/portrait",...auth,limit(),route(async(req,res)=>{
    if(!uuid.test(req.params.id))return res.status(404).end();
    if(!configured())return res.status(503).json({error:"عامل معالجة الصور على الكمبيوتر غير مهيأ."});
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const q=await client.query("SELECT status,production_plan FROM content_studio_drafts WHERE id=$1 FOR UPDATE",[req.params.id]);
      if(!q.rowCount||q.rows[0].status!=="reviewed"){await client.query("ROLLBACK");return res.status(409).json({error:"احفظ واعتمد المشروع أولًا."});}
      try{portraitInput(q.rows[0].production_plan);}catch(e){await client.query("ROLLBACK");return res.status(400).json({error:e.message});}
      await client.query("UPDATE content_studio_drafts SET status='generating',updated_at=now(),updated_by=$2,production_plan=(production_plan-'_jobToken'-'_jobProgress'-'_rendererJobId'-'_cancelRequested'-'_productionError')||jsonb_build_object('_jobProgress','portrait_queued') WHERE id=$1",[req.params.id,req.admin.email]);
      await auditChange(client,req.admin.email,"content_studio.portrait_queued","content_studio_draft",req.params.id,{status:"reviewed"},{status:"generating"});
      await client.query("COMMIT");
      res.status(202).json({status:"generating",progress:"portrait_queued"});
    }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
  }));
  app.post(integration+"/claim",limit(),authenticate,route(async(_req,res)=>{
    const token=randomBytes(32).toString("hex"),hash=digest(token);
    const q=await pool.query(`WITH pending AS (SELECT id FROM content_studio_drafts WHERE status='generating' AND production_plan->>'_jobProgress'='portrait_queued' AND updated_at>=now()-make_interval(mins => $2::integer) ORDER BY updated_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE content_studio_drafts d SET updated_at=now(),production_plan=d.production_plan||jsonb_build_object('_jobProgress','portrait_running','_jobToken',$1::text) FROM pending WHERE d.id=pending.id RETURNING d.id,d.production_plan`,[hash,contentVideoTimeoutMinutes()]);
    res.set("Cache-Control","no-store");
    if(!q.rowCount)return res.status(204).end();
    const row=q.rows[0];
    try{
      const input=portraitInput(row.production_plan),audio=await synthesize(input);
      const active=await pool.query("SELECT id FROM content_studio_drafts WHERE id=$1 AND status='generating' AND production_plan->>'_jobToken'=$2",[row.id,hash]);
      if(!active.rowCount)return res.status(409).end();
      return res.json({id:row.id,jobToken:token,image:input.image,audio,seconds:input.seconds,start:input.start,speechVolume:input.speechVolume});
    }catch{
      await pool.query("UPDATE content_studio_drafts SET status='reviewed',updated_at=now(),production_plan=(production_plan-'_jobToken'-'_jobProgress')||jsonb_build_object('_productionError','character_stage_failed') WHERE id=$1 AND status='generating' AND production_plan->>'_jobToken'=$2",[row.id,hash]);
      return res.status(502).end();
    }
  }));
  app.post(integration+"/heartbeat",limit(),authenticate,route(async(req,res)=>{
    const {id,jobToken}=req.body||{};
    if(typeof id!=="string"||!uuid.test(id)||typeof jobToken!=="string"||!key.test(jobToken))return res.status(400).end();
    const q=await pool.query("UPDATE content_studio_drafts SET updated_at=now() WHERE id=$1 AND status='generating' AND production_plan->>'_jobProgress'='portrait_running' AND production_plan->>'_jobToken'=$2 RETURNING id",[id,digest(jobToken)]);
    return res.status(q.rowCount?204:409).end();
  }));
}

