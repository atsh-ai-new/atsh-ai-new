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
 * their preview engine; arbitrary HTML uploads are never executed in-site. */
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
