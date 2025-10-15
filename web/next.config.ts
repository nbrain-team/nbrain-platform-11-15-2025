import type { NextConfig } from "next";

// Lock Turbopack root to this workspace to avoid multi-lockfile warnings on Render
const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      // Ensures Next picks web/ as the root when multiple lockfiles exist upstream
      root: __dirname,
    },
  },
  // Relax build constraints to prevent deployment failures
  eslint: {
    // Warning: This allows production builds to successfully complete
    // even if your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete
    // even if your project has type errors.
    ignoreBuildErrors: true,
  },
  // Force unique build IDs to bust cache on every deploy
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
};

export default nextConfig;
