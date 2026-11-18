import type {CatalogSector} from "./catalog-sectors";
import type {SectorTemplate} from "./sector-catalog";
const sectors={
  "health": {
    "name": "Healthcare",
    "description": "Clinic, pharmacy and medical-service solutions."
  },
  "business": {
    "name": "Commerce & operations",
    "description": "Retail, inventory, and business management."
  },
  "professional": {
    "name": "Professional services",
    "description": "Legal and administrative business solutions."
  }
} as Record<string,{name:string;description:string}>;
const subcategories={
  "clinics": "Clinics & medical centers",
  "pharmacies": "Pharmacies",
  "retail": "Retail & stores",
  "operations": "Business operations",
  "legal": "Law firms",
  "consulting": "Consultancies"
} as Record<string,string>;
const templates={
  "eyadaty": {
    "name": "My Clinic",
    "category": "Healthcare",
    "description": "Interactive clinic management demo with appointments, patients, consultations and invoicing.",
    "features": [
      "Patient records",
      "Appointments",
      "Prescriptions",
      "Invoices"
    ]
  },
  "avocato": {
    "name": "Avocato",
    "category": "Legal services",
    "description": "Case management, client records, court sessions, fees and staff.",
    "features": [
      "Cases",
      "Hearings",
      "Clients",
      "Billing"
    ]
  },
  "supermarket": {
    "name": "Supermarket",
    "category": "Retail",
    "description": "Point-of-sale, inventory, suppliers and sales reporting.",
    "features": [
      "Point of sale",
      "Inventory",
      "Sales",
      "Suppliers"
    ]
  },
  "agzakhana": {
    "name": "Pharmacy",
    "category": "Pharmacies",
    "description": "Pharmacy point-of-sale, medicine inventory, expiry dates and purchasing.",
    "features": [
      "Point of sale",
      "Medicines",
      "Expiry alerts",
      "Purchasing"
    ]
  }
} as Record<string,{name:string;category:string;description:string;features:string[]}>;
export function englishSectorLabel(id:string,fallback:string){return sectors[id]?.name||fallback;}
export function englishSubcategoryLabel(id:string,fallback:string){return subcategories[id]||fallback;}
export function englishTemplateLabel(slug:string,fallback:string,kind:"name"|"category"|"description"="name"){return templates[slug]?.[kind]||fallback;}
export function englishTemplateFeatures(slug:string,features:string[]){return templates[slug]?.features||features;}
export function englishCatalogSectors(items:CatalogSector[]):CatalogSector[]{return items.map(s=>({...s,name:englishSectorLabel(s.id,s.name),description:sectors[s.id]?.description||s.description,subcategories:s.subcategories.map(c=>({...c,name:englishSubcategoryLabel(c.id,c.name)}))}));}
export function englishTemplate(item:SectorTemplate):SectorTemplate{return {...item,name:englishTemplateLabel(item.slug,item.name),category:englishTemplateLabel(item.slug,item.category,"category"),description:englishTemplateLabel(item.slug,item.description,"description"),features:englishTemplateFeatures(item.slug,item.features)};}
