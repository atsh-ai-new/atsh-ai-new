import {redirect} from "next/navigation";

// Legacy catalog pricing URLs use the existing single configurator.
export default async function CatalogPricingPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 redirect("/?sector="+encodeURIComponent(slug)+"#configurator");
}
