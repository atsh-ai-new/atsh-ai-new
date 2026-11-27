import {notFound} from "next/navigation";
import ManagedPage from "../managed-client";
import {managedMetadata,publicPage,publicPages} from "@/lib/public-seo-data";
import {draftPreviewRequested,validPublicSlug} from "@/lib/seo";
type Props={params:Promise<{slug:string}>;searchParams:Promise<{atshPreview?:string}>};
export async function generateMetadata({params,searchParams}:Props){return managedMetadata((await params).slug,"ar",draftPreviewRequested((await searchParams).atshPreview));}
export default async function Page({params,searchParams}:Props){
 const {slug}=await params;
 const [payload,links]=await Promise.all([validPublicSlug(slug)?publicPage(slug,"ar"):Promise.resolve(null),publicPages("ar")]);
 if(!draftPreviewRequested((await searchParams).atshPreview)&&(!validPublicSlug(slug)||payload&&!payload.page))notFound();
 return <ManagedPage locale="ar" initialPayload={payload?.page?{...payload,page:{slug,content:payload.page.content??{}}}:undefined} initialLinks={links}/>;
}
