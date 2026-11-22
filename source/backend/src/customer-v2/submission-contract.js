// Single contract for deciding whether a customer draft is ready for submission.
// This module is deliberately independent of Express and PostgreSQL.
export function validateCustomerSubmission(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return {ok:false,code:'PROJECT_REQUIREMENTS_INCOMPLETE'};
  const hasPackage = typeof draft.packageId === 'string' && draft.packageId.trim().length > 0;
  const hasSector = typeof draft.sectorSlug === 'string' && draft.sectorSlug.trim().length > 0;
  const hasCustomBrief = draft.projectMode === 'custom' && typeof draft.requirements === 'string' && draft.requirements.trim().length > 0;
  return hasPackage || hasSector || hasCustomBrief
    ? {ok:true}
    : {ok:false,code:'PROJECT_REQUIREMENTS_INCOMPLETE'};
}
