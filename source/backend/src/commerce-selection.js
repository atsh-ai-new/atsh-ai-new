import ids from './commerce-theme-ids.json' with {type:'json'};
export const COMMERCE_OFFER='commerce-engine';
const valid=new Set(ids);
export const validCommerceTheme=theme=>typeof theme==='string'&&valid.has(theme);
export function validateCommerceSelection(draft){
 if(draft.sectorSlug===COMMERCE_OFFER){
  if(draft.source!=='catalog'||draft.solutionType!=='store'||!validCommerceTheme(draft.commerceTheme)||!['rent','rent_monthly','copy','code'].includes(draft.ownershipMode))throw Error('Select a valid commerce design');
 }else if(draft.commerceTheme!==undefined)throw Error('Store design belongs to the commerce offer');
 return draft;
}
export function canProvisionCommerce(draft){
 return draft?.sectorSlug===COMMERCE_OFFER?draft.solutionType==='store'&&validCommerceTheme(draft.commerceTheme):draft?.solutionType==='store'&&!draft.commerceTheme;
}
