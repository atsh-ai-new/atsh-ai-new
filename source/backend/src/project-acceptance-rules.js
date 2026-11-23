// Commercial acceptance is independent of payment and delivery milestones.
export function canActivateProject({customerApprovedAt,adminApprovedAt,status}) {
 return Boolean(customerApprovedAt && adminApprovedAt) && !['archived','cancelled'].includes(status);
}
export function requestBucket(project) {
 return canActivateProject(project) ? 'projects' : 'requests';
}
export function acceptanceUpdate({actor,decision,previous}) {
 if(!['customer','admin'].includes(actor)) throw new Error('Invalid approval actor');
 if(!['approve','withdraw'].includes(decision)) throw new Error('Invalid approval decision');
 if(previous?.status==='archived') throw new Error('Archived projects cannot be approved');
 const field=actor==='customer'?'customerApprovedAt':'adminApprovedAt';
 return {[field]:decision==='approve'?new Date().toISOString():null};
}
