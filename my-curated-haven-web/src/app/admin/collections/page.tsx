import Link from "next/link";
import CollectionLibrary from "@/components/admin/collections/CollectionLibrary";
import { redirect } from "next/navigation";
import { parseCollectionQuery, serializeCollectionQuery } from "@/lib/admin/collections/query";
import { loadCollectionLibrary } from "@/lib/admin/collections/repository";
import { getAdminContext } from "@/lib/admin/context";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolved).flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value]).map((v) => [key, v ?? ""] as [string, string])),
  );
  const parsed = parseCollectionQuery(params);
  if (!parsed.ok) {
    return <p role="status">Those collection filters are not recognised. <Link href="/admin/collections">Show all collections</Link>.</p>;
  }
  // Keep shareable URLs canonical: the GET form also submits empty fields.
  const canonical = serializeCollectionQuery(parsed.value);
  const selected = params.get("selected");
  if (selected && /^[0-9a-f-]{36}$/i.test(selected)) canonical.set("selected", selected);
  if (canonical.toString() !== params.toString()) {
    redirect(`/admin/collections${canonical.size ? `?${canonical}` : ""}`);
  }
  const [result, context] = await Promise.all([loadCollectionLibrary(parsed.value), getAdminContext()]);
  const canCreate = context.ok && context.value.operator.permissions.includes("collection.edit")
    && (context.value.collectionStage === "editing" || context.value.collectionStage === "publication");
  if (!result.ok) {
    return <p role="status">Collections are unavailable ({result.code}, reference {result.reference}). This is not an empty list. Try again.</p>;
  }
  return <CollectionLibrary library={result.value} query={parsed.value} selectedId={params.get("selected")} canCreate={canCreate} />;
}
