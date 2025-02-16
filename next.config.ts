import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ["localhost", "localhost:3000", "picsum.photos"],
  },
};

export default nextConfig;
