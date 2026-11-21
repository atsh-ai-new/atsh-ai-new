import CatalogPricingClient from "./pricing-client";
export default function CatalogPricingPage({params}:{params:Promise<{slug:string}>}){return <CatalogPricingClient params={params}/>;}
