import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "models.dev",
      },
    ],
  },
};

export default nextConfig;
