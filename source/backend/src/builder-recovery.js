import pg from 'pg';
import {recoveryDecision} from './builder-recovery-rules.js';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const intervalMs=Number(process.env.BUILDER_RECOVERY_INTERVAL_MS||60000);
if(!Number.isSafeInteger(intervalMs)||intervalMs<10000)throw Error('Invalid recovery interval');
async function scan(){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const result=await client.query("SELECT id,status,attempts,updated_at FROM builder_execution_jobs WHERE status IN ('dispatching','dispatched','running') AND updated_at<now()-interval '2 minutes' ORDER BY updated_at FOR UPDATE SKIP LOCKED LIMIT 100");
  for(const job of result.rows){
   const next=recoveryDecision(job);
   if(!next)continue;
   const message=next==='queued'?'Recovered abandoned dispatcher claim':'Timed out awaiting executor callback; reconcile remote execution before retry';
   await client.query('UPDATE builder_execution_jobs SET status=$2,last_error=$3,next_attempt_at=now(),updated_at=now() WHERE id=$1',[job.id,next,message]);
   await client.query('INSERT INTO builder_execution_events(job_id,old_status,new_status,message) VALUES($1,$2,$3,$4)',[job.id,job.status,next,message]);
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
try{while(true){try{await scan();}catch(e){console.error('Builder recovery:',e);}await new Promise(r=>setTimeout(r,intervalMs));}}finally{await pool.end();}
