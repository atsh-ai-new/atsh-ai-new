// Pure recovery policy. A dispatched job must not be re-dispatched automatically:
// the remote executor may already be running it. Mark it failed for reconciliation.
export function recoveryDecision(job, nowMs=Date.now(), opts={}) {
 const dispatchMs=opts.dispatchMs??120000;
 const callbackMs=opts.callbackMs??3600000;
 const updated=Date.parse(job.updated_at);
 if (!Number.isFinite(updated) || nowMs-updated<0) return null;
 const age=nowMs-updated;
 if(job.status==='dispatching' && age>=dispatchMs)
  return Number(job.attempts)<5 ? 'queued' : 'failed';
 if(['dispatched','running'].includes(job.status) && age>=callbackMs) return 'failed';
 return null;
}
export function retryDelaySeconds(attempts){return Math.min(Math.max(1,attempts)**2*60,3600);}
