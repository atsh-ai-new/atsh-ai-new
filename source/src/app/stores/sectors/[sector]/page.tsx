import StoreSectorLanding from "@/components/store-sector-landing";
import {storeSectorMetadata} from "@/lib/store-sector-seo";
type Props={params:Promise<{sector:string}>};
export async function generateMetadata({params}:Props){return storeSectorMetadata("ar",(await params).sector);}
export default async function Page({params}:Props){return <StoreSectorLanding locale="ar" slug={(await params).sector}/>;}
