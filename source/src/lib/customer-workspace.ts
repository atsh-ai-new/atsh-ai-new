// Browser-only guest preference handoff. Never store passwords, access codes or payment data here.
export type AssistantMessage = {who:"assistant"|"customer";text:string};
export type CustomerWorkspace = {
  assistantMessages?:AssistantMessage[];
  sectorSlug?:string; sectorName?:string; packageId?:string; businessName?:string;
  projectMode?:"ready"|"custom"; solutionType?:"website"|"store"|"mobile"|"management"|"ai"|"other"; requirements?:string;
  businessDescription?:string; brandColor?:string; options?:string[]; sectorAddonCodes?:string[];
  deliveryMethod?:"managed"|"source-code"|"undecided"; domainName?:string;
  source?:"catalog"|"configurator"|"concierge"|"preview"|"account";
};
export const WORKSPACE_KEY="atsh_customer_workspace_v1";
// Guest selections survive same-tab page navigation (e.g. to registration), not a reload.
// The customer account workspace is saved separately on the server after authentication.
let guestStorageInitialized=false;
function guestStorage():Storage|null{
  if(typeof window==="undefined")return null;
  try{
    if(!guestStorageInitialized){
      guestStorageInitialized=true;
      window.localStorage.removeItem(WORKSPACE_KEY); // Purge persistent guest data from older releases.
      // Keep in-progress selections through reloads and same-tab navigation.
      // Session storage is cleared when the browser tab session ends.
    }
    return window.sessionStorage;
  }catch{return null;}
}
const allowed=new Set(["sectorSlug","sectorName","packageId","businessName","businessDescription","brandColor","options","sectorAddonCodes","projectMode","solutionType","requirements","deliveryMethod","domainName","source","assistantMessages"]);
export function loadGuestWorkspace():CustomerWorkspace {
  if(typeof window==="undefined")return {};
  try{
    const raw=guestStorage()?.getItem(WORKSPACE_KEY);
    if(!raw)return {};
    const obj=JSON.parse(raw) as Record<string,unknown>;
    return Object.fromEntries(Object.entries(obj).filter(([key])=>allowed.has(key))) as CustomerWorkspace;
  }catch{return {};}
}
export function saveGuestWorkspace(patch:CustomerWorkspace):CustomerWorkspace {
  const next={...loadGuestWorkspace(),...patch};
  if(typeof window!=="undefined"){
    try{guestStorage()?.setItem(WORKSPACE_KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent("atsh-workspace-updated",{detail:next}));}catch{/* restricted storage */ }
  }
  return next;
}
export async function syncCustomerWorkspace():Promise<CustomerWorkspace|null> {
  const guest=loadGuestWorkspace();
  const session=await fetch("/api/customer/auth/me",{credentials:"include",cache:"no-store"});
  if(!session.ok)return null;
  const current=await fetch("/api/customer/auth/workspace",{credentials:"include",cache:"no-store"});
  if(!current.ok)throw Error("Unable to fetch account workspace");
  const server=await current.json();
  const existing=(server.workspace?.draft??{}) as CustomerWorkspace;
  const patch=Object.fromEntries(Object.entries(guest).filter(([key,value])=>allowed.has(key)&&value!==undefined)) as CustomerWorkspace;
  if(!Object.keys(patch).length)return existing;
  const merged=await fetch("/api/customer/auth/workspace",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
  if(!merged.ok)throw Error("Unable to save account workspace");
  const data=await merged.json();
  const result=data.workspace?.draft as CustomerWorkspace;
  // Remove local guest copy after server confirms the merge; avoid cross-account leakage on shared devices.
  try{guestStorage()?.removeItem(WORKSPACE_KEY);}catch{}
  return result;
}

export async function loadAccountWorkspace():Promise<CustomerWorkspace|null>{
  const response=await fetch("/api/customer/auth/workspace",{credentials:"include",cache:"no-store"});
  if(response.status===401)return null;
  if(!response.ok)throw Error("Unable to load account workspace");
  const result=await response.json();
  return (result?.workspace?.draft??{}) as CustomerWorkspace;
}

/** Start a new project from a clean preference snapshot so a previous
 * sector, package or addon cannot leak into a different customer's draft. */
export function replaceGuestWorkspace(value:CustomerWorkspace):CustomerWorkspace {
 const next=Object.fromEntries(Object.entries(value).filter(([key])=>allowed.has(key))) as CustomerWorkspace;
 if(typeof window!=="undefined"){
  try{guestStorage()?.setItem(WORKSPACE_KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent("atsh-workspace-updated",{detail:next}));}catch{/* restricted storage */}
 }
 return next;
}
