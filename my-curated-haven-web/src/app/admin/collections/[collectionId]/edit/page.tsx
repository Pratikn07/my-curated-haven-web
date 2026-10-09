import Link from "next/link";
import { redirect } from "next/navigation";
import covers from "@/config/collection-covers.json";
import { getAdminContext } from "@/lib/admin/context";
import { safeCollectionReturn } from "@/lib/admin/collections/query";
import { loadCollectionDetail } from "@/lib/admin/collections/repository";
import type { CoverAsset } from "@/lib/admin/collections/contracts";
import CollectionEditor from "@/components/admin/collections/CollectionEditor";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { collectionId } = await params;
  const query = await searchParams;
  const returnTo = safeCollectionReturn(typeof query.returnTo === "string" ? query.returnTo : null);
  if (!UUID.test(collectionId)) redirect("/admin/collections");
  const [context, detail] = await Promise.all([getAdminContext(), loadCollectionDetail(collectionId)]);
  if (!context.ok || !detail.ok) {
    return <p role="status">This collection is unavailable. <Link href={returnTo}>Back to collections</Link></p>;
  }
  const canEdit = context.value.operator.permissions.includes("collection.edit")
    && (context.value.collectionStage === "editing" || context.value.collectionStage === "publication");
  if (!canEdit) {
    return <p role="status">Editing collections needs edit permission and the editing stage. <Link href={`/admin/collections/${collectionId}`}>Back to collection</Link></p>;
  }
  if (!detail.value.working) redirect(`/admin/collections/${collectionId}`);
  return <CollectionEditor key={detail.value.working.id} detail={detail.value} covers={covers as CoverAsset[]} returnTo={returnTo} />;
}
