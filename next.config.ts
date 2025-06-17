
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/collaboration/:path*',
        // The destination needs to include /api at the end if the collaboration service's routes are all under /api
        // e.g. http://localhost:3001/api/projects, http://localhost:3001/api/documents
        destination: 'http://localhost:3001/api/:path*', // Proxy to Collaboration Service API
      },
    ];
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: ['https://6000-firebase-studio-1747556875666.cluster-aj77uug3sjd4iut4ev6a4jbtf2.cloudworkstations.dev'],
};

export default nextConfig;
