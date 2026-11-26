import ServiceLanding from "@/components/service-landing";
import {serviceMetadata} from "@/lib/seo-services";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return serviceMetadata("en",(await params).slug);}
export default async function Page({params}:Props){return <ServiceLanding locale="en" slug={(await params).slug}/>;}
