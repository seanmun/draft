/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disabling ESLint during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;