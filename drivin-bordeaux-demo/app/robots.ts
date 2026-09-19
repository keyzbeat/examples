import type { MetadataRoute } from "next";
import { isDemoMode } from "@/lib/demo";

export default function robots(): MetadataRoute.Robots {
  if (isDemoMode) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.drivinbordeaux.fr";
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
