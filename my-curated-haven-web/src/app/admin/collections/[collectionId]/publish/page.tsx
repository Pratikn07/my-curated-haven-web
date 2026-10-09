import Link from "next/link";
import { redirect } from "next/navigation";
import { safeCollectionReturn } from "@/lib/admin/collections/query";
import { loadCollectionDetail, loadCollectionReceipts, loadUndecidedAccess } from "@/lib/admin/collections/repository";
import { getAdminContext } from "@/lib/admin/context";
import CollectionPublication from "@/components/admin/collections/CollectionPublication";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CollectionPublishPage({
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
  const [detail, context, undecided, receipts] = await Promise.all([loadCollectionDetail(collectionId), getAdminContext(),
    loadUndecidedAccess(collectionId), loadCollectionReceipts(collectionId)]);
  if (!detail.ok || !context.ok) {
    const failure = !detail.ok ? detail : !context.ok ? context : null;
    return <p role="status">This collection is unavailable{failure ? ` (${failure.code}, reference ${failure.reference})` : ""}.{" "}
      <Link href={returnTo}>Back to collections</Link></p>;
  }
  const publication = context.value.collectionStage === "publication";
  const can = (permission: "collection.publish" | "collection.review") =>
    publication && context.value.operator.permissions.includes(permission);
  return <CollectionPublication detail={detail.value} undecided={undecided} receipts={receipts}
    operatorEmail={context.value.operator.email} canPublish={can("collection.publish")}
    canApprove={can("collection.review")} returnTo={returnTo} />;
}
