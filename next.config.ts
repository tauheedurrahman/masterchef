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
      {
        // That bucket URL 302-redirects to InsForge's CDN with a presigned
        // signature. The optimiser only checks the URL it is handed, so this
        // is belt and braces — but it means a CDN link stored directly (or a
        // redirect the optimiser re-validates) still renders instead of 400ing.
        protocol: "https",
        hostname: "cdn.insforge.dev",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
