import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/api/portraits/**",
      },
    ],
  },
  rewrites: () => [
    {
      source: "/api/auth/:path*",
      destination: `${process.env.API_URL}/api/auth/:path*`,
    },
    { source: "/backend/:path*", destination: `${process.env.API_URL}/:path*` },
  ],
};

export default nextConfig;
