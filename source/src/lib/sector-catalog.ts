export type SectorTemplate = {
  slug: string; name: string; category: string; icon: string; description: string;
  features: string[]; modules: string[]; sampleStats: { label: string; value: string }[];
  sampleRows: { name: string; detail: string; status: string }[];
  note: string;
};
export const sectorTemplates: SectorTemplate[] = [
  {slug:"eyadaty",name:"عيادتي",category:"الرعاية الصحية",icon:"🩺",description:"معاينة لإدارة عيادة، المواعيد، المرضى، الكشوفات والفواتير.",features:["ملفات المرضى","المواعيد","الروشتات","الفواتير"],modules:["لوحة القيادة","المرضى","المواعيد","الكشوفات","الروشتات","الفواتير"],sampleStats:[{label:"مرضى تجريبيون",value:"24"},{label:"مواعيد اليوم",value:"8"},{label:"فواتير تجريبية",value:"12"}],sampleRows:[{name:"موعد متابعة",detail:"10:00 ص",status:"مؤكد"},{name:"كشف جديد",detail:"11:30 ص",status:"انتظار"}],note:"بيانات محاكاة فقط، ولا تُستخدم لحفظ بيانات صحية حقيقية."},
  {slug:"avocato",name:"أفوكاتو",category:"المكاتب القانونية",icon:"⚖️",description:"معاينة لإدارة القضايا والموكلين والجلسات والأتعاب والفريق.",features:["القضايا","الجلسات","الموكلون","الأتعاب"],modules:["لوحة القيادة","القضايا","الموكلون","الجلسات","الأتعاب","المستندات"],sampleStats:[{label:"قضايا تجريبية",value:"19"},{label:"جلسات قادمة",value:"4"},{label:"موكلون",value:"13"}],sampleRows:[{name:"قضية تجارية",detail:"جلسة الأسبوع القادم",status:"مجدولة"},{name:"مراجعة مستندات",detail:"ملف عميل تجريبي",status:"قيد التنفيذ"}],note:"بيانات محاكاة فقط، وليست نظامًا قانونيًا إنتاجيًا."},
  {slug:"supermarket",name:"سوبر ماركت",category:"التجزئة",icon:"🛒",description:"معاينة لإدارة نقطة البيع والمخزون والموردين وتقارير المبيعات.",features:["كاشير POS","المخزون","المبيعات","الموردون"],modules:["لوحة القيادة","الكاشير","الأصناف","المبيعات","الموردون","التقارير"],sampleStats:[{label:"مبيعات تجريبية",value:"12,400 ج.م"},{label:"الأصناف",value:"86"},{label:"فواتير اليوم",value:"18"}],sampleRows:[{name:"فاتورة بيع",detail:"320 ج.م",status:"مكتملة"},{name:"تنبيه مخزون",detail:"صنف يحتاج توريدًا",status:"منخفض"}],note:"البيع والدفع والباركود بيانات تجريبية؛ لا يتم خصم مخزون إنتاجي."},
  {slug:"agzakhana",name:"أجزخانة",category:"الصيدليات",icon:"💊",description:"معاينة لكاشير الصيدلية والمخزون والأدوية والمشتريات والتقارير.",features:["كاشير POS","الأدوية","الصلاحية","المشتريات"],modules:["لوحة القيادة","الكاشير","الأدوية","المشتريات","المبيعات","التقارير"],sampleStats:[{label:"أصناف تجريبية",value:"64"},{label:"نواقص",value:"3"},{label:"فواتير اليوم",value:"11"}],sampleRows:[{name:"تنبيه صلاحية",detail:"دواء تجريبي",status:"مراجعة"},{name:"عملية بيع",detail:"180 ج.م",status:"مكتملة"}],note:"المعاينة محاكاة فقط؛ لا تُستخدم لإدارة أدوية أو صرف وصفات حقيقية."}
];
export function findSector(slug: string): SectorTemplate | undefined {
  return sectorTemplates.find((item)=>item.slug===slug);
}


/** Curated, source-controlled interactive demos. CMS entries may select one as
 * their preview engine; uploaded HTML runs only in an opaque sandbox. */
export const interactiveDemoPaths: Record<string,string> = {
  eyadaty:"/demos/eyadaty.html",
  agzakhana:"/demos/agzakhana.html",
  supermarket:"/demos/supermarket.html",
  avocato:"/demos/avocato.html"
};
export function interactiveDemoSlug(catalogSlug:string, configuredSlug?:string):string|undefined {
  const chosen=configuredSlug || catalogSlug;
  return Object.prototype.hasOwnProperty.call(interactiveDemoPaths,chosen)?chosen:undefined;
}

/** Uploaded demos run with an opaque origin. The policy is inserted before any
 * user script, without changing the uploaded document's html/head/body structure.
 * Allow HTTPS static assets (including CDN libraries) but never app cookies,
 * fetch/XHR, form submission, embedded pages, or same-origin privileges. */
export function isolatedDemoHtml(html:string):string {
 const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src \'unsafe-inline\' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com; img-src data: blob:; font-src https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com data:; media-src data: blob:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; frame-src \'none\'; object-src \'none\'">';
 // React Router's URL constructor cannot resolve relative paths against an opaque
 // origin or blob URL. Supply an inert base for resolution, not for network access.
 const routerCompat="<script>(()=>{const U=window.URL;window.URL=class extends U{constructor(input,base){if(base==='about:srcdoc'||base==='null'||(typeof base==='string'&&base.startsWith('blob:')))base='https://demo.invalid/';super(input,base)}}})();</script>";
 const injection=policy+demoStorageBootstrap+routerCompat;
 let documentHtml:string;
 if(/<head(?:\s[^>]*)?>/i.test(html))documentHtml=html.replace(/<head(?:\s[^>]*)?>/i,match=>match+injection);
 else if(/<html(?:\s[^>]*)?>/i.test(html))documentHtml=html.replace(/<html(?:\s[^>]*)?>/i,match=>match+"<head>"+injection+"</head>");
 else documentHtml="<!doctype html><html><head>"+injection+"</head><body>"+html.replace(/^\s*<!doctype[^>]*>/i,"")+"</body></html>";
 // Plain standalone demos do not need a Blob navigation. Avoid it on all browsers
 // (in particular mobile WebKit); retain it for demos using hash/history routing.
 if(!/HashRouter|createHashRouter|createHashHistory|hashchange|location\s*\.\s*hash|history\s*\.\s*(?:pushState|replaceState)/i.test(html))return documentHtml;
 // Bootstrap inside the already opaque sandbox. The Blob MUST be created by
 // this iframe, not the ATSH parent page; its origin is null, not the platform.
 // A blob URL permits hash-based history changes unlike about:srcdoc.
 const encoded=JSON.stringify(documentHtml).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
 return '<!doctype html><meta charset="utf-8"><script>location.replace(URL.createObjectURL(new Blob(['+encoded+'],{type:"text/html;charset=utf-8"})));</script>';
}
export const MAX_DEMO_HTML_BYTES=10*1024*1024;
export const MAX_DEMO_PAGE_BYTES=64*1024*1024;

/** In-memory storage for opaque sandbox documents; never accesses parent storage. */
export const demoStorageBootstrap="<script>(()=>{for(const name of ['localStorage','sessionStorage']){try{void window[name].length;continue}catch{}const data=new Map();const methods={getItem:k=>data.get(String(k))??null,setItem:(k,v)=>{data.set(String(k),String(v))},removeItem:k=>{data.delete(String(k))},clear:()=>data.clear(),key:i=>Array.from(data.keys())[i]??null};const storage=new Proxy(Object.create(null),{get:(_,k)=>k==='length'?data.size:Object.prototype.hasOwnProperty.call(methods,k)?methods[k]:data.get(k),set:(_,k,v)=>{data.set(String(k),String(v));return true},deleteProperty:(_,k)=>{data.delete(String(k));return true}});Object.defineProperty(window,name,{value:storage,configurable:true})}})();</script>";
export function withDemoStorage(html:string):string {
 const start=/^\s*<!doctype[^>]*>/i.exec(html);
 return start?html.slice(0,start[0].length)+demoStorageBootstrap+html.slice(start[0].length):demoStorageBootstrap+html;
}
