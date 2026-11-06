import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trialpulse/types", "@trialpulse/config"],
};

export default nextConfig;
