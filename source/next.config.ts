import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  async headers() { return [{source:"/demos/:path*",headers:[{key:"X-Robots-Tag",value:"noindex, follow"}]}]; },
  turbopack: { root: process.cwd() }
};

export default nextConfig;
