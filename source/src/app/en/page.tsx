import HomePage from "../home-client";
import {draftPreviewRequested,homeMetadata,noIndex} from "@/lib/seo";
import {publicPage,publicPages} from "@/lib/public-seo-data";
export async function generateMetadata({searchParams}:{searchParams:Promise<{atshPreview?:string}>}){if(draftPreviewRequested((await searchParams).atshPreview))return noIndex; return homeMetadata("en",(await publicPage("home","en"))?.page?.content);}
export default async function Page(){
 const [config,pages,reference]=await Promise.all([publicPage("home","en"),publicPages("en"),publicPage('home','ar')]);
 const organization={"@context":"https://schema.org","@type":"Organization",name:"ATSH AI",url:"https://atsh-ai.com",logo:"https://atsh-ai.com/images/atsh-logo.jpg"};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization)}}/><HomePage locale="en" initialConfig={config??undefined} initialPages={pages} initialArabicReference={reference?.page?.content}/></>;
}
