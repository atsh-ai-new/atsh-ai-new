import CatalogPreviewLoader from "@/components/catalog-preview-loader";
import {publicSystem,systemMetadata} from "@/lib/public-seo-data";
import {absolute,localPath} from "@/lib/seo";
import Link from "next/link";
type Props={params:Promise<{slug:string}> ;searchParams:Promise<{fullscreen?:string;embedded?:string;featuredHome?:string}> };
export async function generateMetadata({params}:Props){return systemMetadata((await params).slug,"ar");}
export default async function Page({params,searchParams}:Props){
 const {slug}=await params;
 const [item,query]=await Promise.all([publicSystem(slug,"ar"),searchParams]);
 const breadcrumbs=item?{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"ATSH AI",item:absolute("/ar")},{"@type":"ListItem",position:2,name:"الأنظمة المخصصة",item:absolute(localPath("ar","/catalog"))},{"@type":"ListItem",position:3,name:item.name,item:absolute(localPath("ar","/catalog/"+slug))}]}:null;
 return <>{item&&breadcrumbs&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs).replace(/</g,"\\u003c")}}/>}{item&&query.fullscreen!=="1"&&query.embedded!=="1"&&<section style={{maxWidth:1100,margin:"16px auto",padding:"0 16px"}}><nav aria-label="مسار الصفحة"><Link href={localPath("ar","/catalog")}>الأنظمة المخصصة</Link> / {item.name}</nav><h1>{item.name}</h1><p>{item.description}</p>{Array.isArray(item.features)&&<p>{item.features.join(" · ")}</p>}<Link href={localPath("ar","/catalog/"+slug+"/pricing")}>احسب سعر النظام</Link></section>}
 <CatalogPreviewLoader slug={slug} locale="ar" initialItem={query.featuredHome==="1"||query.fullscreen==="1"||query.embedded==="1"?undefined:item}/></>;
}
