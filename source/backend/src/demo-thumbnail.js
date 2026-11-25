// Only published references may request a thumbnail. Never execute HTML in the API process.
export const validThumbnailId=id=>typeof id==="string"&&/^[a-f0-9]{64}$/.test(id);
export async function publishedThumbnail(db,id){
 if(!validThumbnailId(id))return null;
 const result=await db.query(`SELECT a.thumbnail FROM site_demo_assets a WHERE a.id=$1 AND EXISTS (
 SELECT 1 FROM site_pages p WHERE p.locale='ar' AND p.is_published=true AND (
 (p.slug='catalog' AND EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.content->'items')='array' THEN p.content->'items' ELSE '[]'::jsonb END) i WHERE i->>'previewAssetId'=a.id AND COALESCE(i->>'published','true')!='false' AND COALESCE(i->>'archived','false')!='true'))
 OR (p.slug='home' AND EXISTS (SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(p.content->'featuredSystemHtml')='object' THEN p.content->'featuredSystemHtml' ELSE '{}'::jsonb END) f WHERE f.value->>'assetId'=a.id AND (NOT (p.content ? 'featuredSystemSlugs') OR p.content->'featuredSystemSlugs' ? f.key)))
 ))`,[id]);
 return result.rows[0]?.thumbnail??null;
}
export async function runThumbnailJob(db,render){
 // Select only referenced files; retry failed jobs with backoff. One worker per API instance.
 const r=await db.query(`SELECT a.id,a.html FROM site_demo_assets a WHERE a.thumbnail IS NULL AND (a.thumbnail_retry_at IS NULL OR a.thumbnail_retry_at<now()) AND EXISTS (SELECT 1 FROM site_pages p WHERE p.locale='ar' AND p.is_published=true AND ((p.slug='catalog' AND EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.content->'items')='array' THEN p.content->'items' ELSE '[]'::jsonb END) i WHERE i->>'previewAssetId'=a.id AND COALESCE(i->>'published','true')!='false' AND COALESCE(i->>'archived','false')!='true')) OR (p.slug='home' AND EXISTS (SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(p.content->'featuredSystemHtml')='object' THEN p.content->'featuredSystemHtml' ELSE '{}'::jsonb END) f WHERE f.value->>'assetId'=a.id AND (NOT (p.content ? 'featuredSystemSlugs') OR p.content->'featuredSystemSlugs' ? f.key))))) ORDER BY a.created_at DESC LIMIT 1`);
 const row=r.rows[0];if(!row)return false;
 try{const bytes=await render(row.html);if(!Buffer.isBuffer(bytes)||bytes.length<12||bytes.length>512*1024||bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)throw Error("Invalid JPEG");
 await db.query("UPDATE site_demo_assets SET thumbnail=$2,thumbnail_retry_at=NULL WHERE id=$1",[row.id,bytes]);}
 catch(e){await db.query("UPDATE site_demo_assets SET thumbnail_retry_at=now()+interval '5 minutes' WHERE id=$1",[row.id]);throw e;}
 return true;
}
export function startThumbnailWorker(db){
 const endpoint=process.env.DEMO_RENDERER_URL;
 if(!endpoint)return;
 let running=false;
 const tick=async()=>{if(running)return;running=true;try{await runThumbnailJob(db,async html=>{
  const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"text/html; charset=utf-8"},body:html,redirect:"error",signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error("Renderer HTTP "+r.status);
  const length=Number(r.headers.get("content-length"));if(!length||length>512*1024)throw Error("Renderer response too large");
  return Buffer.from(await r.arrayBuffer());
 });}catch(e){console.warn("Demo thumbnail generation failed:",e.message);}finally{running=false;}};
 const timer=setInterval(tick,5000);timer.unref();void tick();
}
