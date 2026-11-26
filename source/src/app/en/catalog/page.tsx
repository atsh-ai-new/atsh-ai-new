import CatalogPage from "../../catalog-client";
import {catalogMetadata} from "@/lib/seo";
import {publicCatalog} from "@/lib/public-seo-data";
export const metadata=catalogMetadata("en");
export default async function Page(){return <CatalogPage locale="en" initialCatalog={await publicCatalog("en")??undefined}/>;}
