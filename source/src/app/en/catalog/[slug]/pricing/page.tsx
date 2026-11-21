import CatalogPricingClient from "../../../../catalog/[slug]/pricing/pricing-client";

export default async function EnglishCatalogPricingPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 return <CatalogPricingClient slug={slug}/>;
}
