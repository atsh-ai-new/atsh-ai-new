import {validateCustomerSubmission} from './submission-contract.js';

/**
 * A submission response always refers to the project already linked to the
 * customer-owned draft, never a second project. Ownership is checked by SQL.
 */
export function submissionDecision(draftRow){
 if(!draftRow)return {kind:'missing'};
 if(draftRow.linked_journey_id)return {kind:'existing',projectId:draftRow.linked_journey_id};
 const check=validateCustomerSubmission(draftRow.draft);
 return check.ok?{kind:'create'}:{kind:'invalid',code:check.code};
}
