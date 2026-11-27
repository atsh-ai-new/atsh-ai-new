import {notFound,redirect} from "next/navigation";
import CatalogPreviewLoader from "@/components/catalog-preview-loader";
import {publicCatalog,systemMetadata} from "@/lib/public-seo-data";
import {absolute,draftPreviewRequested,localPath} from "@/lib/seo";
import Link from "next/link";
type Props={params:Promise<{slug:string}> ;searchParams:Promise<{fullscreen?:string;embedded?:string;featuredHome?:string;atshPreview?:string}> };
export async function generateMetadata({params,searchParams}:Props){const {slug}=await params; const q=await searchParams; if(slug==="commerce-engine")return {}; return systemMetadata(slug,"en",draftPreviewRequested(q.atshPreview)||q.fullscreen==="1"||q.embedded==="1");}
export default async function Page({params,searchParams}:Props){
 const {slug}=await params;
 if(slug==="commerce-engine")redirect("/en/stores");
 const [catalog,query]=await Promise.all([publicCatalog("en"),searchParams]);
 const item=catalog?.items.find(x=>x.slug===slug);
 if(catalog&&!item&&!draftPreviewRequested(query.atshPreview))notFound();
 const breadcrumbs=item?{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"ATSH AI",item:absolute("/en")},{"@type":"ListItem",position:2,name:"Business systems",item:absolute(localPath("en","/catalog"))},{"@type":"ListItem",position:3,name:item.name,item:absolute(localPath("en","/catalog/"+slug))}]}:null;
 return <>{item&&breadcrumbs&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs).replace(/</g,"\\u003c")}}/>}{item&&query.fullscreen!=="1"&&query.embedded!=="1"&&<section style={{maxWidth:1100,margin:"16px auto",padding:"0 16px"}}><nav aria-label="Breadcrumb"><Link href={localPath("en","/catalog")}>Business systems</Link> / {item.name}</nav><h1>{item.name}</h1><p>{item.description}</p>{Array.isArray(item.features)&&<p>{item.features.join(" · ")}</p>}<Link href={localPath("en","/catalog/"+slug+"/pricing")}>Calculate system pricing</Link></section>}
 <CatalogPreviewLoader hasPublicHeading={Boolean(item&&query.fullscreen!=="1"&&query.embedded!=="1")} slug={slug} locale="en" initialItem={query.featuredHome==="1"||query.fullscreen==="1"||query.embedded==="1"?undefined:item}/></>;
}
