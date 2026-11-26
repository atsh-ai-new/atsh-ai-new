import ManagedPage from "../managed-client";
import {managedMetadata,publicPage,publicPages} from "@/lib/public-seo-data";
import {validPublicSlug} from "@/lib/seo";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return managedMetadata((await params).slug,"ar");}
export default async function Page({params}:Props){
 const {slug}=await params;
 const [payload,links]=await Promise.all([validPublicSlug(slug)?publicPage(slug,"ar"):Promise.resolve(null),publicPages("ar")]);
 return <ManagedPage locale="ar" initialPayload={payload?.page?{...payload,page:{slug,content:payload.page.content??{}}}:undefined} initialLinks={links}/>;
}
