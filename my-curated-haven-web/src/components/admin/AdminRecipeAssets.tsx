"use client";

import { useEffect, useState } from "react";
import type { Asset, RecipeSnapshot } from "@/lib/admin/contracts";
import { listAssetsAction } from "@/lib/admin/actions";

export default function AdminRecipeAssets({
  value,
  assets,
  onChange,
  onCheck,
  checking,
  checkStatus,
}: {
  value: RecipeSnapshot["image"];
  assets: Asset[];
  onChange: (image: RecipeSnapshot["image"]) => void;
  onCheck: () => void;
  checking: boolean;
  checkStatus: string | null;
}) {
  return (
    <section aria-label="Recipe image">
      <h2>Recipe image</h2>
      <label htmlFor="field-imagePath">Existing image</label>
      <select
        id="field-imagePath"
        value={value.path}
        onChange={(e) => {
          const selected = assets.find((a) => a.path === e.target.value);
          onChange({
            path: e.target.value,
            alt: value.alt,
            description: value.description,
            objectId: selected?.objectId ?? null,
            objectVersion: selected?.objectVersion ?? null,
          });
        }}
      >
        {value.path === "" ? <option value="">No image</option> : null}
        {assets.map((asset) => (
          <option key={asset.path} value={asset.path}>
            {asset.path}
            {asset.available ? "" : " (missing from storage)"}
          </option>
        ))}
      </select>
      <p>Only existing catalog images can be selected. Provenance: requires review.</p>
      <button type="button" onClick={onCheck} disabled={checking}>
        Check availability
      </button>
      {checkStatus ? (
        <p role="status" aria-live="polite">
          {checkStatus}
        </p>
      ) : null}
    </section>
  );
}

export function useAdminAssets(): Asset[] {
  const [assets, setAssets] = useState<Asset[]>([]);
  useEffect(() => {
    let cancelled = false;
    void listAssetsAction().then((result) => {
      if (!cancelled && result.ok) setAssets(result.value as Asset[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return assets;
}
