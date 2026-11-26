import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  // Keep noindex pages crawlable so search engines can read their exclusion.
  return {rules:{userAgent:"*",allow:"/",disallow:["/api/admin/","/api/customer/","/api/orders/","/api/commercial/"]},sitemap:SITE_URL+"/sitemap.xml"};
}
