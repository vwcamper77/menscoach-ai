import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // Force Turbopack to treat the repo root as the workspace root (avoids stray lockfile issues)
    turbopack: {
      root: __dirname,
    },
  },
  webpack: (config) => {
    // Ensure the @ alias always resolves to the repo root
    config.resolve.alias["@"] = path.resolve(__dirname, ".");
    return config;
  },
};

export default nextConfig;
