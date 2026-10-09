import Link from "next/link";
import { getAdminContext } from "@/lib/admin/context";
import CollectionCreate from "@/components/admin/collections/CollectionCreate";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const context = await getAdminContext();
  const canEdit = context.ok && context.value.operator.permissions.includes("collection.edit")
    && (context.value.collectionStage === "editing" || context.value.collectionStage === "publication");
  if (!canEdit) {
    return <p role="status">Creating collections needs edit permission and the editing stage. <Link href="/admin/collections">Back to collections</Link></p>;
  }
  return <CollectionCreate />;
}
