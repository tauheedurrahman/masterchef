import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Menu photos now live in the InsForge `menu-images` bucket.
        protocol: "https",
        hostname: "g6b5x689.ap-southeast.insforge.app",
        pathname: "/api/storage/**",
      },
    ],
  },
};

export default nextConfig;
