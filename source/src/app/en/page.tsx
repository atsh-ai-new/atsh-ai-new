import HomePage from "../home-client";
import {draftPreviewRequested,homeMetadata,noIndex} from "@/lib/seo";
import {publicPage,publicPages,publicVisitorCounts} from "@/lib/public-seo-data";
export async function generateMetadata({searchParams}:{searchParams:Promise<{atshPreview?:string}>}){if(draftPreviewRequested((await searchParams).atshPreview))return noIndex; return homeMetadata("en",(await publicPage("home","en"))?.page?.content);}
export default async function Page({searchParams}:{searchParams:Promise<{atshPreview?:string}>}){
 const isPreview=draftPreviewRequested((await searchParams).atshPreview);
 const [config,pages,reference,visitorCounts]=await Promise.all([publicPage("home","en"),publicPages("en"),publicPage('home','ar'),publicVisitorCounts()]);
 const organization={"@context":"https://schema.org","@type":"Organization",name:"ATSH AI",url:"https://atsh-ai.com",logo:"https://atsh-ai.com/images/atsh-logo.jpg"};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization)}}/><HomePage isPreview={isPreview} visitorCounts={visitorCounts} locale="en" initialConfig={config??undefined} initialPages={pages} initialArabicReference={reference?.page?.content}/></>;
}
