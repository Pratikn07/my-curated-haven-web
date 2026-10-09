import Link from "next/link";
import { getAdminContext } from "@/lib/admin/context";
import { safeCollectionReturn } from "@/lib/admin/collections/query";
import { loadCollectionDetail, loadCollectionReceipts } from "@/lib/admin/collections/repository";
import CollectionWorkspace from "@/components/admin/collections/CollectionWorkspace";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { collectionId } = await params;
  const query = await searchParams;
  const base = safeCollectionReturn(typeof query.returnTo === "string" ? query.returnTo : null);
  const url = new URL(base, "https://admin.local");
  url.searchParams.set("selected", collectionId);
  const returnTo = `${url.pathname}${url.search}`;
  if (!UUID.test(collectionId)) {
    return <p role="status">That collection does not exist. <Link href={base}>Back to collections</Link></p>;
  }
  const [context, detail, receipts] = await Promise.all([getAdminContext(), loadCollectionDetail(collectionId),
    loadCollectionReceipts(collectionId)]);
  if (!context.ok || !detail.ok) {
    const failure = !detail.ok ? detail : !context.ok ? context : null;
    const message = failure?.code === "NOT_FOUND" ? "That collection does not exist."
      : failure?.code === "DENIED" ? "You do not have permission to view collections."
      : failure?.code === "DISABLED" ? "Collections are switched off in this console."
      : `This collection is unavailable${failure ? ` (${failure.code}, reference ${failure.reference})` : ""}. Try again.`;
    return <p role="status">{message} <Link href={base}>Back to collections</Link></p>;
  }
  return <CollectionWorkspace detail={detail.value} context={context.value} receipts={receipts} returnTo={returnTo} />;
}
