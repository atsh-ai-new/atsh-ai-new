import CatalogPricingClient from "./pricing-client";
export default async function CatalogPricingPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <CatalogPricingClient slug={slug}/>;}
