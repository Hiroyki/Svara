import type { NextConfig } from "next";

/**
 * SVARA_TARGET picks the build:
 *   web (default) — normal Next.js server
 *   desktop       — standalone server that Electron bundles and starts locally
 *   android       — static export for Capacitor; /api route files (route.ts) are
 *                   left out and the app fetches YouTube Music itself (lib/localApi.ts)
 */
const target = process.env.SVARA_TARGET ?? "web";

const nextConfig: NextConfig = {
  serverExternalPackages: ["youtubei.js"],
  devIndicators: false,
  env: { NEXT_PUBLIC_SVARA_TARGET: target },
  ...(target === "desktop" && { output: "standalone" as const }),
  ...(target === "android" && {
    output: "export" as const,
    trailingSlash: true,
    // only .tsx counts as a route file, so app/api/**/route.ts is excluded from the export
    pageExtensions: ["tsx"],
  }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
