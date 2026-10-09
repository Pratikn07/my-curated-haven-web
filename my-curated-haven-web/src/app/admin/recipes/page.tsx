import AdminLibrary from "@/components/admin/AdminLibrary";
import { loadAdminLibrary } from "@/lib/admin/recipes";
import { parseLibraryQuery, safeAdminReturn } from "@/lib/admin/query";

export default async function AdminRecipesPage({
  searchParams,
}: {
  searchParams: Promise<URLSearchParams | Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const params =
    resolved instanceof URLSearchParams
      ? resolved
      : new URLSearchParams(
          Object.entries(resolved).flatMap(([key, value]) =>
            Array.isArray(value)
              ? value.map((v) => [key, v ?? ""] as [string, string])
              : [[key, value ?? ""]]
          )
        );
  const parsed = parseLibraryQuery(params);
  if (!parsed.ok) {
    return <p role="status">Invalid library query.</p>;
  }
  const result = await loadAdminLibrary(parsed.value);
  if (!result.ok) {
    return <p role="status">Library unavailable ({result.code}). Try again.</p>;
  }
  const listParams = new URLSearchParams(params);
  listParams.delete("returnTo");
  listParams.delete("selected");
  const returnTo = safeAdminReturn(`/admin/recipes${listParams.size ? `?${listParams}` : ""}`);
  return (
    <AdminLibrary result={result.value} returnTo={returnTo} selectedId={params.get("selected")} />
  );
}
