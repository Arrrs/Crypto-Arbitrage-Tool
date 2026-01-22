import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security: Limit request body size to prevent DoS attacks
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb", // Limit server action body size
    },
  },

  // API route body size is controlled by Next.js default (4MB)
  // For custom limits, use middleware or API route config
};

export default nextConfig;
