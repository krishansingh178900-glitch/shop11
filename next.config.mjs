/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate renders and double-fetching in dev mode
  swcMinify: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "clsx",
      "tailwind-merge",
      "date-fns",
      "jose",
      "bcryptjs",
    ],
  },
  onDemandEntries: {
    // Keep dev pages in memory longer to prevent cold-reload lag
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 8,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
