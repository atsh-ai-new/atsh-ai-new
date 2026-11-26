import HomePage from "./home-client";
import {homeMetadata} from "@/lib/seo";
import {publicPage,publicPages} from "@/lib/public-seo-data";
export const metadata=homeMetadata("ar");
export default async function Page(){
 const [config,pages]=await Promise.all([publicPage("home","ar"),publicPages("ar")]);
 const organization={"@context":"https://schema.org","@type":"Organization",name:"ATSH AI",url:"https://atsh-ai.com",logo:"https://atsh-ai.com/images/atsh-logo.jpg"};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization)}}/><HomePage locale="ar" initialConfig={config??undefined} initialPages={pages}/></>;
}
