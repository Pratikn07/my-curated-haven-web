import type { MetadataRoute } from "next";
import { SITE_ORIGIN, indexableRoutes } from "@/config/site-navigation";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-22");

  return indexableRoutes.map((route) => ({
    url: `${SITE_ORIGIN}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
