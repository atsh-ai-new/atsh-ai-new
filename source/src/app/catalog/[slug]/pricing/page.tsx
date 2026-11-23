import CatalogPricingClient from "@/app/catalog/[slug]/pricing/pricing-client";
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <CatalogPricingClient slug={slug}/>;}
