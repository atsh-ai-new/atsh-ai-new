import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  async redirects() {return [{source:"/ar/services",destination:"/services",permanent:true},{source:"/ar/services/:slug(websites-platforms|ecommerce|custom-systems|ai-solutions|mobile-apps|hosting-domains|website-packages)",destination:"/services/:slug",permanent:true}];},
  async headers() { return ["/demos/:path*","/api/:scope(admin|customer|orders|commercial|internal|integrations)/:path*"].map(source=>({source,headers:[{key:"X-Robots-Tag",value:"noindex, follow"}]})); },
  turbopack: { root: process.cwd() }
};

export default nextConfig;
