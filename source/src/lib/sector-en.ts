import type {CatalogSector} from "./catalog-sectors";
import type {SectorTemplate} from "./sector-catalog";
const sectors={
  "media-entertainment": {name:"Media & entertainment",description:"Media, entertainment and publishing platforms."},
  "social": {name:"Social platforms",description:"Discovery, matching and moderated communication platforms."},
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
  "music-audio": "Music & audio",
  "matching": "Dating & matching",
  "clinics": "Clinics & medical centers",
  "pharmacies": "Pharmacies",
  "retail": "Retail & stores",
  "operations": "Business operations",
  "legal": "Law firms",
  "consulting": "Consultancies"
} as Record<string,string>;
const templates={
  "naghma": {
    name:"Naghma",category:"Music & audio",
    description:"Web platform for music and podcasts, with a listener library and player, artist uploads, and publishing moderation. Demo only; the scoped price is for implementation and excludes hosting, streaming charges and content rights.",
    features:["Search and discover tracks, albums, artists and podcasts","Audio player, playback queue and listening history","Personal library, favorites and playlists","Artist uploads and track metadata","Moderation and publishing dashboard"]
  },
  "liqaa": {
    name:"Liqaa",category:"Dating & matching",
    description:"Adult dating and matching web platform with discovery preferences, mutual matches, and messaging after a match. Includes reporting, blocking and a moderation dashboard. Demo only; the scoped price excludes hosting, paid memberships and external verification services.",
    features:["Profiles and preference-based discovery","Likes and mutual matching","Matched-member messaging and in-app notifications","Privacy controls, reporting and blocking","Account moderation and report review"]
  },
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
const offerFeatures:Record<string,string[]>={"eyadaty":["Patient records and visits","Internal scheduling","Consultations and printable prescriptions","Billing and cash collection","Patient-data access controls"],"agzakhana":["Pharmacy POS and barcode items","Batch and expiry tracking","Purchasing and supplier returns","Cashier shifts and operating reports"],"supermarket":["POS with linked sales and returns","Barcoded items","Stock movements and stock counts","Suppliers and purchase invoices","Cashier shifts and reports"],"avocato":["Client and case files","Hearings and tasks","Private case documents","Fees, payments and receipts"],"sofra":["Digital menu","Restaurant POS","Table layout","Kitchen display","Shift and sales reports"],"academia":["Course catalog","Student enrollment","Instructor workspace","Lessons and progress","Quizzes"],"center":["Students, classes and rooms","Enrollment and timetables","Attendance and grades","Fees and receipts"],"accounting":["Client engagements","Chart of accounts and balanced entries","Trial balance and financial statements","Attachments and period review"],"cinema":["Video-on-demand catalog","Viewer accounts and watch history","Playback via one video source","Publishing and series management"],"news":["Public news site","Editorial approval and scheduling","News categories and archive"],"market":["Multi-vendor product catalog","Shopping and orders","Seller workspace","Order split and commission records","Marketplace administration"],"taalm":["Course catalog","Learner accounts","Lessons and progress","Quizzes and completion certificates"],"gzaar":["Single-store ordering","Weights and preparation options","Batch stock and expiry tracking","Orders and suppliers"],"khodra":["Single-store ordering","Weight or package pricing","Batch stock and freshness alerts","Orders and suppliers"],"wnsh":["Roadside service requests","Provider workspace","Fleet dispatch","Service pricing and settlement","Web maps"],"mosla":["Web rider and driver workspaces","Dispatch and trip status","Cash fares and trip history","Web maps and location updates"],"toktok":["Local tuk-tuk bookings","Rider and driver views","Manual district dispatch","Cash fares and web maps"],"torsekl":["Cargo bookings","Driver pickup and delivery","Manual dispatch","Cash rates and web maps"],"mkawel":["Projects and milestones","Progress certificates and payments","Private project files","Client portal"],"mosek":["Private contract archive","Contract templates","Internal approval workflow","Private viewing and consent"],"emtsal":["Policy library","Risk register and scoring","Audit and corrective actions","Access and change history","Executive reports"],"ebtsama":["Patients and appointments","Dental charts and treatment plans","Procedures, prescriptions and fees","Patient-data access controls"],"hehaa":["Patients and visits","Pregnancy and examination follow-up","Prescriptions and billing","Patient-data access controls"],"nabd":["Patients and visits","Cardiac measurements and trend views","Prescriptions and billing","Patient-data access controls"],"otstodyo":["Production stages and tasks","Review and delivery links","Budgets and expenses","Client portal"],"bas":["Channel schedules","Broadcast control workspace","Web playback via one external provider","Operational log and roles"],"hadnty":["Children and groups","Attendance and activity records","Fees and receipts","Parent portal"],"madrsty":["Admissions","Students, teachers and timetables","Attendance, grades and reports","Family portal and student access","Fees and receipts"]};
// English labels for currently published systems and their existing approved feature translations.
// Arabic-only future listings remain outside English indexing until translated.
const publishedSystemLabels:Record<string,{name:string;category:string}>={
  "sofra":{"name":"Sofra Restaurant POS","category":"Restaurant and café"},
  "academia":{"name":"Academia Course Management","category":"Education"},
  "center":{"name":"Center Tutoring Operations","category":"Tutoring center"},
  "accounting":{"name":"Accounting Office Management","category":"Accounting practice"},
  "cinema":{"name":"Cinema Video Platform","category":"Video streaming"},
  "news":{"name":"Khabar Newsroom","category":"News publishing"},
  "market":{"name":"Market Multi-Vendor Store","category":"Marketplace"},
  "taalm":{"name":"Taalm Online Learning","category":"Learning management"},
  "gzaar":{"name":"Gzaar Butcher Shop","category":"Butcher shop"},
  "khodra":{"name":"Khodra Produce Store","category":"Fresh produce retail"},
  "wnsh":{"name":"Wnsh Roadside Assistance","category":"Roadside assistance"},
  "mosla":{"name":"Waselni Ride Dispatch","category":"Ride dispatch"},
  "toktok":{"name":"TokTok Local Rides","category":"Local transport"},
  "torsekl":{"name":"Torsekl Cargo Dispatch","category":"Cargo dispatch"},
  "mkawel":{"name":"Mokawel Contractor Portal","category":"Construction management"},
  "mosek":{"name":"Mowathaq Contract Archive","category":"Document management"},
  "emtsal":{"name":"Emtsal Compliance Management","category":"Compliance management"},
  "ebtsama":{"name":"Ebtsama Dental Clinic","category":"Dental practice"},
  "hehaa":{"name":"Hayah Women's Clinic","category":"Women's clinic"},
  "nabd":{"name":"Nabd Cardiology Clinic","category":"Cardiology practice"},
  "otstodyo":{"name":"Studio Production Workspace","category":"Studio production"},
  "bas":{"name":"Bath Broadcast Control","category":"Broadcast operations"},
  "hadnty":{"name":"Hadanty Nursery Management","category":"Nursery management"},
  "madrsty":{"name":"Madrasty School Management","category":"School management"},
};
export function englishSectorLabel(id:string,fallback:string){return sectors[id]?.name||fallback;}
export function englishSubcategoryLabel(id:string,fallback:string){return subcategories[id]||fallback;}
export function englishTemplateLabel(slug:string,fallback:string,kind:"name"|"category"|"description"="name"){return (kind==="description"&&offerFeatures[slug] ? offerFeatures[slug].join(" · ")+". Demo shown; delivery follows implementation and testing." : (kind==="description"?undefined:publishedSystemLabels[slug]?.[kind])||templates[slug]?.[kind])||fallback;}
export function englishTemplateFeatures(slug:string,features:string[]){return offerFeatures[slug]||templates[slug]?.features||features;}
export function englishCatalogSectors(items:CatalogSector[]):CatalogSector[]{return items.map(s=>({...s,name:englishSectorLabel(s.id,s.name),description:sectors[s.id]?.description||s.description,subcategories:s.subcategories.map(c=>({...c,name:englishSubcategoryLabel(c.id,c.name)}))}));}
export function englishTemplate(item:SectorTemplate):SectorTemplate{return {...item,name:englishTemplateLabel(item.slug,item.name),category:englishTemplateLabel(item.slug,item.category,"category"),description:englishTemplateLabel(item.slug,item.description,"description"),features:englishTemplateFeatures(item.slug,item.features)};}

const demoLabels:Record<string,string>={
"لوحة القيادة":"Dashboard","المرضى":"Patients","المواعيد":"Appointments","الكشوفات":"Consultations","الروشتات":"Prescriptions","الفواتير":"Invoices","الكاشير":"Point of sale","الأصناف":"Products","المبيعات":"Sales","الموردون":"Suppliers","التقارير":"Reports","الأدوية":"Medicines","المشتريات":"Purchases","القضايا":"Cases","الموكلون":"Clients","الجلسات":"Hearings","الأتعاب":"Fees","المستندات":"Documents","نموذج جديد":"New demo","جديد":"New","مؤكد":"Confirmed","انتظار":"Pending","مكتملة":"Completed","قيد التنفيذ":"In progress","منخفض":"Low stock","مراجعة":"Needs review"
};
export function englishDemoLabel(text:string):string{return demoLabels[text]||text;}
