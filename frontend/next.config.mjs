/** @type {import('next').NextConfig} */
const isVercelBuild = process.env.VERCEL === "1";

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  ...(isVercelBuild ? {} : { output: "standalone" }),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
