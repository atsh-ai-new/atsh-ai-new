// Deterministic, review-first project generation and safe visual-edit proposals.
// Never executes user text as commands or writes directly into a repository.
const sectors = Object.freeze({
  store:['storefront','catalog','checkout','seller-dashboard','admin-dashboard'],
  clinic:['appointments','patients','doctor-dashboard','admin-dashboard'],
  pharmacy:['inventory','pos','purchases','admin-dashboard'],
  supermarket:['inventory','pos','delivery','admin-dashboard'],
  legal:['cases','clients','documents','admin-dashboard'],
  construction:['portfolio','projects','contact','admin-dashboard'],
  roadside:['customer-app','driver-app','dispatch','admin-dashboard'],
  streaming:['catalog','player','subscriptions','cms','admin-dashboard'],
  custom:['landing','admin-dashboard']
});
const slugs = /^[a-z][a-z0-9-]{2,62}$/;
const allowedEdits = new Set(['set-text','set-color','set-spacing','toggle-section']);
export function buildProjectPlan(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid project');
  const {slug,sector,description,templateId=null}=input;
  if(typeof slug!=='string'||!slugs.test(slug))throw Error('Invalid project slug');
  if(!Object.hasOwn(sectors,sector))throw Error('Unsupported sector');
  if(typeof description!=='string'||description.trim().length<12||description.length>4000)throw Error('Invalid description');
  if(templateId!==null&&(typeof templateId!=='string'||templateId.length>120))throw Error('Invalid template');
  return {schemaVersion:1,slug,sector,description:description.trim(),templateId,modules:[...sectors[sector]],
    stages:['requirements-review','quotation-approval','repository-provisioning','implementation','automated-tests','staging-preview','customer-approval','deployment'],
    status:'awaiting-review',requiresHumanApproval:true,automatedExecution:false};
}
export function proposeVisualEdit(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid edit');
  const {projectSlug,page,elementId,operation,value}=input;
  if(typeof projectSlug!=='string'||!slugs.test(projectSlug))throw Error('Invalid project slug');
  if(typeof page!=='string'||!/^\/[a-zA-Z0-9/_-]{0,120}$/.test(page)||page.includes('..'))throw Error('Invalid page');
  if(typeof elementId!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(elementId))throw Error('Invalid element');
  if(!allowedEdits.has(operation))throw Error('Unsupported edit');
  if(typeof value!=='string'||value.length>1000)throw Error('Invalid value');
  if(operation==='set-color'&&!/^#[0-9a-fA-F]{6}$/.test(value))throw Error('Invalid color');
  if(operation==='set-spacing'&&!/^(0|[1-9][0-9]{0,2})px$/.test(value))throw Error('Invalid spacing');
  if(operation==='toggle-section'&&!['show','hide'].includes(value))throw Error('Invalid visibility');
  return {schemaVersion:1,projectSlug,page,elementId,operation,value,status:'proposed',requiresHumanApproval:true,applied:false};
}
