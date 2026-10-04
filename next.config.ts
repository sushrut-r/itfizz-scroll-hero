import type { NextConfig } from "next";

/**
 * GitHub Pages project sites are served from /<repo-name>/ , so the build needs a
 * base path. Set PAGES_BASE_PATH before building (see `npm run export:gh`), leave
 * it empty for local dev / Vercel / a user-site (<user>.github.io) deployment.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static HTML export: works on GitHub Pages, Netlify, S3, anywhere.
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Expose the base path to client code so <img src> / preloads stay correct.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
