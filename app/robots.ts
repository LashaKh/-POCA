import type { MetadataRoute } from "next";

import { getCanonicalOrigin } from "@/features/catalog/metadata";

export default function robots(): MetadataRoute.Robots {
  const origin = getCanonicalOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*/admin/",
        "/*/auth/",
        "/*/account/",
        "/*/cart",
        "/*/checkout",
        "/api/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
