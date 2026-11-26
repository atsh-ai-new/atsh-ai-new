import HomePage from "../home-client";
import {homeMetadata} from "@/lib/seo";
import {publicPage,publicPages} from "@/lib/public-seo-data";
export const metadata=homeMetadata("en");
export default async function Page(){
 const [config,pages,reference]=await Promise.all([publicPage("home","en"),publicPages("en"),publicPage('home','ar')]);
 const organization={"@context":"https://schema.org","@type":"Organization",name:"ATSH AI",url:"https://atsh-ai.com",logo:"https://atsh-ai.com/images/atsh-logo.jpg"};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization)}}/><HomePage locale="en" initialConfig={config??undefined} initialPages={pages} initialArabicReference={reference?.page?.content}/></>;
}
