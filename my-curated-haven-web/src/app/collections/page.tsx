import { notFound, redirect } from "next/navigation";
import { hasShowroomCollections } from "@/lib/collections/visibility";

/**
 * The real collections page is being designed. Until then /collections sends
 * visitors (and the header, footer and breadcrumb links) to the first
 * showroom at /collections/test, with a temporary redirect.
 */
export default function CollectionsPage() {
  if (!hasShowroomCollections()) notFound();
  redirect("/collections/test");
}
