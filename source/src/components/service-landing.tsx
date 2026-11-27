import Link from "next/link";
import {absolute,localPath, type Locale} from "@/lib/seo";
import {serviceCopy,serviceIndex,serviceSlugs} from "@/lib/seo-services";
import {notFound} from "next/navigation";
export default function ServiceLanding({locale,slug}:{locale:Locale;slug?:string}){
 const ar=locale==="ar",copy=slug?serviceCopy(locale,slug):serviceIndex(locale);
 if(!copy)notFound();
 const item=slug?serviceCopy(locale,slug):undefined;
 const url=absolute(localPath(locale,"/services"+(slug?"/"+slug:"")));
 const crumbs=[{name:"ATSH AI",item:absolute("/"+locale)},{name:ar?"خدماتنا":"Services",item:absolute(localPath(locale,"/services"))},...(item?[{name:item.title,item:url}]:[])];
 const graph={"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList",itemListElement:crumbs.map((c,i)=>({"@type":"ListItem",position:i+1,...c}))},...(item?[{"@type":"Service",name:item.title,description:item.description,url,provider:{"@type":"Organization",name:"ATSH AI",url:absolute("/")},areaServed:{"@type":"Country",name:"Egypt"}}]:[])]};
 return <main lang={locale} dir={ar?"rtl":"ltr"} style={{maxWidth:1100,margin:"auto",padding:"36px 18px 72px",minHeight:"75vh",color:"#203958"}}>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(graph).replace(/</g,"\\u003c")}}/>
 <nav aria-label={ar?"مسار الصفحة":"Breadcrumb"} style={{display:"flex",gap:12,flexWrap:"wrap"}}><Link href={"/"+locale}>ATSH AI</Link><span>/</span><Link href={localPath(locale,"/services")}>{ar?"خدماتنا":"Services"}</Link>{slug&&<><span>/</span><span>{copy.title}</span></>}</nav>
 <section style={{padding:"34px 0",maxWidth:820}}><h1 style={{fontSize:"clamp(28px,4vw,44px)",lineHeight:1.4}}>{copy.title}</h1><p style={{fontSize:18,lineHeight:1.9}}>{copy.description}</p>{item&&<><h2>{ar?"ما الذي يمكن تخصيصه؟":"What can be configured?"}</h2><ul style={{lineHeight:2}}>{item.points.map(point=><li key={point}>{point}</li>)}</ul><Link className="button button-primary" href={item.target}>{item.cta}</Link></>}</section>
 <h2>{slug?(ar?"خدمات أخرى":"Related services"):(ar?"اختر الخدمة المناسبة لنشاطك":"Choose the service for your business")}</h2>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:16}}>{serviceSlugs.filter(s=>s!==slug).map(s=>{const service=serviceCopy(locale,s)!;return <article key={s} style={{border:"1px solid #dbe5ef",borderRadius:14,padding:18,background:"white"}}><h3><Link href={localPath(locale,"/services/"+s)}>{service.title}</Link></h3><p style={{lineHeight:1.8}}>{service.description}</p><Link href={localPath(locale,"/services/"+s)}>{ar?"تفاصيل الخدمة ←":"Service details →"}</Link></article>})}</div>
 <footer style={{marginTop:32}}><Link href={localPath(locale,"/catalog")}>{ar?"معرض الأنظمة التفاعلية":"Interactive software catalog"}</Link> · <a href="mailto:info@atsh-ai.com">{ar?"تواصل معنا":"Contact us"}</a></footer>
 </main>;
}
