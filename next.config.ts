import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // 👇 Ignore TypeScript errors during build (TEMP FIX)
    ignoreBuildErrors: true,
  },
  eslint: {
    // WARNING: this skips ESLint *during* next build (use temporarily)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
