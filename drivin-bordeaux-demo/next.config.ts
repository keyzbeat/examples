import type { NextConfig } from "next";
import path from "node:path";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Aucune image distante : uniquement des fichiers locaux dans /public.
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    if (!isDemoMode) return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
