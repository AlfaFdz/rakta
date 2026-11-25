/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;