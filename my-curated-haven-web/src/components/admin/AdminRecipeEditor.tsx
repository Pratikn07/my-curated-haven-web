"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Base, RecipeSnapshot, Revision } from "@/lib/admin/contracts";
import { diffSnapshots } from "@/lib/admin/snapshot";
import {
  rebaseDraftAction,
  refreshDraftAction,
  saveDraftAction,
  verifyAssetAction,
} from "@/lib/admin/actions";
import AdminRecipeCompare from "./AdminRecipeCompare";
import AdminRecipeAssets, { useAdminAssets } from "./AdminRecipeAssets";

type Ingredient = { item: string; amount?: string; unit?: string; [key: string]: unknown };
type Step = { step: number; text: string; [key: string]: unknown };

function asIngredients(value: unknown): Ingredient[] {
  return Array.isArray(value) ? (value as Ingredient[]) : [];
}

function asSteps(value: unknown): Step[] {
  return Array.isArray(value) ? (value as Step[]) : [];
}

function renumber(steps: Step[]): Step[] {
  return steps.map((s, i) => ({ ...s, step: i + 1 }));
}

function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}


function withBody(prev: RecipeSnapshot, patch: Record<string, unknown>): RecipeSnapshot {
  if (!prev.body) return prev;
  return { ...prev, body: { ...prev.body, ...patch } as RecipeSnapshot["body"] };
}

function asJson(value: unknown): import("@/lib/types/database").Json {
  return value as import("@/lib/types/database").Json;
}

export default function AdminRecipeEditor({
  initial,
  active,
  base,
  returnTo,
}: {
  initial: Revision;
  active: RecipeSnapshot;
  base: Base;
  returnTo: string;
}) {
  const [candidate, setCandidate] = useState<RecipeSnapshot>(() =>
    JSON.parse(JSON.stringify(initial.snapshot))
  );
  const [revision, setRevision] = useState<Revision>(initial);
  const assets = useAdminAssets();
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [expectedVersion, setExpectedVersion] = useState(initial.version);
  const [expectedDigest, setExpectedDigest] = useState(initial.digest);
  const [currentBase, setCurrentBase] = useState(base);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [reason, setReason] = useState("");
  const [reopen, setReopen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [needsRebase, setNeedsRebase] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(candidate) !== JSON.stringify(initial.snapshot),
    [candidate, initial]
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const needsReopen =
    (initial.state === "submitted" || initial.state === "approved") && dirty;

  function updateCatalog(patch: Partial<RecipeSnapshot["catalog"]>) {
    setCandidate((prev) => ({ ...prev, catalog: { ...prev.catalog, ...patch } }));
  }

  function updateIngredient(index: number, item: string) {
    setCandidate((prev) => {
      if (!prev.body || !Array.isArray(prev.body.ingredients)) return prev;
      const ingredients = (prev.body.ingredients as Ingredient[]).map((row, i) =>
        i === index && row && typeof row === "object" && !Array.isArray(row) ? { ...row, item } : row
      );
      return withBody(prev, { ingredients: asJson(ingredients) });
    });
  }

  async function save() {
    setPending(true);
    setStatus(null);
    const result = await saveDraftAction({
      operationId,
      recipeId: initial.recipeId,
      reason: reason.trim(),
      expectedVersion,
      expectedDigest,
      base: currentBase,
      snapshot: candidate,
      reopenReviewed: reopen,
    });
    setPending(false);
    if (result.ok) {
      const receipt = result.value as {
        revisionId: string | null;
        version: number;
        digest: string;
        noChange: boolean;
        committedAt: string;
      };
      setExpectedVersion(receipt.version);
      setExpectedDigest(receipt.digest);
      if (receipt.revisionId) {
        setRevision((prev) => ({
          ...prev,
          id: receipt.revisionId as string,
          version: receipt.version,
          digest: receipt.digest,
          snapshot: JSON.parse(JSON.stringify(candidate)),
        }));
      }
      setOperationId(crypto.randomUUID());
      setNeedsRebase(false);
      setStatus(
        receipt.noChange ? "No changes to save." : `Saved at ${receipt.committedAt}.`
      );
    } else if (result.code === "CONFLICT") {
      setNeedsRebase(true);
      setStatus("Another change landed first. Review the current revision, then rebase.");
    } else {
      setStatus(`Save failed (${result.code}). Retry with the same attempt.`);
    }
  }

  async function rebase() {
    setPending(true);
    const fresh = await refreshDraftAction(initial.recipeId);
    if (!fresh.ok) {
      setPending(false);
      setStatus("Could not reload the current revision. Try again.");
      return;
    }
    const working = fresh.value.working;
    if (!working) {
      setPending(false);
      setStatus("No working revision found. Reload the page.");
      return;
    }
    const newOp = crypto.randomUUID();
    const result = await rebaseDraftAction({
      operationId: newOp,
      recipeId: initial.recipeId,
      reason: reason.trim() || "Rebase onto current content",
      expectedVersion: working.version,
      expectedDigest: working.digest,
      base: working.base,
      newBase: {
        contentVersion: fresh.value.contentVersion,
        activeHash: fresh.value.activeHash,
      },
      snapshot: candidate,
      reopenReviewed: false,
    });
    setPending(false);
    if (result.ok) {
      const receipt = result.value as {
        revisionId: string | null;
        version: number;
        digest: string;
        committedAt: string;
      };
      setExpectedVersion(receipt.version);
      setExpectedDigest(receipt.digest);
      if (receipt.revisionId) {
        setRevision((prev) => ({
          ...prev,
          id: receipt.revisionId as string,
          version: receipt.version,
          digest: receipt.digest,
          snapshot: JSON.parse(JSON.stringify(candidate)),
        }));
      }
      setCurrentBase({
        contentVersion: fresh.value.contentVersion,
        activeHash: fresh.value.activeHash,
      });
      setOperationId(crypto.randomUUID());
      setNeedsRebase(false);
      setStatus(`Rebased and saved at ${receipt.committedAt}.`);
    } else {
      setOperationId(newOp);
      setStatus(`Rebase failed (${result.code}). Adjust and retry.`);
    }
  }

  async function checkAvailability() {
    if (JSON.stringify(candidate) !== JSON.stringify(revision.snapshot)) {
      setCheckStatus("Save your changes first, then check availability.");
      return;
    }
    setChecking(true);
    const result = await verifyAssetAction(revision);
    setChecking(false);
    if (result.ok) {
      setCandidate((prev) => ({
        ...prev,
        image: { ...prev.image, objectId: result.value.objectId },
      }));
      setCheckStatus(
        result.value.available
          ? `Available, checked at ${result.value.checkedAt}.`
          : "Object unavailable in storage."
      );
    } else {
      setCheckStatus(`Availability check failed (${result.code}).`);
    }
  }

  const ingredients = asIngredients(candidate.body?.ingredients);
  const steps = asSteps(candidate.body?.instructions);
  const unknownNotes: string[] = [];
  if (candidate.body && typeof candidate.body.yieldStructured !== "undefined" && candidate.body.yieldStructured !== null) {
    unknownNotes.push("Structured yield data is preserved as-is.");
  }
  ingredients.forEach((row, i) => {
    const extra = Object.keys(row).filter((k) => !["item", "amount", "unit"].includes(k));
    if (extra.length > 0) unknownNotes.push(`Ingredient ${i + 1} keeps unsupported ${extra.join(", ")}.`);
  });

  const issues: { field: string; message: string }[] = [];
  if (candidate.catalog.title.trim().length === 0) {
    issues.push({ field: "title", message: "Title is required." });
  }
  if (candidate.catalog.totalMinutes !== null && !(Number.isInteger(candidate.catalog.totalMinutes) && candidate.catalog.totalMinutes > 0)) {
    issues.push({ field: "totalMinutes", message: "Total minutes must be a positive whole number or empty." });
  }
  if (reason.trim().length === 0) {
    issues.push({ field: "reason", message: "A reason is required to save." });
  }

  return (
    <div>
      <Link href={returnTo}>Back to recipes</Link>
      <h1>Edit draft: {active.catalog.title}</h1>
      <p>
        Recipe {initial.recipeId} · working version {expectedVersion} · base {currentBase.activeHash.slice(0, 12)}
      </p>
      {issues.length > 0 ? (
        <div role="alert" aria-label="Validation issues">
          <ul>
            {issues.map((issue) => (
              <li key={issue.field}>
                <a href={`#field-${issue.field}`}>{issue.message}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {unknownNotes.map((note) => (
        <p key={note}>{note}</p>
      ))}

      <label htmlFor="field-title">Title</label>
      <input
        id="field-title"
        value={candidate.catalog.title}
        onChange={(e) => updateCatalog({ title: e.target.value })}
      />

      <label htmlFor="field-summary">Public summary</label>
      <input
        id="field-summary"
        value={candidate.catalog.publicSummary}
        onChange={(e) => updateCatalog({ publicSummary: e.target.value })}
      />

      <label htmlFor="field-totalMinutes">Total minutes</label>
      <input
        id="field-totalMinutes"
        inputMode="numeric"
        value={candidate.catalog.totalMinutes ?? ""}
        onChange={(e) =>
          updateCatalog({
            totalMinutes: e.target.value === "" ? null : Number(e.target.value),
          })
        }
      />

      <label htmlFor="field-mealLabels">Meal labels (comma-separated)</label>
      <input
        id="field-mealLabels"
        value={candidate.catalog.mealLabels.join(", ")}
        onChange={(e) =>
          updateCatalog({
            mealLabels: e.target.value.split(",").map((s) => s.trim()).filter((s) => s.length > 0),
          })
        }
      />

      <label htmlFor="field-dietLabels">Diet labels (comma-separated)</label>
      <input
        id="field-dietLabels"
        value={candidate.catalog.dietLabels.join(", ")}
        onChange={(e) =>
          updateCatalog({
            dietLabels: e.target.value.split(",").map((s) => s.trim()).filter((s) => s.length > 0),
          })
        }
      />

      {candidate.body ? (
        <>
          <label htmlFor="field-yield">Yield</label>
          <input
            id="field-yield"
            value={typeof candidate.body.yield === "string" ? candidate.body.yield : ""}
            onChange={(e) => setCandidate((prev) => withBody(prev, { yield: e.target.value }))}
          />

          <label htmlFor="field-allergenReviewState">Allergen review state</label>
          <select
            id="field-allergenReviewState"
            value={candidate.body.allergenReviewState}
            onChange={(e) => setCandidate((prev) => withBody(prev, { allergenReviewState: e.target.value }))}
          >
            <option value="unknown">Unknown</option>
            <option value="reviewed_listed">Reviewed with listed allergens</option>
            <option value="reviewed_no_allergens">Reviewed with no allergens</option>
          </select>

          <label htmlFor="field-allergens">Allergens (comma-separated)</label>
          <input
            id="field-allergens"
            value={(candidate.body.allergens ?? []).join(", ")}
            onChange={(e) =>
              setCandidate((prev) =>
                withBody(prev, {
                  allergens: asJson(
                    e.target.value.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
                  ),
                })
              )
            }
          />

          <label htmlFor="field-reviewedNotes">Reviewed notes</label>
          <input
            id="field-reviewedNotes"
            value={candidate.body.reviewedNotes ?? ""}
            onChange={(e) => setCandidate((prev) => withBody(prev, { reviewedNotes: e.target.value || null }))}
          />

          <label htmlFor="field-storageNotes">Storage notes</label>
          <input
            id="field-storageNotes"
            value={candidate.body.storageNotes ?? ""}
            onChange={(e) => setCandidate((prev) => withBody(prev, { storageNotes: e.target.value || null }))}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() =>
            setCandidate((prev) => ({
              ...prev,
              body: {
                ingredients: asJson([]),
                instructions: asJson([]),
                yield: "",
                yieldStructured: null,
                reviewedNotes: null,
                allergenReviewState: "unknown",
                allergens: null,
                storageNotes: null,
              },
            }))
          }
        >
          Add body
        </button>
      )}

      <h2>Ingredients</h2>
      <ul>
        {ingredients.map((row, i) => (
          <li key={i}>
            <label>
              Ingredient {i + 1}
              <input value={row.item ?? ""} onChange={(e) => updateIngredient(i, e.target.value)} />
            </label>
            <button
              type="button"
              aria-label={`Move ingredient ${i + 1} up`}
              onClick={() =>
                setCandidate((prev) => withBody(prev, { ingredients: asJson(move(asIngredients(prev.body?.ingredients), i, -1)) }))
              }
            >
              Up
            </button>
            <button
              type="button"
              aria-label={`Move ingredient ${i + 1} down`}
              onClick={() =>
                setCandidate((prev) => withBody(prev, { ingredients: asJson(move(asIngredients(prev.body?.ingredients), i, 1)) }))
              }
            >
              Down
            </button>
            <button
              type="button"
              aria-label={`Remove ingredient ${i + 1}`}
              onClick={() =>
                setCandidate((prev) =>
                  withBody(prev, { ingredients: asJson(asIngredients(prev.body?.ingredients).filter((_, j) => j !== i)) })
                )
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          setCandidate((prev) =>
            withBody(prev, { ingredients: asJson([...asIngredients(prev.body?.ingredients), { item: "" }]) })
          )
        }
      >
        Add ingredient
      </button>

      <h2>Steps</h2>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>
            <label>
              Step {s.step}
              <input
                value={s.text ?? ""}
                onChange={(e) =>
                  setCandidate((prev) =>
                    withBody(prev, {
                      instructions: asJson(
                        asSteps(prev.body?.instructions).map((r, j) => (j === i ? { ...r, text: e.target.value } : r))
                      ),
                    })
                  )
                }
              />
            </label>
            <button
              type="button"
              aria-label={`Move step ${s.step} up`}
              onClick={() =>
                setCandidate((prev) =>
                  withBody(prev, { instructions: asJson(renumber(move(asSteps(prev.body?.instructions), i, -1))) })
                )
              }
            >
              Up
            </button>
            <button
              type="button"
              aria-label={`Move step ${s.step} down`}
              onClick={() =>
                setCandidate((prev) =>
                  withBody(prev, { instructions: asJson(renumber(move(asSteps(prev.body?.instructions), i, 1))) })
                )
              }
            >
              Down
            </button>
          </li>
        ))}
      </ol>

      <AdminRecipeAssets
        value={candidate.image}
        assets={assets}
        onChange={(image) => setCandidate((prev) => ({ ...prev, image }))}
        onCheck={checkAvailability}
        checking={checking}
        checkStatus={checkStatus}
      />

      <label htmlFor="field-imageAlt">Image alt text</label>
      <input
        id="field-imageAlt"
        value={candidate.image.alt ?? ""}
        onChange={(e) =>
          setCandidate((prev) => ({ ...prev, image: { ...prev.image, alt: e.target.value || null } }))
        }
      />

      <label htmlFor="field-imageDescription">Image description</label>
      <input
        id="field-imageDescription"
        value={candidate.image.description ?? ""}
        onChange={(e) =>
          setCandidate((prev) => ({
            ...prev,
            image: { ...prev.image, description: e.target.value || null },
          }))
        }
      />

      {needsReopen ? (
        <label htmlFor="field-reopen">
          <input
            id="field-reopen"
            type="checkbox"
            checked={reopen}
            onChange={(e) => setReopen(e.target.checked)}
          />
          Reopen reviewed content for a new review cycle
        </label>
      ) : null}

      <label htmlFor="field-reason">Reason</label>
      <input id="field-reason" value={reason} onChange={(e) => setReason(e.target.value)} />

      <button type="button" onClick={save} disabled={pending || issues.length > 0}>
        Save draft
      </button>
      {needsRebase ? (
        <button type="button" onClick={rebase} disabled={pending}>
          Rebase onto current and save
        </button>
      ) : null}
      <button type="button" onClick={() => setShowCompare((v) => !v)}>
        {showCompare ? "Hide comparison" : "Compare changes"}
      </button>
      {status ? (
        <p role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
      {showCompare ? (
        <AdminRecipeCompare
          active={active}
          stored={initial.snapshot}
          candidate={candidate}
          onApply={(snapshot) => {
            setCandidate(snapshot);
            setShowCompare(false);
          }}
        />
      ) : null}
      {diffSnapshots(initial.snapshot, candidate).length === 0 ? (
        <p>No unsaved changes.</p>
      ) : null}
    </div>
  );
}
