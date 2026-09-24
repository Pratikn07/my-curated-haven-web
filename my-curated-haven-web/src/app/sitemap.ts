import type { MetadataRoute } from "next";
import { SITE_ORIGIN, indexableRoutes } from "@/config/site-navigation";
import { createClient } from "@/lib/supabase/server";
import { getFreeRecipeCatalog } from "@/lib/data/recipes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const defaultDate = new Date("2026-09-22");

  const staticEntries: MetadataRoute.Sitemap = indexableRoutes.map((route) => ({
    url: `${SITE_ORIGIN}${route.path}`,
    lastModified: defaultDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const supabase = await createClient();
    const catalog = await getFreeRecipeCatalog(supabase);

    const recipeEntries: MetadataRoute.Sitemap = catalog.map((recipe) => ({
      url: `${SITE_ORIGIN}/recipes/${recipe.slug}`,
      lastModified: recipe.publishedAt ? new Date(recipe.publishedAt) : defaultDate,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticEntries, ...recipeEntries];
  } catch {
    return staticEntries;
  }
}
