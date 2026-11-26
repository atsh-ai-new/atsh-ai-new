import type { MetadataRoute } from "next";
import { absolute, homePath, localPath, type Locale } from "@/lib/seo";
import { publicCatalog, publicPages } from "@/lib/public-seo-data";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const [catalog,arPages,enPages]=await Promise.all([publicCatalog("ar"),publicPages("ar"),publicPages("en")]);
  const result:MetadataRoute.Sitemap=[];
  function add(path:string,other?:string,locale:Locale="ar",updated?:string){
    const entry:MetadataRoute.Sitemap[number]={url:absolute(path)};
    if(updated&&!Number.isNaN(Date.parse(updated))) entry.lastModified=new Date(updated);
    if(other)entry.alternates={languages:{[locale]:absolute(path),[locale==="ar"?"en":"ar"]:absolute(other),"x-default":absolute(locale==="en"?path:other)}};
    result.push(entry);
  }
  for(const locale of ["ar","en"] as const){
    const other=locale==="ar"?"en":"ar";
    add(homePath(locale),homePath(other),locale);
    add(localPath(locale,"/catalog"),localPath(other,"/catalog"),locale,catalog?.updatedAt);
    for(const item of catalog?.items??[])add(localPath(locale,"/catalog/"+item.slug),localPath(other,"/catalog/"+item.slug),locale,catalog?.updatedAt);
    const pages=locale==="ar"?arPages:enPages;
    const alternates=locale==="ar"?enPages:arPages;
    for(const page of pages)add(localPath(locale,"/"+page.slug),alternates.some(x=>x.slug===page.slug)?localPath(other,"/"+page.slug):undefined,locale,page.updatedAt);
  }
  return result;
}
