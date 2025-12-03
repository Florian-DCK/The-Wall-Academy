import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // Add the hostname(s) of the external service(s) here
    // Example: domains: ['example.com', 'storage.googleapis.com'],
    // This is **not** for local C:/ paths, but for real domains.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com", // Replace with your actual image domain
        port: "",
        pathname: "/**",
      },
    ],
    localPatterns: [
      {
        pathname: "/api/images",
      },
      {
        // Allow images placed directly in the public/ root (e.g., /brandLogo.png)
        pathname: "/**",
      },
    ],
  },
  experimental: {
    viewTransition: true,
    workerThreads: false,
    cpus: 1,
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
