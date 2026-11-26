export const addonCategories = [
 {code:"foundation",name:"إضافات المواقع والتصميم الأساسية",en:"Website & design essentials",description:"أسّس حضورك الرقمي وحدد شكل موقعك ومحتواه.",descriptionEn:"Build your digital presence, design and content."},
 {code:"integrations",name:"البرمجة والأنظمة والتكاملات",en:"Development, systems & integrations",description:"اربط خدماتك وأتمت عملياتك ووسّع إمكانات مشروعك.",descriptionEn:"Connect services, automate operations and extend your project."},
 {code:"conversation",name:"المحادثات والذكاء الاصطناعي",en:"Messaging & artificial intelligence",description:"تواصل مع العملاء وفريقك بذكاء وسرعة.",descriptionEn:"Connect customers and your team with smarter tools."},
 {code:"creative",name:"التصميم الإعلاني وإنتاج المحتوى",en:"Advertising design & content production",description:"قدّم علامتك التجارية بمحتوى وإعلانات احترافية.",descriptionEn:"Present your brand with professional content and advertising."},
 {code:"hosting",name:"الاستضافة والحماية والدعم",en:"Hosting, security & support",description:"حافظ على استقرار مشروعك واستمرارية الخدمة.",descriptionEn:"Keep your project reliable, protected and available."},
 {code:"marketing",name:"التسويق الإلكتروني والإضافات الاجتماعية",en:"Digital marketing & social add-ons",description:"وسّع وصولك وقِس نتائج حملاتك.",descriptionEn:"Grow your reach and measure campaign results."}
] as const;
export type AddonCategoryCode=typeof addonCategories[number]["code"];
export type AddonCategoryOrder={code:AddonCategoryCode;sort_order:number};
export type CategorizedAddon={code:string;category_code?:string|null;sort_order?:number;category_sort_order?:number|null};
const legacyGroups:Record<AddonCategoryCode,string[]>={
 foundation:["language","extra_language","extra_page","logo","brand","writing","seo","booking","contact","analytics"],
 integrations:["payment_gateway","admin_dashboard","customer_portal","pwa","android_app","ios_app","api_integration","shipping_integration","notifications","workflow_automation","email_sms_integration","site_migration"],
 conversation:["smart_bot","ai_assistant","whatsapp_bot","live_chat_text","live_chat_attachments","internal_ai_assistant"],
 creative:["ad_banners","social_design","company_profile","promo_video","explainer_video"],
 hosting:["hosting","maintenance","business_email","advanced_backup","hosting_upgrade"],
 marketing:["seo_monthly","google_business_profile","ads_management","social_management","campaign_tracking","click_to_call","social_links"]
};
export function categoryFor(addon:CategorizedAddon):AddonCategoryCode {
 const explicit=addonCategories.find(c=>c.code===addon.category_code);
 return explicit?.code??addonCategories.find(c=>legacyGroups[c.code].includes(addon.code))?.code??"foundation";
}
export function groupAddons<T extends CategorizedAddon>(addons:T[],order?:AddonCategoryOrder[]){
 return addonCategories.map((category,i)=>{
  const items=addons.filter(a=>categoryFor(a)===category.code).sort((a,b)=>(a.sort_order??(legacyGroups[category.code].indexOf(a.code)+1)*10)-(b.sort_order??(legacyGroups[category.code].indexOf(b.code)+1)*10)||a.code.localeCompare(b.code));
  return {...category,items,sortOrder:order?.find(c=>c.code===category.code)?.sort_order??items.find(a=>a.category_sort_order!=null)?.category_sort_order??(i+1)*10};
 }).sort((a,b)=>a.sortOrder-b.sortOrder||a.code.localeCompare(b.code));
}
