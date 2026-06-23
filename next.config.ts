/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow SVG team logos to be served through next/image
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Allow logos from any HTTPS host (team logos are hotlinked from CDNs)
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
