import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: [],
  allowedDevOrigins: [
    "21.0.16.218:81",
    "21.0.16.218:3000",
    "localhost:3000",
    "localhost:81",
  ],
};

export default nextConfig;
