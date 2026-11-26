import CatalogPage from "../catalog-client";
import {catalogMetadata} from "@/lib/seo";
import {publicCatalog} from "@/lib/public-seo-data";
export const metadata=catalogMetadata("ar");
export default async function Page(){return <CatalogPage locale="ar" initialCatalog={await publicCatalog("ar")??undefined}/>;}
