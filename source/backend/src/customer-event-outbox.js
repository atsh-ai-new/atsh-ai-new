// Transactional at-least-once outbox for approved customer journey events.
// Integrators MUST deduplicate by event.id/idempotency_key. Never put secrets in payload.
export async function queueJourneyEvent(client,eventType,key,payload){
 if(!/^[a-z]+(?:[._][a-z]+)+$/.test(eventType)||!key||key.length>180)throw Error("Invalid journey event");
 return client.query(`INSERT INTO customer_event_outbox(event_type,idempotency_key,payload)
  VALUES($1,$2,$3::jsonb) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,
  [eventType,key,JSON.stringify(payload)]);
}
export function eventDestination(env=process.env){
 const address=env.ATSH_N8N_EVENT_URL,token=env.ATSH_N8N_EVENT_TOKEN;
 if(!address||!token||token.length<20)return null;
 try{
  const url=new URL(address);
  if(url.username||url.password||url.hash||url.search||!["http:","https:"].includes(url.protocol))return null;
  if(url.protocol!=="https:"&&!(env.ATSH_N8N_ALLOW_INTERNAL_HTTP==="true"&&["n8n","localhost","127.0.0.1"].includes(url.hostname)))return null;
  return {url:url.toString(),token};
 }catch{return null;}
}
export async function deliverJourneyEvents(pool,{fetchFn=fetch,env=process.env,limit=5}={}){
 const config=eventDestination(env);
 if(!config)return {configured:false,delivered:0,failed:0};
 const claimed=await pool.query(`UPDATE customer_event_outbox SET status='processing',locked_at=now(),attempts=attempts+1
   WHERE id IN(
    SELECT id FROM customer_event_outbox
    WHERE (status='pending' AND next_attempt_at<=now())
       OR (status='processing' AND locked_at<now()-interval '3 minutes')
    ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1
   ) RETURNING id,event_type,idempotency_key,payload,attempts`,[Math.min(20,Math.max(1,limit))]);
 let delivered=0,failed=0;
 for(const event of claimed.rows){
  let error=null;
  try{
   const response=await fetchFn(config.url,{method:"POST",headers:{
    "Authorization":`Bearer ${config.token}`,"Content-Type":"application/json","X-ATSH-Event-ID":String(event.id),
    "X-ATSH-Idempotency-Key":event.idempotency_key
   },body:JSON.stringify({id:event.id,type:event.event_type,key:event.idempotency_key,payload:event.payload}),redirect:"manual",signal:AbortSignal.timeout(10000)});
   if(!response.ok||response.status>=300)throw Error("n8n rejected event: "+response.status);
   await pool.query("UPDATE customer_event_outbox SET status='delivered',delivered_at=now(),locked_at=NULL,last_error=NULL WHERE id=$1",[event.id]);
   delivered++;
  }catch(e){error=e instanceof Error?e.message:String(e);}
  if(error){
   failed++;
   const retrySeconds=Math.min(3600,Math.max(30,2**Math.min(event.attempts,11)*15));
   await pool.query("UPDATE customer_event_outbox SET status='pending',locked_at=NULL,last_error=$2,next_attempt_at=now()+($3::integer*interval '1 second') WHERE id=$1",[event.id,error.slice(0,500),retrySeconds]);
  }
 }
 return {configured:true,delivered,failed};
}
