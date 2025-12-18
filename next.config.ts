import type { NextConfig } from "next";

const isProd = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: isProd
      ? "https://menscoach.ai"
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  },
};

export default nextConfig;
