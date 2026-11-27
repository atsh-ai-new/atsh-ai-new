import {canProvisionCommerce,validCommerceTheme} from './commerce-selection.js';
import {eligibleProjectStatuses} from './project-addon-requests.js';
export function commerceConfig(env=process.env){
 const secret=env.COMMERCE_PROVISION_SECRET;
 try{
  const origin=new URL(env.COMMERCE_RUNTIME_INTERNAL_URL);
  if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.search||origin.hash||!secret||secret.length<32)return null;
  let publicOrigin=null;try{const u=new URL(env.COMMERCE_RUNTIME_PUBLIC_URL);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash)publicOrigin=u.origin}catch{}
  return {origin:origin.origin,secret,publicOrigin};
 }catch{return null}
}
export async function runtimeRequest(config,path,method='GET',payload,fetcher=fetch){
 if(!config)throw Object.assign(Error('Commerce runtime is not configured'),{status:503});
 let response;try{response=await fetcher(new URL(path,config.origin),{method,headers:{authorization:'Bearer '+config.secret,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)})}catch{throw Object.assign(Error('Commerce runtime unavailable'),{status:503})}
 if(!response.ok)throw Object.assign(Error(response.status===409?'Store already exists or conflicts with an existing project':'Commerce runtime rejected the operation'),{status:response.status===409?409:502});
 return response.json();
}
export async function commerceProjects(pool){
 const q=await pool.query(`SELECT d.id,d.title,d.draft->>'ownershipMode' AS mode,p.status,a.name AS customer_name,d.draft->>'commerceTheme' AS commerce_theme
 FROM customer_project_drafts d JOIN customer_journey_projects p ON p.id=d.linked_journey_id AND p.customer_account_id=d.customer_id JOIN customer_accounts a ON a.id=d.customer_id
 WHERE d.deleted_at IS NULL AND p.status=ANY($1::text[]) AND d.draft->>'solutionType'='store' AND d.draft->>'ownershipMode' IN ('rent','rent_monthly','copy','code')
 ORDER BY d.updated_at DESC LIMIT 250`,[eligibleProjectStatuses]);
 return q.rows;
}
export async function provisionCommerce(pool,config,input,fetcher=fetch){
 const q=await pool.query(`SELECT d.id,d.draft->>'ownershipMode' AS mode,p.status,d.draft FROM customer_project_drafts d JOIN customer_journey_projects p ON p.id=d.linked_journey_id AND p.customer_account_id=d.customer_id WHERE d.id=$1 AND d.deleted_at IS NULL`,[input.projectId]);
 const p=q.rows[0];if(!p||!eligibleProjectStatuses.includes(p.status)||!['rent','rent_monthly','copy','code'].includes(p.mode))throw Object.assign(Error('Approved, paid project and ownership mode required'),{status:409});
 if(!canProvisionCommerce(p.draft)||!validCommerceTheme(input.theme)||p.draft.commerceTheme&&p.draft.commerceTheme!==input.theme)throw Object.assign(Error('Select the approved store design for this project'),{status:409});
 return runtimeRequest(config,'/api/stores','POST',{name:input.name,slug:input.slug,theme:input.theme,projectId:p.id,mode:p.mode,shipping:input.shipping},fetcher);
}
