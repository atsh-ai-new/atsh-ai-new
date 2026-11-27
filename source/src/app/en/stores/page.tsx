import CommerceLibrary from "@/components/commerce-library";
import {pageMetadata} from "@/lib/seo";
export const metadata=pageMetadata("en","/en/stores","E-commerce design library","Explore interactive store design previews and choose your identity.","/stores");
export default function Page(){return <CommerceLibrary locale="en"/>}
