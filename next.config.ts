import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.BLOB_HOSTNAME || 'x0pnsfqmudlabnll.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  // Ensure Prisma is bundled correctly for serverless
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/**/*'],
    '/editor': ['./node_modules/.prisma/**/*'],
    '/login': ['./node_modules/.prisma/**/*'],
  },
};

export default nextConfig;
