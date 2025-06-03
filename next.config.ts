
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
  // outputFileTracingRoot: __dirname, // Kept commented out as it didn't solve the issue
  // distDir: '.next', // Removing this to rely on default resolution
};

export default nextConfig;
