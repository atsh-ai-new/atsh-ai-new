// Explicitly gated delivery pipeline. External services are injected so the state machine is testable.
// Persist the returned stage in the caller's database; never use this module as a job queue.
const idPattern=/^[a-zA-Z0-9_-]{1,100}$/;
export function validateDeliveryRequest(input){
 if(!input||typeof input!=="object"||!idPattern.test(input.jobId||""))throw Error("Invalid job id");
 if(!/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/.test(input.repo||""))throw Error("Invalid repository");
 if(typeof input.specification!=="string"||input.specification.length<20||input.specification.length>30000)throw Error("Invalid specification");
 return {jobId:input.jobId,repo:input.repo,specification:input.specification};
}
export async function generateForReview(request,{generate,saveDraft}){
 const data=validateDeliveryRequest(request);
 if(typeof generate!=="function"||typeof saveDraft!=="function")throw Error("Missing pipeline adapters");
 const manifest=await generate({repo:data.repo,specification:data.specification});
 if(manifest?.repo!==data.repo||!Array.isArray(manifest.files)||!manifest.files.length)throw Error("Agent returned invalid manifest");
 // saveDraft must persist immutable manifest + content digest before approval.
 const draft=await saveDraft({jobId:data.jobId,manifest});
 if(!draft?.draftId||!draft?.digest)throw Error("Draft persistence failed");
 return {jobId:data.jobId,status:"awaiting_review",draftId:draft.draftId,digest:draft.digest};
}
export async function deliverApprovedDraft({jobId,draftId,digest,approvedBy},{loadApprovedDraft,publish,runTests,deployPreview,recordStage}){
 if(!idPattern.test(jobId||"")||!idPattern.test(draftId||"")||!/^[a-f0-9]{64}$/.test(digest||"")||!approvedBy?.trim())throw Error("Invalid approval request");
 for(const fn of [loadApprovedDraft,publish,runTests,deployPreview,recordStage])if(typeof fn!=="function")throw Error("Missing delivery adapter");
 const draft=await loadApprovedDraft({jobId,draftId,digest,approvedBy});
 if(!draft||draft.approved!==true||draft.digest!==digest||draft.approvedBy!==approvedBy||draft.manifest?.repo!==draft.repo)throw Error("Approval mismatch");
 const stage=async(status,extra={})=>{await recordStage({jobId,status,...extra});};
 try{
  await stage("publishing");
  const published=await publish(draft.manifest,{approvedBy});
  if(!published?.completed)throw Error("Forgejo manifest publish incomplete");
  await stage("testing");
  const tests=await runTests({jobId,repo:draft.repo});
  if(!tests?.passed){await stage("tests_failed");return {jobId,status:"tests_failed"};}
  // A verified commit must come from the trusted Forgejo adapter, not the LLM response.
  if(!/^[a-f0-9]{40}$/.test(tests.commit||""))throw Error("Missing verified commit");
  await stage("preview_requested",{commit:tests.commit});
  await deployPreview({jobId,repo:draft.repo,commit:tests.commit});
  return {jobId,status:"preview_requested",commit:tests.commit};
 }catch(error){await stage("failed",{error:String(error.message).slice(0,200)});throw error;}
}
