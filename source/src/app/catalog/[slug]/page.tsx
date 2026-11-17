import { notFound } from "next/navigation";
import SectorPreview from "@/components/sector-preview";
import { findSector, sectorTemplates } from "@/lib/sector-catalog";

export function generateStaticParams() { return sectorTemplates.map(item=>({slug:item.slug})); }
export default async function SectorPreviewPage({params}: {params: Promise<{slug:string}>}) {
  const {slug}=await params;
  const template=findSector(slug);
  if(!template) notFound();
  return <SectorPreview template={template}/>;
}
