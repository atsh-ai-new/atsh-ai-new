import HomePage from "../home-client";
import {draftPreviewRequested,homeMetadata,noIndex} from "@/lib/seo";
import {publicPage,publicPages,publicMonthlyVisitorCount} from "@/lib/public-seo-data";
export async function generateMetadata({searchParams}:{searchParams:Promise<{atshPreview?:string}>}){if(draftPreviewRequested((await searchParams).atshPreview))return noIndex; return homeMetadata("ar",(await publicPage("home","ar"))?.page?.content);}
export default async function Page(){
 const [config,pages,monthlyVisitors]=await Promise.all([publicPage("home","ar"),publicPages("ar"),publicMonthlyVisitorCount()]);
 const organization={"@context":"https://schema.org","@type":"Organization",name:"ATSH AI",url:"https://atsh-ai.com",logo:"https://atsh-ai.com/images/atsh-logo.jpg"};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization)}}/><HomePage monthlyVisitors={monthlyVisitors} locale="ar" initialConfig={config??undefined} initialPages={pages}/></>;
}
