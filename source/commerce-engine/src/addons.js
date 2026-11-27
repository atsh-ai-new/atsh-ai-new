// No local prices. The only source of truth is the centrally managed catalog.
export const nativeCapabilities=new Set(['coupons_discounts','multi_branch']);
export const providerCapabilities=new Set(['payment_gateway','shipping_integration','workflow_automation','notifications','email_sms_integration','api_integration','ai_assistant','smart_bot','whatsapp_bot','campaign_tracking']);
export const included=new Set(['admin_dashboard','internal_search']);
export function addonView(snapshot,configured=[]){
 const active=new Set(snapshot.activeCodes);
 return snapshot.catalog.map(a=>({...a,status:included.has(a.code)?'included':!active.has(a.code)?'available':nativeCapabilities.has(a.code)?'enabled':providerCapabilities.has(a.code)&&configured.includes(a.code)?'configured':'implementation_required'}));
}
export async function snapshotFor(store,{base,secret,fetcher=fetch}={}){
 if(!store.project_id)return {catalog:[],activeCodes:[]};
 if(!base||!secret)throw Error('Central add-on bridge not configured');
 const url=new URL('/api/internal/commerce/projects/'+encodeURIComponent(store.project_id)+'/addons',base);
 const resp=await fetcher(url,{headers:{authorization:'Bearer '+secret},signal:AbortSignal.timeout(5000),redirect:'error'});
 if(!resp.ok)throw Error('Central add-on bridge unavailable');
 const data=await resp.json();
 if(data.projectId!==store.project_id||!Array.isArray(data.catalog)||!Array.isArray(data.activeCodes))throw Error('Invalid central add-on snapshot');
 return data;
}
export function enabled(snapshot,configured=[]){return addonView(snapshot,configured).filter(x=>['enabled','configured','included'].includes(x.status)).map(x=>x.code)}
