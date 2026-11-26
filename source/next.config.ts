import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  async redirects() {return [{source:"/ar/services",destination:"/services",permanent:true},{source:"/ar/services/:slug(websites-platforms|ecommerce|custom-systems|ai-solutions)",destination:"/services/:slug",permanent:true}];},
  async headers() { return [{source:"/demos/:path*",headers:[{key:"X-Robots-Tag",value:"noindex, follow"}]}]; },
  turbopack: { root: process.cwd() }
};

export default nextConfig;
