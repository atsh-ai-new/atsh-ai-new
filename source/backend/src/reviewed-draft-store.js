import {createHash, randomUUID} from 'node:crypto';
import {reviewAgentManifest} from './agent-manifest-gate.js';

// Stable digest binds the human approval to the exact generated file bytes.
export function canonicalManifest(manifest) {
  const result=reviewAgentManifest(manifest);
  if (!result.approved) throw Error('Manifest rejected by safety gate');
  const files=[...result.manifest.files].map(({path,content})=>({path,content})).sort((a,b)=>a.path.localeCompare(b.path,'en'));
  return {repo:result.manifest.repo,files};
}
export function digestManifest(manifest) {
  return createHash('sha256').update(JSON.stringify(canonicalManifest(manifest))).digest('hex');
}
export async function saveReviewDraft(pool,{jobId,manifest}) {
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(jobId||''))throw Error('Invalid job id');
  const normalized=canonicalManifest(manifest),digest=digestManifest(normalized),draftId=randomUUID();
  await pool.query('INSERT INTO reviewed_project_drafts (id,job_id,repo,manifest,digest,status) VALUES ($1,$2,$3,$4::jsonb,$5,$6)',[draftId,jobId,normalized.repo,JSON.stringify(normalized),digest,'awaiting_review']);
  return {draftId,digest};
}
export async function approveReviewDraft(pool,{jobId,draftId,digest,reviewerId}) {
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(jobId||'')||!/^[0-9a-f-]{36}$/.test(draftId||'')||!/^[a-f0-9]{64}$/.test(digest||'')||!reviewerId)throw Error('Invalid approval');
  const result=await pool.query(`UPDATE reviewed_project_drafts SET status='approved',approved_by=$4,approved_at=now()
    WHERE id=$1 AND job_id=$2 AND digest=$3 AND status='awaiting_review'
    RETURNING id,job_id,digest`,[draftId,jobId,digest,String(reviewerId)]);
  if(result.rowCount!==1)throw Error('Draft not found, already reviewed, or digest mismatch');
  return result.rows[0];
}
export async function loadApprovedReviewDraft(pool,{jobId,draftId,digest,approvedBy}) {
  const result=await pool.query(`SELECT job_id,repo,manifest,digest,approved_by,status FROM reviewed_project_drafts
    WHERE id=$1 AND job_id=$2 AND digest=$3 AND status='approved' AND approved_by=$4`,[draftId,jobId,digest,String(approvedBy)]);
  const row=result.rows[0];
  if(!row||digestManifest(row.manifest)!==digest)return null;
  return {repo:row.repo,manifest:row.manifest,digest:row.digest,approvedBy:row.approved_by,approved:true};
}
export async function claimApprovedReviewDraft(pool,{jobId,draftId,digest,approvedBy}) {
  const result=await pool.query(`UPDATE reviewed_project_drafts SET status='publishing',started_at=now()
    WHERE id=$1 AND job_id=$2 AND digest=$3 AND approved_by=$4 AND status='approved'
    RETURNING repo,manifest,digest,approved_by`,[draftId,jobId,digest,String(approvedBy)]);
  const row=result.rows[0];
  if(!row||digestManifest(row.manifest)!==digest)return null;
  return {repo:row.repo,manifest:row.manifest,digest:row.digest,approvedBy:row.approved_by,approved:true};
}
export async function recordReviewStage(pool,{draftId,status,detail={}}) {
  const allowed=new Set(['publishing','testing','tests_failed','preview_requested','failed','completed']);
  if(!allowed.has(status))throw Error('Invalid delivery stage');
  await pool.query(`UPDATE reviewed_project_drafts SET status=$2,updated_at=now(),last_detail=$3::jsonb WHERE id=$1`,[draftId,status,JSON.stringify(detail)]);
}
