
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  distDir: '.next', // Explicitly set distDir
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
  output: 'standalone', // Required for optimal Docker image size
};

export default nextConfig;
