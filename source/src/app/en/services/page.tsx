import ServiceLanding from "@/components/service-landing";
import {serviceMetadata} from "@/lib/seo-services";
export const metadata=serviceMetadata("en");
export default function Page(){return <ServiceLanding locale="en"/>;}
