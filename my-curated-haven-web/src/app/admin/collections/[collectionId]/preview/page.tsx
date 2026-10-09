import Link from "next/link";
import { redirect } from "next/navigation";
import { safeCollectionReturn } from "@/lib/admin/collections/query";
import { loadCollectionDetail } from "@/lib/admin/collections/repository";
import CollectionPreview from "@/components/admin/collections/CollectionPreview";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CollectionPreviewPage({
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
  const detail = await loadCollectionDetail(collectionId);
  if (!detail.ok) {
    return <p role="status">This collection is unavailable ({detail.code}, reference {detail.reference}). <Link href={returnTo}>Back to collections</Link></p>;
  }
  if (!detail.value.working) redirect(`/admin/collections/${collectionId}`);
  return <CollectionPreview detail={detail.value} working={detail.value.working} returnTo={returnTo} />;
}
