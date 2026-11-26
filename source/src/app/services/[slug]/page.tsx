import ServiceLanding from "@/components/service-landing";
import {serviceMetadata} from "@/lib/seo-services";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return serviceMetadata("ar",(await params).slug);}
export default async function Page({params}:Props){return <ServiceLanding locale="ar" slug={(await params).slug}/>;}
