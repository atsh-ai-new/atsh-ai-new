import {artImage,heroImage} from "./content-studio-assets.js";
import { z } from "zod";
import {registerPortraitRoutes,portraitCancelSQL} from "./portrait-worker.js";
import { createHash } from "node:crypto";
const color=z.string().regex(/^#[0-9a-f]{6}$/i);
const id=z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/);
const positions={"left":.18,"center-left":.38,"center":.5,"center-right":.62,"right":.82};
const voice=z.object({engine:z.literal("tiny-ar-msa"),pitch:z.number().min(-3).max(3),speed:z.number().min(.8).max(1.2),intonation:z.number().min(.8).max(1.2)}).strict();
const snapshot=z.object({id:z.string().uuid(),revision:z.number().int().min(1),images:z.array(heroImage).min(1).max(3).refine(v=>new Set(v.map(p=>p.pose)).size===v.length)}).strict();
const sceneArt=z.object({id:z.string().uuid(),revision:z.number().int().min(1),image:artImage,mode:z.enum(["background","full"]),framing:z.enum(["fit","fill"]).optional()}).strict();
const propArt=z.object({id:z.string().uuid(),revision:z.number().int().min(1),image:artImage,x:z.number().min(0).max(1),y:z.number().min(0).max(1),size:z.number().min(.1).max(1),foreground:z.boolean()}).strict();
const character=z.object({id,name:z.string().trim().min(1).max(30),skin:color,shirt:color,hairColor:color,hair:z.enum(["short","long","bald"]),glasses:z.boolean(),beard:z.boolean(),voice,artwork:snapshot.optional()}).strict();
const placement=z.object({characterId:id,position:z.enum(["left","center-left","center","center-right","right"]),expression:z.enum(["neutral","happy","curious","serious"]),gesture:z.enum(["idle","wave","point","explain"]),pose:z.enum(["sit","stand","walk"]).optional(),action:z.enum(["stand","walk","sit","stairs-up","stairs-down","enter","exit"]).optional()}).strict();
const line=z.object({id,speakerId:id,text:z.string().trim().min(1).max(180),pronunciation:z.string().max(180),start:z.number().min(0).max(8)}).strict();
export const characterAnimationSchema=z.object({version:z.literal(1),mode:z.literal("cartoon"),cast:z.array(character).min(1).max(4),shots:z.array(z.object({sceneIndex:z.number().int().min(0).max(3),background:z.enum(["studio","office","technology"]),placements:z.array(placement).min(1).max(4),dialogue:z.array(line).min(1).max(4),artwork:sceneArt.optional(),props:z.array(propArt).max(2).optional(),screenTexts:z.array(z.object({text:z.string().trim().min(1).max(90),start:z.number().min(0).max(8),end:z.number().min(0).max(8),position:z.enum(["top","middle","bottom"])}).strict()).max(3).optional()}).strict()).min(1).max(4),subtitles:z.boolean(),music:z.boolean(),musicVolume:z.number().min(0).max(.3),speechVolume:z.number().min(.5).max(1.5),mouthIntensity:z.number().min(.5).max(1.5)}).strict();
export function refineCharacterPlan(plan,ctx){
  const a=plan.animation;if(!a)return;
  const fail=(message,path=[])=>ctx.addIssue({code:"custom",message,path:["animation",...path]});
  const ids=new Set(a.cast.map(c=>c.id));if(ids.size!==a.cast.length||new Set(a.cast.map(c=>c.name.trim())).size!==a.cast.length)fail("أسماء وهويات الشخصيات يجب أن تكون مختلفة.");
  if(a.shots.length!==plan.scenes.length||new Set(a.shots.map(s=>s.sceneIndex)).size!==plan.scenes.length)fail("كل مشهد يحتاج إعداد حركة واحد.");
  const lines=new Set();let total=0;
  let artSize=0; for(const c of a.cast)for(const i of c.artwork?.images||[])artSize+=i.image.length;for(const s of a.shots){artSize+=s.artwork?.image.length||0;for(const p of s.props||[])artSize+=p.image.length;} if(artSize>3400000)fail("حجم صور المشروع أكبر من الحد المسموح.");
  for(const s of a.shots){
    const scene=plan.scenes[s.sceneIndex];if(!scene){fail("رقم مشهد غير صالح.");continue}
    const present=new Set(s.placements.map(p=>p.characterId));const slots=s.placements.map(p=>positions[p.position]).sort((a,b)=>a-b);
    if(present.size!==s.placements.length||[...present].some(i=>!ids.has(i))||slots.some((p,i)=>i>0&&p-slots[i-1]<.15))fail("وزّع الشخصيات دون تكرار أو تداخل في المشهد.");
    for(const p of s.placements){const c=a.cast.find(c=>c.id===p.characterId);if(p.action&&!c?.artwork&&s.artwork?.mode!=="full")fail("اختر صورًا للبطل قبل اختيار حركة الصور.");if(p.action&&p.action!=="stand"&&s.artwork?.mode!=="full"){const poses=new Set(c?.artwork?.images.map(i=>i.pose)||[]);if(p.action==="walk"||p.action.startsWith("stairs")){if(!poses.has("walk-a")||!poses.has("walk-b"))fail("حركة المشي والسلالم تحتاج صورتين لخطوتين مختلفتين.");}else if(!poses.has(p.action))fail("أضف صورة الوضعية المطلوبة للبطل.");}}
    if(s.screenTexts?.some(t=>t.end<=t.start||t.end>scene.seconds))fail("راجع بداية ونهاية النص الظاهر على الشاشة.");
    const starts=new Set();
    for(const l of s.dialogue){total++;if(lines.has(l.id)||!present.has(l.speakerId)||l.start>=scene.seconds-.1||starts.has(l.start)||/[A-Za-z]/.test(l.pronunciation||l.text))fail("تأكد من المتكلم ووقت البداية والنطق العربي لكل جملة.");lines.add(l.id);starts.add(l.start);}
  }
  if(total>12)fail("الحد الأقصى 12 جملة.");
}
export function characterConfigured(){return Boolean(process.env.N8N_CHARACTER_PLAN_URL&&process.env.CHARACTER_SERVICE_TOKEN&&process.env.CHARACTER_SERVICE_URL&&process.env.N8N_AD_APPROVED_PLAN_TOKEN)}
export function characterWorkflow(plan){
  const isCartoon=Boolean(plan.animation);
  const url=new URL(isCartoon?process.env.N8N_CHARACTER_PLAN_URL:process.env.N8N_AD_APPROVED_PLAN_URL);
  if(url.username||url.password||url.hash||!["http:","https:"].includes(url.protocol))throw Error("Invalid workflow");
  if(process.env.NODE_ENV==="production"&&url.protocol!=="https:"&&!(process.env.N8N_ALLOW_INTERNAL_HTTP==="true"&&["localhost","127.0.0.1","n8n"].includes(url.hostname)))throw Error("Invalid workflow transport");
  return {url,token:process.env.N8N_AD_APPROVED_PLAN_TOKEN};
}
export function characterDraftView(row){
  const { _jobToken,_rendererJobId,_jobProgress,_productionError,_cancelRequested,...plan}=row.production_plan||{};
  return {...row,production_plan:plan,has_video:Boolean(row.video_size),progress:_jobProgress||null,productionError:_productionError||null,cancelRequested:Boolean(_cancelRequested)};
}
export function registerCharacterRoutes(app,{pool,requireAdmin,requirePermission,requireRole,roles,route,rateLimit,updateSchema,auditChange}){
 const auth=[requireAdmin,requirePermission("assistant"),requireRole(...roles)];
 const uuid=/^[0-9a-f-]{36}$/i;
 registerPortraitRoutes(app,{pool,auth,route,rateLimit,auditChange});
 app.post("/api/admin/content-studio/manual",...auth,route(async(req,res)=>{
  const parsed=updateSchema.safeParse(req.body);if(!parsed.success||!parsed.data.productionPlan.animation)return res.status(400).json({error:parsed.error?.issues[0]?.message||"راجع تفاصيل المشروع."});
  const x=parsed.data;const plan={...x.productionPlan,approved:false,campaign:{...x.productionPlan.campaign,totalDurationSeconds:x.productionPlan.scenes.reduce((n,s)=>n+s.seconds,0)}};
  const c=await pool.connect();try{await c.query("BEGIN");
  const q=await c.query("INSERT INTO content_studio_drafts(title,source_filename,brief_markdown,production_plan,status,created_by,updated_by) VALUES($1,'cartoon-manual.txt',$2,$3::jsonb,$4,$5,$5) RETURNING id,title,source_filename,brief_markdown,production_plan,status,video_size,video_generated_at,updated_at",[x.title,x.briefMarkdown,JSON.stringify(plan),x.status,req.admin.email]);
  await auditChange(c,req.admin.email,"content_studio.manual","content_studio_draft",q.rows[0].id,null,{title:x.title,status:x.status});await c.query("COMMIT");res.status(201).json({draft:characterDraftView(q.rows[0])});
  }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
 }));
 app.post("/api/admin/content-studio/voice-preview",...auth,rateLimit({windowMs:60000,limit:5,standardHeaders:"draft-8",legacyHeaders:false}),route(async(req,res)=>{
  if(!characterConfigured())return res.status(503).json({error:"محرك الصوت غير متصل."});
  const p=z.object({text:z.string().trim().min(1).max(90),pronunciation:z.string().max(90),pitch:z.number().min(-3).max(3),speed:z.number().min(.8).max(1.2),intonation:z.number().min(.8).max(1.2)}).strict().safeParse(req.body);if(!p.success||/[A-Za-z]/.test(p.data.pronunciation||p.data.text))return res.status(400).json({error:"اكتب نصًا عربيًا قصيرًا."});
  try{const r=await fetch(new URL("/voice-preview",process.env.CHARACTER_SERVICE_URL),{method:"POST",headers:{Authorization:"Bearer "+process.env.CHARACTER_SERVICE_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(p.data),redirect:"error",signal:AbortSignal.timeout(30000)});if(!r.ok)return res.status(503).json({error:"محرك الصوت مشغول؛ حاول بعد قليل."});const b=Buffer.from(await r.arrayBuffer());if(b.length>4*1024*1024||b.subarray(0,4).toString()!=="RIFF")return res.status(502).end();res.type("audio/wav").set("Cache-Control","no-store").send(b);}catch{return res.status(502).json({error:"تعذر معاينة الصوت."})}
 }));
 app.post("/api/integrations/content-studio/:id/progress",route(async(req,res)=>{
  const token=String(req.get("authorization")||"").replace(/^Bearer /,"");if(!uuid.test(req.params.id)||!/^([a-f0-9]{64})$/.test(token))return res.status(401).end();
  const p=z.object({jobId:z.string().regex(/^[0-9a-f]{32}$/),stage:z.enum(["created","voices_ready","timeline_ready","scenes_ready"])}).strict().safeParse(req.body);if(!p.success)return res.status(400).end();
  const q=await pool.query("UPDATE content_studio_drafts SET production_plan=production_plan||jsonb_build_object('_rendererJobId',$3::text,'_jobProgress',$4::text) WHERE id=$1 AND status='generating' AND production_plan->>'_jobToken'=$2 RETURNING production_plan->>'_cancelRequested' AS cancelled",[req.params.id,createHash("sha256").update(token).digest("hex"),p.data.jobId,p.data.stage]);
  if(!q.rowCount)return res.status(409).end();if(q.rows[0].cancelled==="true"){await cancelRenderer(p.data.jobId);return res.status(409).json({cancelled:true})}res.json({accepted:true});
 }));
 app.post("/api/admin/content-studio/:id/cancel",...auth,route(async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(404).end();
  const portrait=await pool.query(portraitCancelSQL,[req.params.id]);
  if(portrait.rowCount)return res.status(202).json({accepted:true});
  const q=await pool.query("UPDATE content_studio_drafts SET production_plan=production_plan||jsonb_build_object('_cancelRequested',true) WHERE id=$1 AND status='generating' AND production_plan ? 'animation' RETURNING production_plan->>'_rendererJobId' AS renderer",[req.params.id]);
  if(!q.rowCount)return res.status(409).json({error:"لا يوجد إنتاج كرتوني جارٍ."});if(q.rows[0].renderer)await cancelRenderer(q.rows[0].renderer);res.status(202).json({accepted:true});
 }));
}
async function cancelRenderer(id){if(!/^[a-f0-9]{32}$/.test(id)||!characterConfigured())return;try{await fetch(new URL("/jobs/"+id+"/cancel",process.env.CHARACTER_SERVICE_URL),{method:"POST",headers:{Authorization:"Bearer "+process.env.CHARACTER_SERVICE_TOKEN,"Content-Type":"application/json"},body:"{}",redirect:"error",signal:AbortSignal.timeout(5000)});}catch{}}
