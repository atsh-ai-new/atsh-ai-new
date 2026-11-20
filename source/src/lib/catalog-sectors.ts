export type CatalogSector = {
  id: string;
  name: string;
  icon: string;
  description: string;
  sortOrder: number;
  isPublished: boolean;
  subcategories: CatalogSubcategory[];
};
export type CatalogSubcategory = {
  id: string;
  name: string;
  sortOrder: number;
  isPublished: boolean;
};
export type CatalogPlacement = {
  sectorId?: string;
  subcategoryId?: string;
  category?: string;
};
export const defaultCatalogSectors: CatalogSector[] = [
  {id:"health",name:"الصحة",icon:"🩺",description:"العيادات والصيدليات والخدمات الطبية.",sortOrder:10,isPublished:true,subcategories:[
    {id:"clinics",name:"العيادات والمراكز الطبية",sortOrder:10,isPublished:true},
    {id:"pharmacies",name:"الصيدليات",sortOrder:20,isPublished:true}
  ]},
  {id:"education",name:"التعليم",icon:"🎓",description:"المدارس والجامعات ومنصات التعلم.",sortOrder:20,isPublished:true,subcategories:[
    {id:"learning",name:"منصات التعليم",sortOrder:10,isPublished:true},
    {id:"schools",name:"المدارس والجامعات",sortOrder:20,isPublished:true}
  ]},
  {id:"professional",name:"الإداريات",icon:"🗂️",description:"الإدارة والمكاتب والخدمات المهنية.",sortOrder:30,isPublished:true,subcategories:[
    {id:"legal",name:"المحاماة والخدمات القانونية",sortOrder:10,isPublished:true},
    {id:"consulting",name:"المكاتب والاستشارات",sortOrder:20,isPublished:true},
    {id:"management",name:"الأنظمة الإدارية",sortOrder:30,isPublished:true}
  ]},
  {id:"business",name:"التجاري",icon:"🛒",description:"المتاجر والمخزون والمبيعات.",sortOrder:40,isPublished:true,subcategories:[
    {id:"retail",name:"التجزئة والمتاجر",sortOrder:10,isPublished:true},
    {id:"operations",name:"إدارة الأعمال",sortOrder:20,isPublished:true}
  ]}
];
export const defaultCatalogPlacements: Record<string,{sectorId:string;subcategoryId:string}> = {
  eyadaty:{sectorId:"health",subcategoryId:"clinics"},
  agzakhana:{sectorId:"health",subcategoryId:"pharmacies"},
  supermarket:{sectorId:"business",subcategoryId:"retail"},
  avocato:{sectorId:"professional",subcategoryId:"legal"}
};
export function validCatalogId(id:string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length<=80;
}
export function normalizeCatalogSectors(input: unknown): CatalogSector[] {
  if (!Array.isArray(input)) return defaultCatalogSectors.map(s=>({...s,subcategories:s.subcategories.map(c=>({...c}))}));
  const sectorIds=new Set<string>();
  const result:CatalogSector[]=[];
  for(const value of input){
    if(!value || typeof value!=="object")continue;
    const row=value as Record<string,unknown>;
    if(typeof row.id!=="string"||!validCatalogId(row.id)||sectorIds.has(row.id)||typeof row.name!=="string"||!row.name.trim())continue;
    sectorIds.add(row.id);
    const ids=new Set<string>();
    const subcategories:CatalogSubcategory[]=[];
    if(Array.isArray(row.subcategories)){
      for(const item of row.subcategories){
        if(!item||typeof item!=="object")continue;
        const sub=item as Record<string,unknown>;
        if(typeof sub.id!=="string"||!validCatalogId(sub.id)||ids.has(sub.id)||typeof sub.name!=="string"||!sub.name.trim())continue;
        ids.add(sub.id);
        subcategories.push({id:sub.id,name:sub.name,sortOrder:typeof sub.sortOrder==="number"&&Number.isFinite(sub.sortOrder)?sub.sortOrder:subcategories.length*10,isPublished:sub.isPublished!==false});
      }
    }
    result.push({id:row.id,name:row.name,icon:typeof row.icon==="string"?row.icon:"📁",description:typeof row.description==="string"?row.description:"",
      sortOrder:typeof row.sortOrder==="number"&&Number.isFinite(row.sortOrder)?row.sortOrder:result.length*10,isPublished:row.isPublished!==false,subcategories});
  }
  // Upgrade existing three-sector catalogs without dropping saved subcategories or placements.
  // Preserve any additional sectors created by an administrator.
  const legacyNames:Record<string,string>={health:"الصحة",professional:"الإداريات",business:"التجاري"};
  const orders:Record<string,number>={health:10,education:20,professional:30,business:40};
  for(const sector of result){
    if(legacyNames[sector.id] && (
      sector.name==="الصحة والرعاية الطبية" ||
      sector.name==="الخدمات المهنية" ||
      sector.name==="التجارة وإدارة الأعمال"
    ))sector.name=legacyNames[sector.id];
    if(sector.id in orders)sector.sortOrder=orders[sector.id];
  }
  for(const standard of defaultCatalogSectors){
    if(!result.some(s=>s.id===standard.id))result.push({...standard,subcategories:standard.subcategories.map(c=>({...c}))});
  }
  return result;
}
export function resolvePlacement(item:CatalogPlacement & {slug?:string},sectors:CatalogSector[]){
  let sector=sectors.find(s=>s.id===item.sectorId);
  let subcategory=sector?.subcategories.find(x=>x.id===item.subcategoryId);
  if(!sector && item.slug && defaultCatalogPlacements[item.slug]){
    const def=defaultCatalogPlacements[item.slug];
    sector=sectors.find(s=>s.id===def.sectorId);
    subcategory=sector?.subcategories.find(c=>c.id===def.subcategoryId);
  }
  if(!sector && item.category){
    sector=sectors.find(s=>s.name===item.category || s.subcategories.some(c=>c.name===item.category));
    subcategory=sector?.subcategories.find(c=>c.name===item.category);
  }
  return {sector,subcategory};
}
export function canRemoveSector(sectorId:string,items:CatalogPlacement[],sectors:CatalogSector[]):boolean{
  return !items.some(item=>resolvePlacement(item,sectors).sector?.id===sectorId);
}
export function canRemoveSubcategory(sectorId:string,subcategoryId:string,items:CatalogPlacement[],sectors:CatalogSector[]):boolean{
  return !items.some(item=>{const placement=resolvePlacement(item,sectors);return placement.sector?.id===sectorId&&placement.subcategory?.id===subcategoryId;});
}
