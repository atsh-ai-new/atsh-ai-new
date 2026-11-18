// Starter examples ONLY, not actual deliverable sector systems.
// Bootstrapped only if the catalog CMS page has never existed; NEVER overwrite an existing page.
const emptyPreview=(name,description,features,modules)=>({
  name,description,features,modules,sampleStats:[],sampleRows:[],
  note:"معاينة توضيحية لواجهة النظام؛ ليست تطبيقًا جاهزًا للإنتاج."
});
export const starterCatalog={
 title:"معرض الأنظمة",
 description:"نماذج أولية قابلة للتخصيص؛ لا تمثل مشروعات تجارية مكتملة.",
 sectors:[
  {id:"health",name:"الصحة والرعاية الطبية",icon:"🩺",description:"العيادات والصيدليات",sortOrder:10,isPublished:true,subcategories:[
   {id:"clinics",name:"العيادات والمراكز الطبية",sortOrder:10,isPublished:true},
   {id:"pharmacies",name:"الصيدليات",sortOrder:20,isPublished:true}]},
  {id:"business",name:"التجارة وإدارة الأعمال",icon:"🛒",description:"أنظمة البيع والمخزون",sortOrder:20,isPublished:true,subcategories:[
   {id:"retail",name:"التجزئة والمتاجر",sortOrder:10,isPublished:true},
   {id:"operations",name:"إدارة الأعمال",sortOrder:20,isPublished:true}]},
  {id:"professional",name:"الخدمات المهنية",icon:"⚖️",description:"إدارة المكاتب المهنية",sortOrder:30,isPublished:true,subcategories:[
   {id:"legal",name:"المحاماة والخدمات القانونية",sortOrder:10,isPublished:true},
   {id:"consulting",name:"الاستشارات",sortOrder:20,isPublished:true}]}
 ],
 items:[
  {slug:"eyadaty",category:"العيادات والمراكز الطبية",icon:"🩺",sectorId:"health",subcategoryId:"clinics",sortOrder:10,
   ...emptyPreview("عيادتي","نموذج توضيحي لإدارة العيادة والمواعيد والمرضى والفواتير.",["المواعيد","ملفات المرضى","الفواتير"],["لوحة القيادة","المواعيد","المرضى","الفواتير"])},
  {slug:"agzakhana",category:"الصيدليات",icon:"💊",sectorId:"health",subcategoryId:"pharmacies",sortOrder:20,
   ...emptyPreview("أجزخانة","نموذج توضيحي لإدارة الصيدلية والكاشير والمخزون.",["الكاشير","الأدوية","المشتريات"],["لوحة القيادة","الكاشير","الأدوية","المشتريات"])},
  {slug:"supermarket",category:"التجزئة والمتاجر",icon:"🛒",sectorId:"business",subcategoryId:"retail",sortOrder:30,
   ...emptyPreview("سوبر ماركت","نموذج توضيحي لنقاط البيع والمخزون والموردين.",["POS","الأصناف","تقارير المبيعات"],["لوحة القيادة","الكاشير","المخزون","التقارير"])},
  {slug:"avocato",category:"المحاماة والخدمات القانونية",icon:"⚖️",sectorId:"professional",subcategoryId:"legal",sortOrder:40,
   ...emptyPreview("أفوكاتو","نموذج توضيحي لإدارة قضايا المكتب والجلسات والملفات.",["القضايا","الموكلون","المواعيد"],["لوحة القيادة","القضايا","الموكلون","الجلسات"])}
 ].map(item=>({...item,published:true,archived:false,imageUrl:"",previewUrl:"",basePrice:null,addons:[],pricedAddons:[]}))
};
export async function seedCatalogIfAbsent(pool){
 const result=await pool.query(
  `INSERT INTO site_pages(slug,locale,content,is_published,updated_by)
   VALUES('catalog','ar',$1::jsonb,true,'system:starter-catalog')
   ON CONFLICT(slug,locale) DO NOTHING RETURNING id`,[JSON.stringify(starterCatalog)]);
 return result.rowCount===1;
}
