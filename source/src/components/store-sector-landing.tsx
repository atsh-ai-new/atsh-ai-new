import Link from "next/link";
import {notFound} from "next/navigation";
import {absolute,localPath,type Locale} from "@/lib/seo";
import {storeSector,storeSectorSlugs} from "@/lib/store-sector-seo";

export function StoreSectorLinks({locale}:{locale:Locale}){
 return <section style={{maxWidth:1120,margin:"24px auto",padding:"0 18px"}}><h2>{locale==="ar"?"تصاميم المتاجر حسب النشاط":"Store designs by industry"}</h2><ul style={{display:"flex",flexWrap:"wrap",gap:20}}>{storeSectorSlugs.map(slug=><li key={slug}><Link href={localPath(locale,"/stores/sectors/"+slug)}>{storeSector(locale,slug)!.label}</Link></li>)}</ul></section>;
}
export default function StoreSectorLanding({locale,slug}:{locale:Locale;slug:string}){
 const sector=storeSector(locale,slug);
 if(!sector)notFound();
 const ar=locale==="ar", path=localPath(locale,"/stores/sectors/"+slug), library=localPath(locale,"/stores");
 const breadcrumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{name:"ATSH AI",item:absolute("/"+locale)},{name:ar?"تصاميم المتاجر":"Store designs",item:absolute(library)},{name:sector.label,item:absolute(path)}].map((x,i)=>({"@type":"ListItem",position:i+1,...x}))};
 return <main lang={locale} dir={ar?"rtl":"ltr"} style={{maxWidth:1100,margin:"auto",padding:"36px 18px 72px",minHeight:"70vh",color:"#203958"}}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs).replace(/</g,"\\u003c")}}/>
  <nav aria-label={ar?"مسار الصفحة":"Breadcrumb"}><Link href={library}>{ar?"تصاميم المتاجر":"Store designs"}</Link> / {sector.label}</nav>
  <h1>{sector.title}</h1><p>{sector.description}</p>
  <h2>{ar?"قبل ما تختار التصميم":"Before you choose a design"}</h2><p>{sector.guidance}</p>
  <h2>{ar?"جرّب التصميمات المتاحة":"Try the available designs"}</h2>
  <p>{ar?"المعاينات فيها منتجات وأسعار تجريبية للتوضيح فقط، مش عروض بيع.":"Previews show sample products and prices only. They are not live stores or sales offers."}</p>
  <ul style={{columns:2,lineHeight:2}}>{sector.designs.map(d=><li key={d.id}><Link href={localPath(locale,"/stores/"+d.id)}>{d.name.split(" · ")[0]}</Link></li>)}</ul>
  <Link className="button button-primary" href={localPath(locale,"/services/ecommerce")}>{ar?"تفاصيل خدمة إنشاء المتجر":"About our e-commerce development service"}</Link>
 </main>;
}
