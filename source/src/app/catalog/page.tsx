import CatalogPage from "../catalog-client";
import {catalogMetadata} from "@/lib/seo";
import {publicGallery} from "@/lib/public-seo-data";
export const metadata=catalogMetadata("ar");
export default async function Page(){return <CatalogPage locale="ar" initialCatalog={await publicGallery("ar")??undefined}/>;}
