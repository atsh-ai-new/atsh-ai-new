export function registerInternalChat(app,{pool,requireAdmin,route}){
 const principal=req=>req.admin.role==="owner"?"owner":"member:"+req.admin.userId;
 const prefix="/api/admin/internal-chat";
 app.get(prefix+"/members",requireAdmin,route(async(req,res)=>{
 const q=await pool.query("SELECT id,display_name FROM team_members WHERE is_active=true ORDER BY display_name");
 res.json({self:principal(req),members:[{principal:"owner",name:"الإدارة"},...q.rows.map(x=>({principal:"member:"+x.id,name:x.display_name}))].filter(x=>x.principal!==principal(req))});
 }));
 app.get(prefix,requireAdmin,route(async(req,res)=>{
 const q=await pool.query("SELECT c.*,m.last_read_id FROM internal_chat_conversations c JOIN internal_chat_members m ON m.conversation_id=c.id WHERE m.principal=$1 ORDER BY c.id DESC",[principal(req)]);res.json({conversations:q.rows});
 }));
 app.post(prefix,requireAdmin,route(async(req,res)=>{
 const {kind,title,members}=req.body||{};
 if(!["direct","group"].includes(kind)||!Array.isArray(members)||members.length<1||members.length>30||members.some(x=>typeof x!=="string")||typeof title!=="string"||title.length>120)return res.status(400).json({error:"Invalid conversation"});
 const self=principal(req),ids=[...new Set([self,...members])];
 if((kind==="direct"&&ids.length!==2)||(kind==="group"&&ids.length<3))return res.status(400).json({error:"Invalid membership"});
 const active=await pool.query("SELECT id FROM team_members WHERE is_active=true");
 const allowed=new Set(["owner",...active.rows.map(x=>"member:"+x.id)]);
 if(ids.some(x=>!allowed.has(x)))return res.status(400).json({error:"Invalid member"});
 const client=await pool.connect();
 try{await client.query("BEGIN");const q=await client.query("INSERT INTO internal_chat_conversations(kind,title,created_by) VALUES($1,$2,$3) RETURNING id",[kind,title,self]);const id=q.rows[0].id;await client.query("INSERT INTO internal_chat_members(conversation_id,principal) SELECT $1,unnest($2::text[])",[id,ids]);await client.query("COMMIT");res.status(201).json({id});}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
 }));
 const valid=id=>/^\d{1,18}$/.test(id);
 app.get(prefix+"/:id/messages",requireAdmin,route(async(req,res)=>{
 if(!valid(req.params.id))return res.sendStatus(400);
 const q=await pool.query("SELECT 1 FROM internal_chat_members WHERE conversation_id=$1 AND principal=$2",[req.params.id,principal(req)]);if(!q.rowCount)return res.sendStatus(404);
 const messages=await pool.query("SELECT id,sender,body,created_at FROM internal_chat_messages WHERE conversation_id=$1 ORDER BY id DESC LIMIT 200",[req.params.id]);res.set("Cache-Control","private, no-store").json({messages:messages.rows.reverse()});
 }));
 app.post(prefix+"/:id/messages",requireAdmin,route(async(req,res)=>{
 const body=req.body?.body;if(!valid(req.params.id)||typeof body!=="string"||!body.trim()||body.length>8000)return res.sendStatus(400);
 const q=await pool.query("INSERT INTO internal_chat_messages(conversation_id,sender,body) SELECT conversation_id,principal,$3 FROM internal_chat_members WHERE conversation_id=$1 AND principal=$2 RETURNING id,sender,body,created_at",[req.params.id,principal(req),body.trim()]);if(!q.rowCount)return res.sendStatus(404);res.status(201).json({message:q.rows[0]});
 }));
}
