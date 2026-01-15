import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // @ts-expect-error - turbo is a valid config in Next.js 15+ despite type definition lag
  turbo: {
    root: ".",
  },
};

export default nextConfig;
