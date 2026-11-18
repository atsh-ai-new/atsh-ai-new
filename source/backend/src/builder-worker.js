import pg from 'pg';
import {validateDispatchConfig,signedDispatch} from './builder-dispatch.js';
import {retryDelaySeconds} from './builder-recovery-rules.js';
// Run as a separate process with: node src/builder-worker.js. Only approved jobs are dispatched.
const {endpoint,secret}=validateDispatchConfig();
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
async function tick(){
 const client=await pool.connect();let job;
 try{
  await client.query('BEGIN');
  const result=await client.query("SELECT * FROM builder_execution_jobs WHERE status='queued' AND next_attempt_at<=now() AND attempts<5 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");
  if(!result.rowCount){await client.query('COMMIT');return;}
  job=result.rows[0];
  await client.query("UPDATE builder_execution_jobs SET status='dispatching',attempts=attempts+1,updated_at=now() WHERE id=$1",[job.id]);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 try{
  const {body,signature}=signedDispatch(job,secret);
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-atsh-signature':signature,'x-atsh-job-id':job.id},body,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Webhook HTTP ${response.status}`);
  await pool.query("UPDATE builder_execution_jobs SET status='dispatched',dispatched_at=now(),last_error=NULL,updated_at=now() WHERE id=$1",[job.id]);
 }catch(e){await pool.query("UPDATE builder_execution_jobs SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'queued' END,last_error=$2,next_attempt_at=now()+($3 * interval '1 second'),updated_at=now() WHERE id=$1",[job.id,String(e.message).slice(0,500),retryDelaySeconds(job.attempts)]);}
}
try{while(true){await tick();await new Promise(r=>setTimeout(r,3000));}}finally{await pool.end();}
