import CommerceDemoPreview from "@/components/commerce-demo-preview";
import {notFound} from "next/navigation";
import {themes} from "../../../../commerce-engine/src/themes.js";
export const metadata={title:"معاينة تصميم متجر | ATSH AI",robots:{index:false,follow:true}};
export default async function Page({params}:{params:Promise<{theme:string}>}){const {theme}=await params;if(!themes.some(x=>x.id===theme))notFound();return <CommerceDemoPreview themeId={theme} locale="ar"/>}
