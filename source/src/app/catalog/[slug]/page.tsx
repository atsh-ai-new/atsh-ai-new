import CatalogPreviewLoader from "@/components/catalog-preview-loader";
export default async function SectorPreviewPage({params}: {params: Promise<{slug:string}>}) {
 const {slug}=await params;
 return <CatalogPreviewLoader slug={slug}/>;
}
