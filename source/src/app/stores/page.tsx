import {StoreSectorLinks} from "@/components/store-sector-landing";
import CommerceLibrary from "@/components/commerce-library";
import {pageMetadata} from "@/lib/seo";
export const metadata=pageMetadata("ar","/stores","تصاميم المتاجر الإلكترونية","جرّب تصاميم المتاجر التفاعلية واختر هوية متجرك.","/en/stores");
export default function Page(){return <><CommerceLibrary locale="ar"/><StoreSectorLinks locale="ar"/></>}
