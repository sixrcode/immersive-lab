
const nextConfig = {
  async rewrites() {
    const collaborationServiceUrl = process.env.COLLABORATION_SERVICE_INTERNAL_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/collaboration/:path*',
        // The destination needs to include /api at the end if the collaboration service's routes are all under /api
        // e.g. http://localhost:3001/api/projects, http://localhost:3001/api/documents
        destination: `${collaborationServiceUrl}/api/:path*`, // Proxy to Collaboration Service API
      },
      // Added for Socket.IO proxying
      // This proxies requests from the Next.js dev server's /socket.io/ path
      // to the collaboration service's /socket.io/ path.
      {
        source: '/socket.io/',
        destination: `${collaborationServiceUrl}/socket.io/`, // Proxy Socket.IO to Collaboration Service
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
 allowedDevOrigins: [
 'https://6000-firebase-studio-1747556875666.cluster-aj77uug3sjd4iut4ev6a4jbtf2.cloudworkstations.dev',
 'https://9000-firebase-studio-1747556875666.cluster-aj77uug3sjd4iut4ev6a4jbtf2.cloudworkstations.dev'
 ],
};

module.exports = nextConfig;
