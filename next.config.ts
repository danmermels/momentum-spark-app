
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // ignoreBuildErrors: true, // Removed
  },
  eslint: {
    // ignoreDuringBuilds: true, // Removed
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
  output: 'standalone',
};

export default nextConfig;
