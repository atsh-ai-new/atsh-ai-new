import {createHash} from "node:crypto";

const idFor=html=>createHash("sha256").update(html,"utf8").digest("hex");
const record=x=>x&&typeof x==="object"&&!Array.isArray(x);
const validId=id=>typeof id==="string"&&/^[a-f0-9]{64}$/.test(id);
async function asset(db,html){
 const id=idFor(html);
 await db.query("INSERT INTO site_demo_assets(id,html,byte_size) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING",[id,html,Buffer.byteLength(html,"utf8")]);
 return id;
}
export async function extractDemoAssets(db,slug,content){
 if(!record(content))return content;
 if(slug==="home"&&record(content.featuredSystemHtml)){
  const files={};
  for(const [key,entry] of Object.entries(content.featuredSystemHtml)){
   if(!record(entry))continue;
   if(typeof entry.html==="string"&&entry.html.trim())files[key]={name:entry.name??"",assetId:await asset(db,entry.html),available:true};
   else if(validId(entry.assetId)){
    const result=await db.query("SELECT 1 FROM site_demo_assets WHERE id=$1",[entry.assetId]);
    if(!result.rowCount)throw Error("Unknown demo asset");
    files[key]={name:entry.name??"",assetId:entry.assetId,available:true};
   }
  }
  return {...content,featuredSystemHtml:files};
 }
 if(slug==="catalog"&&Array.isArray(content.items)){
  const items=[];
  for(const item of content.items){
   if(!record(item)){items.push(item);continue;}
   const {previewHtml,previewAssetId,hasPreviewHtml,...rest}=item;
   if(typeof previewHtml==="string"&&previewHtml.trim()){
    items.push({...rest,previewAssetId:await asset(db,previewHtml),hasPreviewHtml:true});
   }else if(previewHtml===undefined&&validId(previewAssetId)){
    const result=await db.query("SELECT 1 FROM site_demo_assets WHERE id=$1",[previewAssetId]);
    if(!result.rowCount)throw Error("Unknown demo asset");
    items.push({...rest,previewAssetId,hasPreviewHtml:true});
   }else items.push(rest);
  }
  return {...content,items};
 }
 return content;
}
export async function migrateDemoAssets(pool){
 const db=await pool.connect();
 try{
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(hashtext('site-demo-assets-migration-v1'))");
  for(const table of ["site_pages","site_page_drafts"]){
   const rows=await db.query("SELECT slug,locale,content FROM "+table+" WHERE slug IN ('home','catalog') FOR UPDATE");
   for(const row of rows.rows){
    const next=await extractDemoAssets(db,row.slug,row.content);
    if(JSON.stringify(next)!==JSON.stringify(row.content))
     await db.query("UPDATE "+table+" SET content=$1 WHERE slug=$2 AND locale=$3",[JSON.stringify(next),row.slug,row.locale]);
   }
  }
  await db.query("COMMIT");
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
export async function readDemoAsset(db,id){
 if(!validId(id))return null;
 const r=await db.query("SELECT html FROM site_demo_assets WHERE id=$1",[id]);
 return r.rows[0]?.html??null;
}
export async function expandDemoAssets(db,slug,content){
 if(!record(content))return content;
 if(slug==="home"&&record(content.featuredSystemHtml)){
  const files={};
  for(const [key,entry] of Object.entries(content.featuredSystemHtml)){
   if(!record(entry))continue;
   const html=typeof entry.html==="string"?entry.html:await readDemoAsset(db,entry.assetId);
   if(html)files[key]={name:entry.name??"",html};
  }
  return {...content,featuredSystemHtml:files};
 }
 if(slug==="catalog"&&Array.isArray(content.items)){
  return {...content,items:await Promise.all(content.items.map(async item=>{
   if(!record(item))return item;
   const {previewAssetId,hasPreviewHtml,...rest}=item;
   const html=typeof item.previewHtml==="string"?item.previewHtml:await readDemoAsset(db,previewAssetId);
   return html?{...rest,previewHtml:html}:rest;
  }))};
 }
 return content;
}
